UPDATE disease_treatments
SET effectiveness = CASE UPPER(TRIM(effectiveness))
    WHEN 'EFFECTIVE' THEN 'GOOD'
    WHEN 'VERY_EFFECTIVE' THEN 'EXCELLENT'
    WHEN 'INEFFECTIVE' THEN 'POOR'
    WHEN 'PARTIAL' THEN 'FAIR'
    ELSE UPPER(TRIM(effectiveness))
END
WHERE effectiveness IS NOT NULL;

ALTER TABLE disease_treatments
    ADD CONSTRAINT chk_disease_treatment_effectiveness
    CHECK (
        effectiveness IS NULL
        OR effectiveness IN ('UNKNOWN', 'POOR', 'FAIR', 'GOOD', 'EXCELLENT')
    );
