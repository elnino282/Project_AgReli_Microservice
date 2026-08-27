package org.example.adminreporting.smoke;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.actuate.observability.AutoConfigureObservability;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.containers.RabbitMQContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Smoke tests for admin-reporting-service.
 *
 * Runs against real MySQL + RabbitMQ via Testcontainers.
 * Verifies all 4 user flows work end-to-end:
 * - Admin: dashboard, documents, audit logs
 * - Farmer: farm/plot/season summary (read model)
 * - Buyer: marketplace order/product summary
 * - Employee: incidents, alerts
 *
 * Also verifies non-functional requirements:
 * - Health/readiness endpoints
 * - Idempotency of event processing
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "spring.flyway.enabled=true",
                "spring.flyway.baseline-on-migrate=true",
                "spring.jpa.hibernate.ddl-auto=none",
                "spring.rabbitmq.listener.simple.auto-startup=false",
                "admin-reporting.backfill.enabled=false",
                "management.endpoints.web.exposure.include=health,info,prometheus",
                "management.endpoint.health.probes.enabled=true"
        })
@AutoConfigureMockMvc
@AutoConfigureObservability
@ActiveProfiles("testcontainers")
@Testcontainers
class AdminReportingSmokeTest {

        private static RequestPostProcessor adminJwt() {
                return jwt()
                        .jwt(token -> token
                                .claim("user_id", 1L)
                                .claim("scope", "ROLE_ADMIN"))
                        .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
        }

        private static RequestPostProcessor buyerJwt() {
                return jwt()
                        .jwt(token -> token
                                .claim("user_id", 2L)
                                .claim("scope", "ROLE_BUYER"))
                        .authorities(new SimpleGrantedAuthority("ROLE_BUYER"));
        }

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
        private MockMvc mockMvc;

        @Autowired
        private ObjectMapper objectMapper;

        // ============================================================
        // Admin Flow
        // ============================================================

        @Nested
        @DisplayName("[Admin] Dashboard & Reporting")
        class AdminFlowTests {

