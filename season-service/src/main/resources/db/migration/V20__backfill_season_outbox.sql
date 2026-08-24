-- Replay seed/imported seasons that were inserted before outbox publication
-- existed. farmId is intentionally omitted here: sustainability resolves the
-- farm through the plot snapshot emitted by farm-service.

INSERT INTO outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, processed, created_at
)
SELECT
    UUID(),
    'Season',
    CAST(s.season_id AS CHAR),
    'season.event.season.updated',
    JSON_OBJECT(
        'action', 'UPDATED',
        'seasonId', s.season_id,
        'seasonName', s.season_name,
        'plotId', s.plot_id,
        'farmId', NULL,
        'cropId', s.crop_id,
        'varietyId', s.variety_id,
        'startDate', DATE_FORMAT(s.start_date, '%Y-%m-%d'),
        'plannedHarvestDate', IF(s.planned_harvest_date IS NULL, NULL, DATE_FORMAT(s.planned_harvest_date, '%Y-%m-%d')),
        'endDate', IF(s.end_date IS NULL, NULL, DATE_FORMAT(s.end_date, '%Y-%m-%d')),
        'status', s.status,
        'initialPlantCount', s.initial_plant_count,
        'currentPlantCount', s.current_plant_count,
        'expectedYieldKg', s.expected_yield_kg,
        'actualYieldKg', s.actual_yield_kg,
        'budgetAmount', s.budget_amount,
        'notes', s.notes,
        'eventType', 'season.event.season.updated',
        'aggregateType', 'Season',
        'aggregateId', CAST(s.season_id AS CHAR),
        'producer', 'season-service'
    ),
    FALSE,
    CURRENT_TIMESTAMP
FROM seasons s;
