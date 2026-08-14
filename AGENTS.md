# Bộ nhớ làm việc của VietFuture2026

File này là nguồn sự thật tĩnh cho các phiên Codex/Claude tiếp theo. Chỉ quét lại phần code liên quan khi thông tin tại đây không đủ hoặc có dấu hiệu đã lỗi thời. Khi sửa một thư mục có `AGENTS.md` gần hơn, đọc và áp dụng file đó cùng với file này.

## Kiến trúc tổng quan

### Luồng hệ thống

`React/Vite -> API Gateway (8080) -> Spring Boot services -> database/infra riêng`.

- Backend là monorepo microservices dạng phẳng: mỗi `*-service/` là một Maven project độc lập, không có parent Maven aggregator ở root.
- API Gateway dùng Spring Cloud Gateway, route theo path; gateway không xác thực JWT thay service mà chuyển request tới resource server tương ứng.
- Gọi đồng bộ giữa service dùng Spring Cloud OpenFeign qua các endpoint `/api/v1/internal/**` hoặc `/api/v1/public/lookup/**`.
- Giao tiếp bất đồng bộ dùng RabbitMQ topic exchanges và transactional-outbox/polling publisher. Các service phát event chính gồm identity, crop catalog, farm, season, finance, incident, inventory và marketplace; sustainability, incident, inventory và admin reporting có consumer/read model cùng bảng `processed_events` để chống xử lý lặp ở các luồng đã triển khai.
- Mỗi service nghiệp vụ có MySQL schema riêng và Flyway migration riêng. Không truy cập repository/entity của service khác; chỉ truyền DTO qua HTTP hoặc event.
- Hạ tầng phụ: MinIO cho tài liệu/ảnh, Redis cache ở farm-service, Chroma cho RAG của ai-service, MailHog cho mail dev, Prometheus/Grafana/Tempo cho quan sát hệ thống.

### Runtime services

| Thành phần | Port | Database / vai trò chính |
|---|---:|---|
| `api-gateway` | 8080 | Điểm vào HTTP, CORS, route tới các service |
| `identity-service` | 8081 | `identity_db`; auth, JWT/JWKS, user/role/preferences, Firebase chat token |
| `crop-catalog-service` | 8082 | `crop_catalog_db`; crop, variety, catalog/reference data |
| `ai-service` | 8083 | Gemini + Chroma; chat, phân tích bệnh/hình ảnh, knowledge ingestion |
| `farm-service` | 8084 | `farm_db`; farm/plot/location, documents, certification/audit |
| `season-service` | 8085 | `season_db`; season, task, field log, disease/PHI, harvest, labor/payroll |
| `inventory-service` | 8086 | `inventory_db`; vật tư, kho, reservation, product lot/traceability |
| `finance-service` | 8087 | `finance_db`; expense và liên kết expense-season/task |
| `incident-service` | 8088 | `incident_db`; incident, alert, notification |
| `sustainability-service` | 8089 | `sustainability_db`; soil/water/nutrient, dashboard/report, event snapshots |
| `marketplace-service` | 8090 | `marketplace_db`; product, cart, order, review, payment proof, public trace |
| `admin-reporting-service` | 8091 | `admin_reporting_db`; event-fed admin read models, dashboard/report/document |
| `delivery-service` | 8092 | `delivery_db`; shipping fee/rate/provider/delivery order |

`service-template/` là mẫu tạo service, `shared-config/` là autoconfiguration nhỏ hiện chưa được service nào khai báo dependency; cả hai không nằm trong runtime Compose.

### Cấu trúc thư mục

- Backend service chuẩn: `src/main/java/org/example/<domain>/{config,controller,service,repository,entity,dto,...}`, cấu hình ở `src/main/resources/application.yml`, Flyway ở `db/migration/`, test phản chiếu package dưới `src/test/`.
- Một số domain tách `event`, `client`, `listener`, `port`, `strategy`, `snapshot`; giữ boundary hiện có thay vì import xuyên service.
- Frontend nằm tại `agricultural-crop-management-frontend/`; đọc file `AGENTS.md` trong thư mục đó trước khi sửa frontend.
- OpenAPI snapshots nằm ở `docs/openapi/`; Orval sinh client frontend từ endpoint `/v3/api-docs` của từng service.
- `scratch/`, `out_test/`, `build/`, `target/`, `node_modules/`, `venv/` là output/thử nghiệm, không dùng làm nguồn kiến trúc.