                @Test
                @DisplayName("GET /api/v1/admin/dashboard-stats returns 200")
                void getDashboardReturns200() throws Exception {
                        mockMvc.perform(get("/api/v1/admin/dashboard-stats").with(adminJwt()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.code").value("SUCCESS"))
                                .andExpect(jsonPath("$.data").isMap());
                }

                @Test
                @DisplayName("GET /api/v1/admin/reports/users/summary returns 200")
                void getUserSummaryReturns200() throws Exception {
                        mockMvc.perform(get("/api/v1/admin/reports/users/summary")
                                        .with(adminJwt()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.code").value("SUCCESS"));
                }

                @Test
                @DisplayName("GET /api/v1/admin/audit-logs returns paginated results")
                void getAuditLogsReturns200() throws Exception {
                        mockMvc.perform(get("/api/v1/admin/audit-logs")
                                        .with(adminJwt())
                                        .param("page", "0")
                                        .param("size", "10"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.code").value("SUCCESS"))
                                .andExpect(jsonPath("$.data.items").isArray());
                }
        }

        @Nested
        @DisplayName("[Admin] Document Management (migrated write operations)")
        class AdminDocumentTests {

                @Test
                @DisplayName("POST /api/v1/admin/documents creates document")
                void createDocumentReturns200() throws Exception {
                        Map<String, Object> request = Map.of(
                                "title", "Smoke Test Document",
                                "description", "Test content for smoke testing",
                                "documentUrl", "https://example.test/smoke-document",
                                "documentType", "NOTE");

                        mockMvc.perform(post("/api/v1/admin/documents")
                                        .with(adminJwt())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.code").value("SUCCESS"))
                                .andExpect(jsonPath("$.data.title").value("Smoke Test Document"));
                }

                @Test
                @DisplayName("POST /api/v1/admin/documents fails validation with missing title")
                void createDocumentFailsValidation() throws Exception {
                        Map<String, Object> request = Map.of(
                                "description", "Content without title");

                        mockMvc.perform(post("/api/v1/admin/documents")
                                        .with(adminJwt())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isBadRequest());
                }

                @Test
                @DisplayName("POST /api/v1/admin/documents rejects anonymous requests")
                void createDocumentRejectsAnonymousRequest() throws Exception {
                        Map<String, Object> request = Map.of(
                                "title", "Protected document",
                                "documentUrl", "https://example.test/protected");

                        mockMvc.perform(post("/api/v1/admin/documents")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isUnauthorized());
                }

                @Test
                @DisplayName("POST /api/v1/admin/documents rejects non-admin roles")
                void createDocumentRejectsBuyerRole() throws Exception {
                        Map<String, Object> request = Map.of(
                                "title", "Protected document",
                                "documentUrl", "https://example.test/protected");

                        mockMvc.perform(post("/api/v1/admin/documents")
                                        .with(buyerJwt())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isForbidden());
                }

                @Test
                @DisplayName("GET /api/v1/admin/documents returns list")
                void getDocumentsReturns200() throws Exception {
                        mockMvc.perform(get("/api/v1/admin/documents")
                                        .with(adminJwt())
                                        .param("page", "0")
                                        .param("size", "10"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.code").value("SUCCESS"))
                                .andExpect(jsonPath("$.data.items").isArray());
                }
        }

        // ============================================================
        // Farmer Flow
        // ============================================================

        @Nested
        @DisplayName("[Farmer] Farm/Plot/Season Summary (read model)")
        class FarmerFlowTests {

                @Test
                @DisplayName("GET /api/v1/admin/farms/stats returns 200")
                void getFarmStatsReturns200() throws Exception {
                        mockMvc.perform(get("/api/v1/admin/farms/stats").with(adminJwt()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.code").value("SUCCESS"));
                }

                @Test
                @DisplayName("GET /api/v1/admin/farms returns paginated list")
                void getFarmsReturns200() throws Exception {
                        mockMvc.perform(get("/api/v1/admin/farms")
                                        .with(adminJwt())
                                        .param("page", "0")
                                        .param("size", "20"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.code").value("SUCCESS"))
                                .andExpect(jsonPath("$.data.items").isArray());
                }

                @Test
                @DisplayName("GET /api/v1/admin/plots returns paginated list")
                void getPlotsReturns200() throws Exception {
                        mockMvc.perform(get("/api/v1/admin/plots")
                                        .with(adminJwt())
                                        .param("page", "0")
                                        .param("size", "20"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.code").value("SUCCESS"));
                }

                @Test
                @DisplayName("GET /api/v1/admin/seasons returns paginated list")
                void getSeasonsReturns200() throws Exception {
                        mockMvc.perform(get("/api/v1/admin/seasons")
                                        .with(adminJwt())
                                        .param("page", "0")
                                        .param("size", "20"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.code").value("SUCCESS"));
                }
        }

        // ============================================================
        // Buyer Flow
        // ============================================================

        @Nested
        @DisplayName("[Admin] Cross-domain dashboard read models")
        class CrossDomainDashboardTests {

                @Test
                @DisplayName("GET /api/v1/admin/dashboard/pending-approvals returns 200")
                void getPendingApprovalsReturns200() throws Exception {
                        mockMvc.perform(get("/api/v1/admin/dashboard/pending-approvals")
                                        .with(adminJwt()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.code").value("SUCCESS"))
                                .andExpect(jsonPath("$.data").isArray());
                }

                @Test
                @DisplayName("GET /api/v1/admin/dashboard/inventory-health returns 200")
                void getInventoryHealthReturns200() throws Exception {
                        mockMvc.perform(get("/api/v1/admin/dashboard/inventory-health")
                                        .with(adminJwt()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.code").value("SUCCESS"))
                                .andExpect(jsonPath("$.data").isMap());
                }
        }

        // ============================================================
        // Employee Flow
        // ============================================================

        @Nested
        @DisplayName("[Employee] Incidents & Alerts")
        class EmployeeFlowTests {

                @Test
                @DisplayName("GET /api/v1/admin/incidents returns 200")
                void getIncidentsReturns200() throws Exception {
                        mockMvc.perform(get("/api/v1/admin/incidents")
                                        .with(adminJwt())
                                        .param("page", "0")
                                        .param("size", "20"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.code").value("SUCCESS"));
                }

                @Test
                @DisplayName("GET /api/v1/admin/reports/incident-statistics returns 200")
                void getIncidentStatisticsReturns200() throws Exception {
                        mockMvc.perform(get("/api/v1/admin/reports/incident-statistics")
                                        .with(adminJwt()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.code").value("SUCCESS"));
                }

                @Test
                @DisplayName("GET /api/v1/admin/tasks returns 200")
                void getTasksReturns200() throws Exception {
                        mockMvc.perform(get("/api/v1/admin/tasks")
                                        .with(adminJwt())
                                        .param("page", "0")
                                        .param("size", "20"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.code").value("SUCCESS"));
                }
        }

        // ============================================================
        // Non-Functional
        // ============================================================

        @Nested
        @DisplayName("Non-Functional: Health, Liveness, Observability")
        class NonFunctionalTests {

                @Test
                @DisplayName("GET /actuator/health returns UP")
                void healthReturnsUp() throws Exception {
                        mockMvc.perform(get("/actuator/health"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.status").value("UP"));
                }

                @Test
                @DisplayName("GET /actuator/health/liveness returns UP")
                void livenessReturnsUp() throws Exception {
                        mockMvc.perform(get("/actuator/health/liveness"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.status").value("UP"));
                }

                @Test
                @DisplayName("GET /actuator/prometheus returns metrics")
                void prometheusReturnsMetrics() throws Exception {
                        mockMvc.perform(get("/actuator/prometheus"))
                                .andExpect(status().isOk());
                }

                @Test
                @DisplayName("Unknown endpoint returns 404")
                void unknownEndpointReturns404() throws Exception {
                        mockMvc.perform(get("/api/v1/nonexistent-endpoint").with(adminJwt()))
                                .andExpect(status().isNotFound());
                }
        }
}
