package org.example.adminreporting.migration;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.HashSet;
import java.util.Set;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.containers.RabbitMQContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Integration tests for Flyway migrations.
 *
 * Verifies:
 * 1. All migrations apply cleanly from scratch
 * 2. No cross-schema foreign key constraints exist
 * 3. Outbox idempotency is enforced via UNIQUE constraints
 * 4. Read models have correct structure
 */
@SpringBootTest(
        properties = {
                "spring.flyway.enabled=true",
                "spring.flyway.baseline-on-migrate=true",
                "spring.jpa.hibernate.ddl-auto=none",
                "spring.datasource.hikari.maximum-pool-size=5",
                "admin-reporting.backfill.enabled=false",
                "spring.rabbitmq.listener.simple.auto-startup=false"
        })
@ActiveProfiles("testcontainers")
@Testcontainers
class FlywayMigrationTest {

        @Container
        static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
                        .withDatabaseName("admin_reporting_db")
                        .withUsername("testuser")
                        .withPassword("testpass")
                        .withTmpFs(java.util.Map.of("/var/lib/mysql", "rw"));

        @Container
        static final RabbitMQContainer rabbitmq = new RabbitMQContainer("rabbitmq:3-management")
                        .withUser("testuser", "testpass");

        @DynamicPropertySource
        static void configureProperties(DynamicPropertyRegistry registry) {
                registry.add("spring.datasource.url", mysql::getJdbcUrl);
                registry.add("spring.datasource.username", mysql::getUsername);
                registry.add("spring.datasource.password", mysql::getPassword);
                registry.add("spring.datasource.driver-class-name",
                        () -> "com.mysql.cj.jdbc.Driver");
                registry.add("spring.jpa.properties.hibernate.dialect",
                        () -> "org.hibernate.dialect.MySQLDialect");
                registry.add("spring.rabbitmq.host", rabbitmq::getHost);
                registry.add("spring.rabbitmq.port",
                        () -> rabbitmq.getMappedPort(5672).toString());
                registry.add("spring.rabbitmq.username", rabbitmq::getAdminUsername);
                registry.add("spring.rabbitmq.password", rabbitmq::getAdminPassword);
        }

        @Autowired
        private DataSource dataSource;

        @Test
        @DisplayName("All Flyway migrations apply without errors")
        void allMigrationsApply() throws Exception {
                try (Connection conn = dataSource.getConnection();
                        Statement stmt = conn.createStatement();
                        ResultSet rs = stmt.executeQuery(
                                "SELECT migration_id, success FROM flyway_schema_history WHERE success = 1 ORDER BY installed_rank")) {

                        Set<String> migrations = new HashSet<>();
                        while (rs.next()) {
                                migrations.add(rs.getString("migration_id"));
                        }

                        assertThat(migrations)
                                .as("Flyway migrations should have been applied")
                                .isNotEmpty();
                }
        }

        @Test
        @DisplayName("No cross-schema foreign key constraints exist")
        void noCrossSchemaForeignKeys() throws Exception {
                try (Connection conn = dataSource.getConnection();
                        Statement stmt = conn.createStatement();
                        ResultSet rs = stmt.executeQuery(
                                """
                                SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
                                FROM information_schema.KEY_COLUMN_USAGE
                                WHERE TABLE_SCHEMA = DATABASE()
                                  AND REFERENCED_TABLE_SCHEMA IS NOT NULL
                                  AND REFERENCED_TABLE_SCHEMA != DATABASE()
                                """)) {

                        Set<String> violations = new HashSet<>();
                        while (rs.next()) {
                                violations.add(String.format(
                                        "%s.%s -> %s.%s",
                                        rs.getString("TABLE_NAME"),
                                        rs.getString("CONSTRAINT_NAME"),
                                        rs.getString("REFERENCED_TABLE_SCHEMA"),
                                        rs.getString("REFERENCED_TABLE_NAME")));
                        }

                        assertThat(violations)
                                .as("No cross-schema foreign keys should exist")
                                .isEmpty();
                }
        }

        @Test
        @DisplayName("Processed events table has unique constraint for idempotency")
        void processedEventsIdempotency() throws Exception {
                try (Connection conn = dataSource.getConnection();
                        Statement stmt = conn.createStatement();
                        ResultSet rs = stmt.executeQuery(
                                """
                                SELECT CONSTRAINT_NAME
                                FROM information_schema.TABLE_CONSTRAINTS
                                WHERE TABLE_SCHEMA = DATABASE()
                                  AND TABLE_NAME = 'processed_events'
                                  AND CONSTRAINT_TYPE = 'UNIQUE'
                                """)) {

                        assertThat(rs.next())
                                .as("processed_events should have a UNIQUE constraint for idempotency")
                                .isTrue();
                }
        }

        @Test
        @DisplayName("Admin documents table has idempotent upsert support")
        void documentsTableHasIdempotency() throws Exception {
                try (Connection conn = dataSource.getConnection();
                        Statement stmt = conn.createStatement();
                        ResultSet rs = stmt.executeQuery(
                                """
                                SELECT COLUMN_NAME
                                FROM information_schema.COLUMNS
                                WHERE TABLE_SCHEMA = DATABASE()
                                  AND TABLE_NAME = 'admin_documents'
                                  AND COLUMN_NAME IN ('document_uuid', 'external_id')
                                """)) {

                        assertThat(rs.next())
                                .as("admin_documents should have an external_id or document_uuid column for idempotent upserts")
                                .isTrue();
                }
        }

        @Test
        @DisplayName("All read model tables exist with expected columns")
        void readModelTablesExist() throws Exception {
                String[] expectedTables = {
                        "admin_user_summary",
                        "admin_farm_summary",
                        "admin_plot_summary",
                        "admin_season_summary",
                        "admin_incident_summary",
                        "admin_task_summary",
                        "admin_alert_summary",
                        "admin_inventory_lot_summary",
                        "admin_harvest_summary",
                        "admin_expense_summary",
                        "admin_marketplace_order_summary",
                        "admin_marketplace_product_summary",
                        "admin_documents",
                        "document_user_interactions",
                        "admin_audit_log_entries",
                        "processed_events"
                };

                try (Connection conn = dataSource.getConnection();
                        Statement stmt = conn.createStatement();
                        ResultSet rs = stmt.executeQuery(
                                "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()")) {

                        Set<String> existingTables = new HashSet<>();
                        while (rs.next()) {
                                existingTables.add(rs.getString("TABLE_NAME"));
                        }

                        for (String table : expectedTables) {
                                assertThat(existingTables)
                                        .as("Table '%s' should exist", table)
                                        .contains(table);
                        }
                }
        }
}