### Build, test và chạy

- Toàn hệ thống backend: chuẩn bị `.env`, RSA keys của identity theo `RUN_GUIDE.md`, rồi `docker compose up -d --build`. Dừng bằng `docker compose down`; không dùng `down -v` nếu chưa được phép vì xóa dữ liệu.
- Một backend service: `cd <service> && mvn test`; build jar bằng `mvn package -DskipTests`. Repo không có Maven wrapper và yêu cầu Java 23/Maven 3.9+.
- Test đích danh: `mvn -Dtest=ClassName test`. Với thay đổi Flyway/integration, chạy profile/test DB đúng service thay vì chỉ unit test.
- Frontend: `cd agricultural-crop-management-frontend && npm ci && npm run dev`; cổng Vite mặc định hiện là 3000. Kiểm tra chuẩn: `npm run typecheck`, `npm run lint`, `npm run test -- --run`, `npm run build`.
- Cổng hiện hành lấy từ `docker-compose.yml`/`application.yml`: gateway là 8080. Một số nội dung trong `RUN_GUIDE.md` còn ghi 8000/5173 và không phải nguồn sự thật cho port hiện tại.

## Quy ước code

### Backend

- Java 23, Spring Boot 3.5.3, Spring Cloud 2025.0.3; ưu tiên constructor injection (`@RequiredArgsConstructor`), Lombok cho boilerplate và MapStruct nơi service đã dùng mapper.
- Tên class theo vai trò: `*Controller`, `*Service`/`*ServiceImpl`, `*Repository`, `*Client`/`*FeignClient`, `*Request`, `*Response`, `*Event`, `*Listener`, `*Config`, `*Exception`. Java package viết thường; class/method camel case theo chuẩn Java. Không nhân rộng các tên method PascalCase cũ như `CancelSeason`/`UpdateSeason`.
- Controller chỉ nhận/validate/map HTTP; nghiệp vụ và transaction ở service; persistence qua Spring Data repository. Response public thường bọc `ApiResponse<T>` và lỗi đi qua `AppException` + `ErrorCode` + `GlobalExceptionHandler`.
- DTO request/response/event tách khỏi entity. Không trả JPA entity trực tiếp và không dùng entity/repository của service khác.
- API public dùng `/api/v1/...`; API nội bộ dùng `/api/v1/internal/...`; lookup tương thích cũ dùng `/api/v1/public/lookup/...`. Khi đổi contract, cập nhật controller, DTO, OpenAPI/test và client liên quan.
- Flyway là additive-only: tạo `V<n>__mo_ta.sql` với version cao hơn trong đúng service; không sửa migration đã phát hành và không dùng `ddl-auto` để thay schema.
- Outbox event phải được ghi cùng transaction với aggregate; publisher chỉ đánh dấu processed sau khi RabbitMQ publish thành công. Consumer phải giữ idempotency/`processed_events` nếu luồng hiện có yêu cầu.
- Test đặt tên `*Test`, `*Tests`, `*IntegrationTest`; thay đổi security phải có MockMvc/reflection test cho anonymous, sai role và đúng role.

### Auth và security

- Identity phát JWT RSA/RS256 và JWKS tại `/api/v1/auth/.well-known/jwks.json`. Các service là stateless OAuth2 resource server, dùng `CustomJwtDecoder`; role được đọc từ claim `scope` với authority prefix rỗng, nên expression chuẩn là `hasRole('FARMER')`, `hasRole('ADMIN')`, v.v.
- HTTP filter chỉ phân biệt public/authenticated; authorization theo role đặt bằng `@PreAuthorize` ở class hoặc method. Ownership còn phải kiểm tra ở service qua `CurrentUserService` và dữ liệu farm/plot/order; frontend route guard không thay thế backend authorization.
- Public endpoint phải xuất hiện rõ trong `PUBLIC_ENDPOINTS` và trong whitelist/security test tương ứng. Không biến endpoint thành public chỉ để làm test xanh.
- Header `Authorization: Bearer <token>` đi qua gateway. Internal HTTP hiện không có service credential riêng; xem finding bảo mật bên dưới trước khi mở rộng endpoint nội bộ.

