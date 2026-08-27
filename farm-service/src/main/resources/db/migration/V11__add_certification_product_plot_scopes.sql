CREATE TABLE certification_scopes (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    record_id           INT            NOT NULL,
    season_id           INT            NOT NULL,
    plot_id             INT            NOT NULL,
    plot_name           VARCHAR(255)   NOT NULL,
    crop_id             INT            NOT NULL,
    crop_name           VARCHAR(255)   NOT NULL,
    variety_id          INT            NULL,
    variety_name        VARCHAR(255)   NULL,
    registered_area_ha  DECIMAL(12,4)  NOT NULL,
    expected_yield_kg   DECIMAL(19,3)  NULL,
    created_at          DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at          DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                      ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT fk_certification_scope_record
        FOREIGN KEY (record_id) REFERENCES certification_records(id) ON DELETE CASCADE,
    CONSTRAINT uk_certification_scope_record_season UNIQUE (record_id, season_id),
    INDEX idx_certification_scope_plot_crop (plot_id, crop_id),
    INDEX idx_certification_scope_record (record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
