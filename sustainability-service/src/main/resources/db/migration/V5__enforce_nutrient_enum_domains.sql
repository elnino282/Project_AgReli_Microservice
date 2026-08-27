-- Normalize values produced by legacy/manual seed imports before Hibernate
-- materializes these VARCHAR columns as Java enums.
UPDATE nutrient_input_events
SET input_source = UPPER(TRIM(input_source));

UPDATE nutrient_input_events
SET input_source = 'MINERAL_FERTILIZER'
WHERE input_source = 'UREA_FERTILIZER';

UPDATE nutrient_input_events
SET source_type = UPPER(TRIM(source_type))
WHERE source_type IS NOT NULL;

UPDATE nutrient_input_events
SET source_type = 'USER_ENTERED'
WHERE source_type = 'FIELD_MEASUREMENT';

UPDATE nutrient_input_events
SET source_type = 'LAB_MEASURED'
WHERE source_type = 'LAB_TEST';

UPDATE soil_tests
SET source_type = UPPER(TRIM(source_type))
WHERE source_type IS NOT NULL;

UPDATE soil_tests
SET source_type = 'LAB_MEASURED'
WHERE source_type = 'LAB_TEST';

UPDATE irrigation_water_analyses
SET source_type = UPPER(TRIM(source_type))
WHERE source_type IS NOT NULL;

UPDATE irrigation_water_analyses
SET source_type = 'LAB_MEASURED'
WHERE source_type = 'LAB_TEST';

-- Keep the database contract aligned with NutrientInputSource.
ALTER TABLE nutrient_input_events
    ADD CONSTRAINT chk_nutrient_events_input_source
    CHECK (input_source IN (
        'MINERAL_FERTILIZER',
        'ORGANIC_FERTILIZER',
        'BIOLOGICAL_FIXATION',
        'IRRIGATION_WATER',
        'ATMOSPHERIC_DEPOSITION',
        'SEED_IMPORT',
        'SOIL_LEGACY',
        'CONTROL_SUPPLY'
    ));

-- Keep all source_type columns aligned with NutrientInputSourceType.
ALTER TABLE nutrient_input_events
    ADD CONSTRAINT chk_nutrient_events_source_type
    CHECK (source_type IS NULL OR source_type IN (
        'USER_ENTERED',
        'LAB_MEASURED',
        'SYSTEM_ESTIMATED',
        'EXTERNAL_REFERENCE',
        'DEFAULT_REFERENCE'
    ));

ALTER TABLE soil_tests
    ADD CONSTRAINT chk_soil_tests_source_type
    CHECK (source_type IS NULL OR source_type IN (
        'USER_ENTERED',
        'LAB_MEASURED',
        'SYSTEM_ESTIMATED',
        'EXTERNAL_REFERENCE',
        'DEFAULT_REFERENCE'
    ));

ALTER TABLE irrigation_water_analyses
    ADD CONSTRAINT chk_water_analyses_source_type
    CHECK (source_type IS NULL OR source_type IN (
        'USER_ENTERED',
        'LAB_MEASURED',
        'SYSTEM_ESTIMATED',
        'EXTERNAL_REFERENCE',
        'DEFAULT_REFERENCE'
    ));
