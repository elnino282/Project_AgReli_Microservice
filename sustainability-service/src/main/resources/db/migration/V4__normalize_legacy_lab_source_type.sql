-- Older imports used LAB_TEST while the persisted enum was standardized as
-- LAB_MEASURED. Normalize existing rows before Hibernate materializes them.
UPDATE nutrient_input_events
SET source_type = 'LAB_MEASURED'
WHERE UPPER(source_type) = 'LAB_TEST';

UPDATE soil_tests
SET source_type = 'LAB_MEASURED'
WHERE UPPER(source_type) = 'LAB_TEST';

UPDATE irrigation_water_analyses
SET source_type = 'LAB_MEASURED'
WHERE UPPER(source_type) = 'LAB_TEST';
