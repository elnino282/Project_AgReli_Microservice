ALTER TABLE soil_tests
    ADD COLUMN soil_ph DECIMAL(5,2) NULL AFTER sample_date,
    ADD COLUMN electrical_conductivity_ds_m DECIMAL(12,4) NULL AFTER soil_ph;

CREATE INDEX idx_soil_tests_plot_latest
    ON soil_tests (plot_id, sample_date DESC, created_at DESC);
