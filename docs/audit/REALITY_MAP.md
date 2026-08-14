# Reality map — VietFuture2026

Ngày chốt Discovery: 2026-08-14. Tài liệu này chỉ mô tả code trên `main`; nội dung trong tài liệu ý tưởng không được coi là đã triển khai nếu không có route và contract đang chạy.

## Luồng hệ thống

`React/Vite -> API Gateway :8080 -> Spring Boot services -> MySQL schema riêng`

- REST đồng bộ giữa service dùng OpenFeign. Các endpoint nội bộ chủ yếu ở `/api/v1/internal/**`.
- RabbitMQ và transactional outbox được dùng cho các luồng bất đồng bộ đã triển khai.
- Runtime gồm 12 service: identity, crop-catalog, ai, farm, season, inventory, finance, incident, sustainability, marketplace, admin-reporting và delivery; `service-template` và `shared-config` không phải runtime service.
- MySQL/Flyway là nguồn persistence hiện tại. PostgreSQL và Kubernetes mới là định hướng.
- MinIO được dùng cho tài liệu/ảnh; Redis hiện tập trung ở farm-service.
- Chroma có container nhưng ai-service đang loại Chroma auto-configuration và dùng dummy vector store, nên RAG chưa hoạt động thật.
- `tempo` trong Compose hiện trỏ nhầm tới image `mailhog/mailhog:latest`; tracing backend chưa tồn tại dù service mang tên Tempo.

## Ma trận route sống và nguồn dữ liệu

| Persona | Route/luồng | Component sống | Nguồn dữ liệu thực tế | Trạng thái |
|---|---|---|---|---|
| Farmer | `/farmer/dashboard` | `FarmerDashboardPage` | season-service dashboard API; modal dự báo AI gửi recent logs hard-code | Lai thật/giả |
| Farmer | `/farmer/farms/**` | Farm/plot/certification pages | farm-service + season lookups | Thật; plot delete guard và certification PHI scoring có fail-open; self-assessment chỉ local state |
| Farmer | `/farmer/seasons/:id/workspace/**` | Season workspace | season, finance, inventory, sustainability services | Thật; soil/water/nutrient route đang bị comment |
| Farmer/Employee | disease/field-log workspace | `DiseaseTrackingPage` và field log UI | season-service + inventory + ai-service | Thật một phần; field log SPRAY có thể sinh PHI 0 khi thuốc không match reference |
| Employee | tasks/progress/payroll | Employee portal pages | season-service | Thật; chưa enforce chu kỳ báo cáo 24 giờ |
| Admin | `/admin/cert-audits` | `AdminCertAuditsPage` | Client gọi contract không tồn tại rồi fallback mock | Core bị chặn/giả |
| Farmer | marketplace products/orders/deliveries | Seller pages | marketplace-service + delivery-service | Thật một phần |
| Buyer | marketplace/cart/checkout/orders | Buyer marketplace pages | marketplace + inventory; frontend tự tạo delivery sau order | Thật nhưng orchestration không nguyên tử; quote/fee/weight/order association tin browser và lệch giữa hai DB |
| Admin | crop catalog variety delete | Admin variety route/controller | crop-catalog -> season lookup | Route thật; lookup URL chưa có controller và fallback false nên destructive guard fail-open |
| Public | `/trace/:slug` | `PublicTracePage` | marketplace snapshot API | API thật; certification/PHI null hiển thị unknown, chỉ sellable lookup |
| Public | farm store | `FarmStorePage` | farm/product API trộn `MOCK_STANDARDS` và activity log hard-code | Claim hữu cơ/nước/an toàn giả; phân loại S0 |

## Contract xuyên service quan trọng

- marketplace -> identity/farm/season/inventory: profile, farm/certification, PHI/season và stock reservation.
- season -> farm/crop-catalog/identity/inventory/sustainability/ai: workspace enrichment, product lot, production diary và AI disease suggestion.
- farm -> season: production diary khi export dossier.
- sustainability/admin-reporting/incident/inventory: kết hợp REST và event-fed read model.
- checkout hiện tạo marketplace order trước rồi để frontend gọi delivery-service; đây không phải transaction/saga backend. Marketplace dùng fee mặc định riêng, còn delivery tin quote fields từ browser.
- farm/crop-catalog dùng season-service làm reference guard khi xóa plot/variety; các lookup URL hiện không được expose và fallback `false`, nên database-per-service không giữ được referential integrity khi downstream lỗi.
- certification auto-populate ở farm-service đọc season/PHI qua Feign; empty fallback đang được diễn giải thành PHI PASS và persist vào score/status.

## Phần có code nhưng chưa reachable hoặc chưa thật

- `src/entities/dashboard` có hooks overview/today tasks/incidents/completeness/FDN nhưng không được dashboard route sống sử dụng; một số endpoint client chỉ còn trong legacy spec.
- Season nutrient input, irrigation water analysis và soil test có component/API nhưng route/tab bị comment.
- Admin certification backend có audit/nonconformity/corrective action/issue certificate, nhưng UI admin chưa dùng đúng contract.
- AI chat gọi Gemini, nhưng vector search luôn rỗng do dummy vector store.
- Delivery backend có công thức khoảng cách/cân nặng/cold-chain, nhưng checkout gửi trọng lượng và tọa độ giả định; create API còn nhận fee/weight/orderId trực tiếp từ buyer.

## Quy tắc cập nhật

- Chỉ thay đổi tài liệu này khi route, owner service hoặc contract thực tế đổi.
- Finding và trạng thái sửa lỗi nằm ở `AUDIT_BACKLOG.md`; không biến reality map thành danh sách bug trùng lặp.
- Khi phát hiện tài liệu ý tưởng lệch code, ưu tiên code/route đang chạy và ghi phần còn thiếu vào product backlog, không tự xây mới trong audit fix.
- Trace chi tiết route → request → owner → persistence nằm ở `ROUTE_MATRIX.md`.