### Frontend

Quy ước chi tiết nằm ở `agricultural-crop-management-frontend/AGENTS.md`; root chỉ giữ boundary: gọi backend qua shared Axios/Orval client và API Gateway, không hard-code gọi thẳng port service trong feature code, không sửa tay file `src/**/api/generated/**`.

## Known issues / Audit findings (ưu tiên xử lý)

Cập nhật trạng thái ngay khi audit thêm hoặc fix xong; không xóa lịch sử xác minh quan trọng nếu việc xóa làm phiên sau hiểu sai kiến trúc. Audit gần nhất: 2026-08-14.

1. **[FIXED 2026-08-14, AUD-S0-001] Compose readiness đã được xác minh lặp lại.** MySQL probe đăng nhập bằng application credential và kiểm tra đủ 11 schema; dependency bắt buộc dùng `service_healthy`. Hai cold-start độc lập từ volume `vietfuture_audit_*` mới đều hoàn tất khoảng 194 giây, đủ 22 container, 12 service healthy, gateway HTTP 200/`UP` và không có lỗi DB/dependency startup. Không chạy song song full dev/audit trên Docker Desktop nếu thiếu tài nguyên.
2. **[FIXED 2026-08-14, AUD-S0-011] Marketplace PHI gate đã fail-closed.** PHI luôn được kiểm tra khi listing có `seasonId`, độc lập claim null/`NONE`; SeasonClient fallback không còn biến outage thành empty. Verified-empty vẫn tạo safe snapshot, còn violation/outage chặn cả `ACTIVE` và `PUBLISHED`. Targeted 17 test và full marketplace 40 test xanh.
3. **[FIXED 2026-08-14, AUD-S0-014] Field log thuốc không xác định không còn mặc định PHI 0 ngày.** Derived/direct create dùng cùng lookup invariant; reference thiếu hoặc PHI không hợp lệ trả `ERR_PESTICIDE_PHI_NOT_FOUND` HTTP 400. Integration test chứng minh rollback cả field log và pesticide record; targeted 4 và full season 16 test xanh. Query dev hiện có 0 derived zero-day record lịch sử.
4. **[FIXED 2026-08-14, AUD-S0-017] Certification PHI evidence đã fail-closed.** Season discovery/PHI fallback ném unavailable; outage trả typed 503 và không ghi `PASS`, tăng score hoặc mutate apply/issue/publication. Verified-empty mới `PASS`, violation `FAIL`, không có season giữ `PENDING`; targeted 10 và full farm 13 test xanh. DB dev có 1/2 PHI item đang `PASS` cần review thủ công vì schema cũ không lưu provenance.
5. **[FIXED 2026-08-14, AUD-S0-012] Public farm store không còn hiển thị claim không có nguồn.** Đã gỡ `MOCK_STANDARDS` và activity logs hard-code khỏi route sống; tab nhật ký chỉ báo chưa có dữ liệu được xác minh. Component 5/5, typecheck, lint (0 error; warning debt cũ) và production build xanh.
6. **[FIXED 2026-08-14, AUD-S0-015] Variety delete guard đã fail-closed.** Season cung cấp internal `exists-by-variety`; crop-catalog chỉ xóa khi nhận `false` hợp lệ, còn null/outage trả typed 503. H2 DB, ADMIN security, boundary regression đều xanh; full crop-catalog 12 và season 17 test xanh.
7. **[FIXED 2026-08-14, AUD-S0-016] Plot delete guard đã fail-closed.** Một internal response tổng hợp xác minh active season/task; null/outage trả typed 503 và không tạo outbox/delete. Ownership + anonymous/BUYER/FARMER regression xanh; full farm 23 và season 18 test xanh, boundary vẫn kín.
8. **[FIXED 2026-08-14, AUD-S0-010] Auth refresh giữ đúng contract và storage provenance.** Interceptor parse `ApiResponse.result`, rotate token hiện hành, giữ user và ghi đúng local/session; record malformed không shadow, 401 clear cả hai, 5xx giữ auth, refresh 401 không recurse. Auth regression 12/12, typecheck/lint/build xanh.
9. **[OPEN - HIGH, AUD-S0-013] Shipping/delivery tin dữ liệu browser.** FE dùng weight/origin/coords giả; marketplace persist fee mặc định riêng, delivery persist fee/weight/orderId do buyer gửi và chưa verify marketplace order owner.
10. **[FIXED 2026-08-14, AUD-S0-002] Internal endpoint trust boundary đã đóng cho single-host Compose.** Boundary script xanh, host TCP 8081–8092 đều đóng, gateway không route internal và full dev health đã xanh. Multi-host/Kubernetes vẫn cần service authentication/mTLS.
11. **[FIXED 2026-08-14, AUD-S0-003] Marketplace legacy trace đã được phân loại public có chủ đích.** Exact matcher, whitelist annotation audit và MockMvc anonymous test đã được thêm; full marketplace 35 test xanh.
12. **[IN FIX - HIGH] `season-service` fallback/config downstream.** `AUD-S0-009` đã fix hai guard expense/inventory. Production diary vẫn mở ở `AUD-S1-002`: sustainability URL mặc định 8088 thay vì 8089 và Compose thiếu env.
13. **[FIXED 2026-08-14, AUD-S3-008] CI matrix đã bao phủ đủ runtime service.** `admin-reporting-service` và `delivery-service` đã được thêm vào database microservice matrix.
14. **[FIXED 2026-08-14, AUD-S0-004..008] Marketplace/public trace/delivery integrity — phạm vi đã xác minh.** Farmer publish, public snapshot schema/visibility và delivery read ownership đã có regression; các trust gap mới được tách thành `AUD-S0-011/013/017`.
15. **[FIXED 2026-08-14, AUD-S1-006] Chroma healthcheck không còn chặn startup.** Probe dùng Bash TCP `/api/v2/healthcheck`; full build/up/wait xanh và gateway health HTTP 200.
16. **[OPEN - MEDIUM, AUD-S2-006] `tempo` đang là MailHog giả danh.** Container “Up” không chứng minh tracing backend tồn tại.
17. **[OPEN - LOW, AUD-S3-007] Tài liệu run có port cũ.** `RUN_GUIDE.md` còn mô tả gateway 8000/frontend 5173, trong khi config hiện tại là 8080/3000.

