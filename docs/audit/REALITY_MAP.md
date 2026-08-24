# Reality map — VietFuture2026

Ngày chốt Discovery: 2026-08-14. Tài liệu này chỉ mô tả code trên `main`; nội dung trong tài liệu ý tưởng không được coi là đã triển khai nếu không có route và contract đang chạy.

## Luồng hệ thống

`React/Vite -> API Gateway :8080 -> Spring Boot services -> MySQL schema riêng`

- REST đồng bộ giữa service dùng OpenFeign. Các endpoint nội bộ chủ yếu ở `/api/v1/internal/**`.
- RabbitMQ và transactional outbox được dùng cho các luồng bất đồng bộ đã triển khai.
- Runtime gồm 12 service: identity, crop-catalog, ai, farm, season, inventory, finance, incident, sustainability, marketplace, admin-reporting và delivery; `service-template` và `shared-config` không phải runtime service.
- MySQL/Flyway là nguồn persistence hiện tại. PostgreSQL và Kubernetes mới là định hướng.
- MinIO được dùng cho tài liệu/ảnh; Redis hiện tập trung ở farm-service.
- Chroma v2 là vector store thật của ai-service; Gemini embedding và metadata nguồn đi xuyên backend/OpenAPI/frontend. Khi AI key hoặc vector backend unavailable, luồng fail rõ thay vì trả nguồn giả.
- Tempo 2.7.2 chạy single-binary, nhận OTLP 4317/4318 và query/readiness ở 3200; Grafana datasource đã provision.

## Ma trận route sống và nguồn dữ liệu

| Persona | Route/luồng | Component sống | Nguồn dữ liệu thực tế | Trạng thái |
|---|---|---|---|---|
| Farmer | `/farmer/dashboard` | `FarmerDashboardPage` | season dashboard API + sustainability FDN overview; AI harvest dùng season/log persisted | Thật; runtime demo verified |
| Farmer | `/farmer/farms/**` | Farm/plot/certification pages | farm-service + season lookups | Thật; destructive/PHI guards fail-closed và self-assessment persist/reload server truth |
| Farmer | `/farmer/seasons/:id/workspace/**` | Season workspace | season, finance, inventory, sustainability services | Thật; soil/water/nutrient route/tab đã mở và seed snapshot được backfill qua outbox |
| Farmer/Employee | disease/field-log workspace | `DiseaseTrackingPage` và field log UI | season-service + inventory + ai-service | Thật; unknown pesticide không còn sinh PHI 0 và mutation rollback khi reference thiếu |
| Employee | tasks/progress/payroll | Employee portal pages | season-service | Thật; chưa enforce chu kỳ báo cáo 24 giờ |
| Admin | `/admin/cert-audits` | `AdminCertAuditsPage` | farm certification audit state machine persisted | Thật; ADMIN-only contract và runtime dashboard verified |
| Farmer | marketplace products/orders/deliveries | Seller pages | marketplace-service + delivery-service | Thật một phần |
| Buyer | marketplace/cart/checkout/orders | Buyer marketplace pages | marketplace authoritative quote/order + delivery event consumer | Thật; browser không còn tự tạo delivery, quote/ownership/idempotency server-authoritative |
| Admin | crop catalog variety delete | Admin variety route/controller | crop-catalog -> internal season reference guard | Route thật; downstream null/outage fail-closed |
| Public | `/trace/:slug` | `PublicTracePage` | marketplace snapshot API | API thật; certification/PHI null hiển thị unknown, chỉ sellable lookup |
| Public | farm store | `FarmStorePage` | farm/product API | Thật; mock standards/activity claims đã gỡ, thiếu dữ liệu hiển thị unknown/empty rõ |

## Contract xuyên service quan trọng

- marketplace -> identity/farm/season/inventory: profile, farm/certification, PHI/season và stock reservation.
- season -> farm/crop-catalog/identity/inventory/sustainability/ai: workspace enrichment, product lot, production diary và AI disease suggestion.
- farm -> season: production diary khi export dossier.
- sustainability/admin-reporting/incident/inventory: kết hợp REST và event-fed read model.
- Checkout ghi marketplace order + outbox; delivery consumer xử lý `order.created` idempotent, lookup persisted context và consume quote authoritative.
- farm/crop-catalog dùng internal season reference guard khi xóa plot/variety; downstream null/outage trả typed 503 và không mutate.
- certification auto-populate đọc season/PHI qua Feign; chỉ verified-empty được PASS, outage trả typed 503 và không persist score/status.

## Phần có code nhưng chưa reachable hoặc chưa thật

- Các dashboard hook không có controller hiện hành vẫn không được wire chỉ vì tồn tại trong legacy spec; FDN overview có backend thật đã được route sống dùng.
- Duplicate `src/pages/farmer/SeasonsPage.tsx` đã xóa; route canonical là `features/farmer/seasons/SeasonManagement`.
- Các module chỉ có trong tài liệu ý tưởng vẫn ở product backlog; audit S3 không xây chen feature mới.

## Quy tắc cập nhật

- Chỉ thay đổi tài liệu này khi route, owner service hoặc contract thực tế đổi.
- Finding và trạng thái sửa lỗi nằm ở `AUDIT_BACKLOG.md`; không biến reality map thành danh sách bug trùng lặp.
- Khi phát hiện tài liệu ý tưởng lệch code, ưu tiên code/route đang chạy và ghi phần còn thiếu vào product backlog, không tự xây mới trong audit fix.
- Trace chi tiết route → request → owner → persistence nằm ở `ROUTE_MATRIX.md`.
