# AgReli Demo Release Route Truth Matrix

**Ngày chốt static audit:** 2026-08-25  
**Phạm vi:** các route/action được phép xuất hiện trong báo cáo và demo ba ngày  
**Nguyên tắc:** `VERIFIED_REAL` chỉ dùng khi route gọi backend và trạng thái thành công phụ thuộc response server; runtime/E2E evidence được bổ sung ở gate WP8.

## 1. Route và action được claim

| Vai trò | Route/action demo | Kết quả | Nguồn sự thật và giới hạn claim |
|---|---|---|---|
| Public | `/marketplace/products/:slug` | `VERIFIED_REAL` | Product public lấy từ marketplace API; có component regression `ProductDetailPage.test.tsx`. |
| Public | `/trace/:slug` | `VERIFIED_REAL` | Canonical public trace lấy snapshot backend; legacy `/marketplace/products/:slug/trace` chỉ redirect sang route này. Không claim dữ liệu khi API lỗi. |
| Buyer | `/marketplace/cart` | `VERIFIED_REAL` | Buyer route được bảo vệ theo role; cart/order flow dùng marketplace contract. Guest cart local browser chỉ là pre-auth convenience, không phải server truth được claim. |
| Buyer | `/marketplace/checkout` → tạo order | `VERIFIED_REAL` | Shipping quote và order payload do server xác minh; UI recurring chưa có contract đã bị gỡ. Chỉ claim đơn giao một lần. |
| Buyer | `/marketplace/orders`, `/marketplace/orders/:id` | `VERIFIED_REAL` | Danh sách/chi tiết order tải lại từ API; delivery được provision từ `order.created` ngoài browser. |
| Farmer | `/farmer/dashboard` | `VERIFIED_REAL` | Dashboard/read model lấy backend; không dùng số liệu hard-code làm bằng chứng báo cáo. |
| Farmer | `/farmer/farms`, `/farmer/farms/:id` | `VERIFIED_REAL` | Farm/plot CRUD qua farm-service; ownership được backend kiểm tra. |
| Farmer | `/farmer/farms/:farmId/self-assessment` | `VERIFIED_REAL` | Checklist `MANUAL` persist qua backend và reload server truth; automated items không cho sửa tay. |
| Farmer | `/farmer/farms/:farmId/certification` | `VERIFIED_REAL` | Sync/apply/export dùng farm-service. Training yêu cầu 100% và PHI đều fail-closed; dossier không được tạo nếu diary thiếu nguồn. |
| Farmer | `/farmer/seasons/:seasonId/workspace/tasks` | `VERIFIED_REAL` | Task CRUD/progress qua season-service. Approve/reject gọi API thật; approve chuyển `DONE` rồi mới tính lại payroll. |
| Farmer | `/farmer/seasons/:seasonId/workspace/field-logs` | `VERIFIED_REAL` | Field log persist; thuốc không xác định PHI bị chặn và rollback. |
| Farmer | `/farmer/seasons/:seasonId/workspace/harvest` | `VERIFIED_REAL` | Harvest persist qua season-service; chỉ claim create/update/list hiện hành, không claim các nút in/generate chưa nối backend. |
| Farmer | `/farmer/suppliers-supplies`, `/farmer/product-warehouse` | `VERIFIED_REAL` | Inventory/supply/product lot dùng inventory-service. Claim nhập/xuất/tồn và lot trace theo API hiện có. |
| Farmer | `/farmer/seasons/:seasonId/workspace/production-diary` | `VERIFIED_REAL` | Tổng hợp season + sustainability. Outage trả typed 503, không hiển thị partial như dữ liệu đầy đủ. |
| Employee | `/employee/tasks` | `VERIFIED_REAL` | Nhận task và cập nhật trạng thái qua season-service. |
| Employee | `/employee/progress` | `VERIFIED_REAL` | Báo cáo progress persist; 100% chuyển task sang `REVIEWING`, chưa tự tính là hoàn thành. |
| Employee | `/employee/payroll` | `VERIFIED_REAL` | Payroll lấy từ backend; số tiền chỉ phản ánh task `DONE` sau supervisor approval. |
| Admin | `/admin/dashboard` | `VERIFIED_REAL` | Dashboard dùng admin-reporting read model/event snapshots. |
| Admin | `/admin/cert-audits` | `VERIFIED_REAL` | Audit lifecycle, nonconformity/CAPA và issue certificate dùng persisted farm-service contract. |
| Admin | `/admin/users-roles` | `VERIFIED_REAL` | User/role mutations dùng identity/admin API; toast success nằm sau mutation success. |
| Admin | `/admin/reports` | `VERIFIED_REAL` | Summary, yield, cost, revenue, profit, filter, drilldown và export gọi admin-reporting API trong component đang route. Chỉ claim các tab này. |

## 2. Đã ẩn hoặc redirect khỏi release

| Route/action | Kết quả | Quyết định release |
|---|---|---|
| `/marketplace/products/:slug/trace` implementation cũ | `HIDDEN_FROM_RELEASE` | Redirect sang `/trace/:slug`; loại trang tự dựng dữ liệu. |
| Admin `farm-documents` | `HIDDEN_FROM_RELEASE` | Bỏ khỏi navigation, legacy view chuyển về `cert-audits`, xóa page mock. |
| Checkout giao hàng tuần/tháng | `HIDDEN_FROM_RELEASE` | Bỏ controls và lời hứa auto-create vì order contract chưa có recurrence. |
| Admin system settings/system monitoring prototype | `HIDDEN_FROM_RELEASE` | Không nằm trong navigation/demo; nhiều handler còn placeholder nên không được claim. |
| Harvest “generate QR/print handover” chỉ toast | `HIDDEN_FROM_RELEASE` | Không bấm trong demo và không đưa vào báo cáo release. QR public trace dùng product lot/trace contract thật. |
| Season duplicate/export local-only và crop timeline/seed-log placeholder | `HIDDEN_FROM_RELEASE` | Không nằm trong canonical journey. |

## 3. Roadmap-only sau báo cáo

| Năng lực | Kết quả | Acceptance tối thiểu trước khi mở lại |
|---|---|---|
| Recurring/pre-order/subscription | `ROADMAP_ONLY` | Schema recurrence, idempotent scheduler, cancel/pause, payment và delivery semantics, E2E. |
| Production diary partial response v2 | `ROADMAP_ONLY` | `completenessStatus`, `missingSources`, `generatedAt`, UI warning và contract tests. |
| Training threshold cấu hình động | `ROADMAP_ONLY` | Versioned policy theo standard/category; release hiện khóa 100%. |
| Offline-lite/mobile field capture | `ROADMAP_ONLY` | Local queue, conflict policy, evidence upload retry và sync telemetry. |
| External certification authority integration | `ROADMAP_ONLY` | Signed submission/receipt, status polling/webhook, audit trail và reconciliation. |

## 4. Gate để đổi `static verified` thành evidence demo

- Chạy full frontend, farm-service và season-service suites.
- Chạy stack canonical qua gateway và `npm run demo:smoke`.
- Thực hiện bốn journey trong kế hoạch, ghi aggregate IDs và xác minh sau reload.
- Không đưa action ở mục 2–3 vào demo script.
- Nếu runtime gate của một route thất bại, hạ route đó thành `HIDDEN_FROM_RELEASE`; không giữ nhãn `VERIFIED_REAL` chỉ dựa trên code.