## Quy tắc làm việc

- Mọi thay đổi liên quan tới security (auth, authorization, public/internal endpoint, JWT, role, ownership) phải tự đối chiếu với mục Known issues ở trên trước khi coi là hoàn tất.
- Không tự ý quét lại toàn repo mỗi lần. Đọc `AGENTS.md` gần nhất, sau đó chỉ mở manifest/config/controller/service/test trực tiếp liên quan; cập nhật file này nếu phát hiện kiến trúc hoặc finding đã đổi.
- Giữ database-per-service và boundary HTTP/event; không tạo dependency Java trực tiếp giữa các service để “tiện dùng chung”.
- Thay đổi sync call phải xem fallback/timeout và semantics fail-open/fail-closed; thay đổi event phải xem outbox, routing key, consumer idempotency và read-model lag.
- Không sửa secrets trong `.env`, Firebase service account hoặc RSA key. Dùng `.env.example`/placeholder khi thêm cấu hình.
- Không chỉnh generated OpenAPI/Orval client bằng tay; sửa source contract rồi generate lại.
- Sau khi fix một finding: chạy test hồi quy tương ứng, đổi `[OPEN]` thành `[FIXED yyyy-mm-dd]` kèm mô tả ngắn/test đã chạy; chỉ xóa khi team chủ động dọn lịch sử.
