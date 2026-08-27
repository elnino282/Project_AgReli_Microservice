package org.example.sustainability.config;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.example.sustainability.enums.NutrientInputSource;
import org.example.sustainability.enums.NutrientInputSourceType;
import org.junit.jupiter.api.Test;

class NutrientEnumMigrationContractTest {

    private static final String MIGRATION =
            "db/migration/V5__enforce_nutrient_enum_domains.sql";

    @Test
    void migrationConstraintCoversEveryNutrientInputSource() throws IOException {
        String sql = readMigration();

        for (NutrientInputSource source : NutrientInputSource.values()) {
            assertTrue(
                    sql.contains("'" + source.name() + "'"),
                    () -> "V5 must allow NutrientInputSource." + source.name());
        }
        assertTrue(sql.contains("WHERE input_source = 'UREA_FERTILIZER'"));
        assertTrue(sql.contains("SET input_source = 'MINERAL_FERTILIZER'"));
    }

    @Test
    void migrationConstraintCoversEveryNutrientInputSourceType() throws IOException {
        String sql = readMigration();

        for (NutrientInputSourceType sourceType : NutrientInputSourceType.values()) {
            assertTrue(
                    sql.contains("'" + sourceType.name() + "'"),
                    () -> "V5 must allow NutrientInputSourceType." + sourceType.name());
        }
        assertTrue(sql.contains("WHERE source_type = 'FIELD_MEASUREMENT'"));
        assertTrue(sql.contains("WHERE source_type = 'LAB_TEST'"));
    }

    private String readMigration() throws IOException {
        try (InputStream input = Thread.currentThread()
                .getContextClassLoader()
                .getResourceAsStream(MIGRATION)) {
            assertTrue(input != null, () -> "Missing migration resource: " + MIGRATION);
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
