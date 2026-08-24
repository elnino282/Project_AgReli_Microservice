-- Seed/imported rows predate the transactional outbox and therefore never
-- reached event-fed read models such as sustainability-service. Replay their
-- current state once through the normal event boundary; consumers remain
-- idempotent by message id and later mutations continue to use the Java outbox.

INSERT INTO outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, processed, created_at
)
SELECT
    UUID(),
    'Farm',
    CAST(f.farm_id AS CHAR),
    'farm.event.farm.updated',
    JSON_OBJECT(
        'action', 'UPDATED',
        'farmId', f.farm_id,
        'farmName', f.farm_name,
        'userId', f.user_id,
        'provinceId', f.province_id,
        'provinceName', p.name,
        'wardId', f.ward_id,
        'wardName', w.name,
        'area', f.area,
        'latitude', f.latitude,
        'longitude', f.longitude,
        'active', f.active,
        'eventType', 'farm.event.farm.updated',
        'aggregateType', 'Farm',
        'aggregateId', CAST(f.farm_id AS CHAR),
        'producer', 'farm-service'
    ),
    FALSE,
    CURRENT_TIMESTAMP
FROM farms f
JOIN provinces p ON p.id = f.province_id
JOIN wards w ON w.id = f.ward_id;

INSERT INTO outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, processed, created_at
)
SELECT
    UUID(),
    'Plot',
    CAST(pl.plot_id AS CHAR),
    'farm.event.plot.updated',
    JSON_OBJECT(
        'action', 'UPDATED',
        'plotId', pl.plot_id,
        'farmId', pl.farm_id,
        'plotName', pl.plot_name,
        'area', pl.area,
        'soilType', pl.soil_type,
        'boundaryGeoJson', pl.boundary_geojson,
        'status', pl.status,
        'eventType', 'farm.event.plot.updated',
        'aggregateType', 'Plot',
        'aggregateId', CAST(pl.plot_id AS CHAR),
        'producer', 'farm-service'
    ),
    FALSE,
    CURRENT_TIMESTAMP
FROM plots pl;
