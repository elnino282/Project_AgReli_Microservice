# Audit backlog — reachable flows

Nguồn sự thật sống cho audit Giai đoạn 1–5. Severity được chọn theo tác động cao nhất; `STATIC_CONFIRMED` nghĩa là đã chứng minh bằng code path nhưng chưa chạy E2E cô lập. Quyết định phân loại Giai đoạn 2 được chốt ngày 2026-08-14.

## Trạng thái và gate

- `HYPOTHESIS`: cần tái hiện hoặc trace thêm.
- `STATIC_CONFIRMED`: code path xác nhận invariant bị vi phạm; cần regression test trước fix.
- `RUNTIME_CONFIRMED`: tái hiện trên stack/test cô lập.
- `IN_FIX`: đang có patch độc lập.
- `FIXED`: test hồi quy và acceptance tương ứng đã xanh.
- `NOT_REPRODUCIBLE`: có evidence chứng minh giả thuyết cũ không còn đúng.

Không chuyển sang S1 khi còn S0 ở trạng thái khác `FIXED`/`NOT_REPRODUCIBLE`; áp dụng tương tự cho các nhóm sau.

## Severity và gate hiện tại

| Nhóm | Tiêu chí quyết định | Finding chưa đóng | Gate |
|---|---|---:|---|
| S0 | Authorization/ownership/trust boundary, state bypass, food/financial/auth data integrity hoặc public claim sai có thể gây quyết định nguy hiểm | 0 | **CLOSED** |
| S1 | Hành động chính trên route sống không hoàn tất hoặc không đi xuyên tầng | 0 | **CLOSED** |
| S2 | Mock/hard-code/fallback/swallowed error làm UI trông đúng nhưng không phản ánh backend/DB | 0 | **CLOSED** |
| S3 | UX, tooling, generated-client debt, route/component chết hoặc migration kiến trúc | 0 | **CLOSED** |

`FIXED` không tự động đồng nghĩa E2E toàn luồng đã pass; evidence regression/acceptance của từng finding vẫn phải được giữ. Với finding có nhiều tính chất, chỉ giữ một mã ở severity cao nhất và dùng tag phụ trong cột evidence.

## S0 — Security / Data Integrity

| ID | Trạng thái | Invariant bị ảnh hưởng | Bằng chứng hiện có | Test bắt buộc trước khi fix |
|---|---|---|---|---|
| AUD-S0-001 | FIXED | Service chỉ start sau khi DB bootstrap và dependency bắt buộc ready | Hai cold-start audit từ volume mới đều hoàn tất khoảng 194 giây; 22 container chạy, 12 service healthy, MySQL authenticated 11-schema probe healthy/failing streak 0, gateway HTTP 200/`UP`, không có startup error match | Compose config + hai cold-start sạch lặp lại ngày 2026-08-14 |
| AUD-S0-002 | FIXED | Internal API không được gọi trực tiếp bởi client không tin cậy trong single-host Compose | Boundary script xanh; host TCP 8081–8092 đều đóng; gateway không route internal; full dev stack health/internal calls đã xanh | Runtime direct-port matrix + gateway route/config |
| AUD-S0-003 | FIXED | Mọi marketplace endpoint phải được phân loại public hoặc role-protected có chủ đích | Alias legacy được phân loại public cùng canonical route | MockMvc anonymous + annotation audit xanh |
| AUD-S0-004 | FIXED | Farmer không thể tự publish listing, mọi publish phải qua compliance gate | Farmer transition allow-list; `ACTIVE/PUBLISHED` đều qua compliance | Backend transition/compliance + frontend transition xanh |
| AUD-S0-005 | FIXED | Public trace không được tạo claim chứng nhận khi backend không có dữ liệu | Null/pending/expired hiển thị chưa xác minh; không còn fallback claim | Predicate test null/pending/expired/published xanh |
| AUD-S0-006 | FIXED | PHI snapshot public phải deserialize đúng schema đã lưu | Producer/consumer cùng `PHISafetyInfo`; null UI là unknown | Serialization contract tests xanh |
| AUD-S0-007 | FIXED | Draft/unpublished product không được public lookup/trace bằng slug hoặc ID | Public detail/trace chỉ query `ACTIVE/PUBLISHED` | Service lookup/trace regression xanh |
| AUD-S0-008 | FIXED | Delivery order chỉ được đọc/sửa bởi đúng actor/role | Buyer ownership từ JWT; admin-only list-all/status; legacy null owner fail-closed | 9 delivery tests xanh |
| AUD-S0-009 | FIXED | Guard xóa season/harvest inventory phải fail-closed khi downstream lỗi | Hai fallback ném typed 503 thay vì `false` | 12 season tests xanh |
| AUD-S0-010 | FIXED | Refresh phải giữ storage provenance/user và parse đúng identity contract | Parse `result`, token mới tiếp tục làm refresh credential, giữ user/source storage; malformed/401/5xx và concurrent callers có semantics rõ; refresh 401 không recurse | Interceptor 8/8, auth regression 12/12, typecheck/lint/build xanh ngày 2026-08-14 |
| AUD-S0-011 | FIXED | PHI phải độc lập certification claim và fail-closed khi season unavailable | Đã bỏ early return claim null/`NONE`; PHI fallback ném unavailable thay vì empty; violation/outage không lưu sellable transition hoặc safe snapshot | Targeted 17/17 và full marketplace 40/40 test xanh ngày 2026-08-14; runtime journey recheck ở Giai đoạn 5 |
| AUD-S0-012 | FIXED | Public farm store không được tạo claim hữu cơ/an toàn/nước sạch khi không có dữ liệu xác minh | Đã gỡ standards/log prototype khỏi route sống; API summary không còn bị presentation bổ sung claim, tab log hiển thị verified-empty trung tính | Component 5/5, typecheck, lint 0 error và production build xanh ngày 2026-08-14 |
| AUD-S0-013 | FIXED | Shipping fee/weight/order association phải server-authoritative | ShippingQuoteService issue/validate/consume với TTL, identity, per-seller group check; DeliveryService lấy fee/weight từ quote server-side, không tin request; ownership buyer/order/quote verified qua MarketplaceOrderClient; fee mismatch marketplace↔quote reject; V12 additive migration | Delivery 17/17 (ShippingQuoteServiceTest 3, DeliveryServiceAuthorizationTest 3, DeliveryControllerSecurityTest 8, ShippingFeeCalculatorTest 3) + marketplace 48/48 (MarketplaceShippingQuoteServiceTest 2, MarketplaceAuthoritativeCheckoutTest 1, full suite) xanh ngày 2026-08-20 |
| AUD-S0-014 | FIXED | Không được coi thuốc không xác định là PHI 0 ngày | Lookup miss/PHI reference không hợp lệ trả typed 400 trước delete/save; direct và field-log path dùng chung lookup invariant; rollback DB đã được chứng minh | Targeted 4/4, full season 16/16 xanh; dev query derived `phi_days=0` trả 0 ngày 2026-08-14 |
| AUD-S0-015 | FIXED | Guard xóa variety phải fail-closed khi season lookup unavailable | Internal endpoint và Feign mapping đã khớp; chỉ verified-false được delete, null/outage trả typed 503; H2 giữ row khi referenced/down | Full crop-catalog 12/12, full season 17/17, ADMIN security và Compose boundary xanh ngày 2026-08-14 |
| AUD-S0-016 | FIXED | Guard xóa plot phải fail-closed khi season/task lookup unavailable | Internal aggregate trả cả active season/task; null/outage typed 503; guard/other-owner không ghi outbox hoặc delete | Full farm 23/23, season 18/18, security matrix và Compose boundary xanh ngày 2026-08-14 |
| AUD-S0-017 | FIXED | Certification PHI evidence unavailable không được ghi PASS/tăng score | Discovery/PHI fallback ném unavailable; typed 503 rollback scoring và chặn apply/issue/publication; verified-empty mới PASS, violation FAIL, không có season giữ PENDING | Targeted 10/10 và full farm 13/13 test xanh ngày 2026-08-14; DB dev có 1/2 PHI item PASS là review candidate, không đủ provenance để quy kết outage |

## S1 — Core flow blocked

| ID | Trạng thái | Luồng | Bằng chứng hiện có / tag |
|---|---|---|---|
| AUD-S1-001 | FIXED | Admin certification lifecycle | List ADMIN-only enrich persisted farm/standard/record/nonconformity; FE bỏ mock và dùng state machine `SCHEDULED/IN_PROGRESS/PASSED/FAILED` cho start/complete/issue | Farm 27/27, security 3/3, UI 1/1, typecheck/lint/build xanh ngày 2026-08-21 |
| AUD-S1-002 | FIXED | Production diary | Default sustainability 8089 và Compose truyền URL rõ; không còn gọi nhầm incident 8088 | Compose config + season runtime healthy ngày 2026-08-21 |
| AUD-S1-003 | FIXED | Checkout → delivery | Delivery consume durable `order.created`, provision/idempotency trong transaction; browser không orchestrate bước hai; serialization event fail transaction; quote dùng validity tại order acceptance | Delivery 21/21, marketplace 48/48, FE 5/5 + build; Flyway V13 và Rabbit queue 1 consumer runtime xanh ngày 2026-08-21 |
| AUD-S1-004 | NOT_REPRODUCIBLE | Complete task actual dates | StartTaskRequest/TaskDoneRequest tách riêng; start sets actualStartDate, done sets actualEndDate và validate endDate>=startDate; mapToResponse trả cả hai field đúng. 3 unit test xanh (start explicit date, done preserves start, invalid date range reject) ngày 2026-08-20 |
| AUD-S1-005 | FIXED | Export VietGAP dossier | FE dùng typed `FarmDocumentResponse`, tải persisted `fileUrl` với định dạng text hiện hành và fail rõ khi URL thiếu/sai; không còn serialize JSON thành ZIP giả | API contract 1/1 + route UI 2/2, S1 frontend regression 8/8, typecheck/lint/build xanh ngày 2026-08-21 |
| AUD-S1-006 | FIXED | Compose cold-start | Chroma probe dùng Bash TCP tới `/api/v2/healthcheck`; full build/up/wait xanh và gateway health HTTP 200 theo runtime acceptance ngày 2026-08-14 |

## S2 — Fake data masking

| ID | Trạng thái | Vị trí | Bằng chứng hiện có |
|---|---|---|---|
| AUD-S2-001 | FIXED | Dashboard AI harvest | Payload dùng ngày season persisted và farming logs hoàn thành của đúng season; thiếu/ngày sai hoặc tải log lỗi đều chặn AI. Component regression 1/1 xanh ngày 2026-08-21 |
| AUD-S2-004 | FIXED | AI RAG | Bỏ dummy vector/zero embedding; Spring AI 1.0.1 khởi tạo Chroma v2 collection bằng Gemini embedding thật và fail-closed khi thiếu key. AI full suite 14/14, service/collection runtime healthy ngày 2026-08-21 |
| AUD-S2-006 | FIXED | Observability/Tempo | Compose dùng Tempo 2.7.2 single-binary thật, OTLP 4317/4318, readiness/query 3200, storage volume riêng và Grafana datasource provisioned. Readiness 200 + synthetic OTLP trace query 200 ngày 2026-08-21 |
| AUD-S2-007 | FIXED | AI chat adapter/provenance | Backend trả metadata từ đúng document RAG đã dùng; OpenAPI/Orval và farmer/buyer hook giữ `sources`, fallback không bịa nguồn. Backend regression nằm trong AI 14/14; hook 3/3 xanh ngày 2026-08-21 |
| AUD-S2-008 | FIXED | Farmer self-assessment | Route tải checklist persisted, chỉ cho sửa item `MANUAL`, lưu status/notes và fetch lại server truth trước khi báo thành công; reload hydrate dữ liệu thật. Component regression 1/1 xanh ngày 2026-08-21 |
| AUD-S2-009 | FIXED | Employee progress evidence | Route sống không còn biến file local thành URL `dummyimage.com` rồi toast upload thành công giả. Do backend hiện chỉ nhận `evidenceUrl`, UI yêu cầu URL HTTP(S) persisted thật và validate trước mutation; helper regression 2/2 xanh ngày 2026-08-27 |

## S3 — UX / dead code

| ID | Trạng thái | Vị trí | Bằng chứng hiện có |
|---|---|---|---|
| AUD-S3-001 | FIXED | Farmer dashboard | Route sống render farm-level FDN từ sustainability API, có loading/error/missing-input rõ và link tới workspace; component + FDN regression và runtime HTTP 200 xanh |
| AUD-S3-002 | FIXED | Season workspace/read-model | Ba route/tab soil/water/nutrient đã mở; additive outbox backfill đưa seed farm/plot/season vào sustainability read-model, ba runtime GET đều HTTP 200 |
| AUD-S3-003 | FIXED | Season pages | Duplicate `SeasonsPage` không reachable đã xóa; route tiếp tục dùng `SeasonManagement`, không còn reference |
| AUD-S3-004 | FIXED | Frontend architecture tooling | `check:fsd` và `check:legacy*` có script thật; FSD baseline khóa 28 exception cũ/0 mới, legacy baseline 0/0 |
| AUD-S3-005 | FIXED | Delivery generated client debt | Orval config đã có delivery-service 8092 và snapshot/client generated; handwritten adapter chỉ còn ở boundary tương thích |
| AUD-S3-006 | FIXED | FSD legacy boundary | 76 import chuyển sang shared canonical; 56 file legacy root xóa, `src/components|hooks|services` và legacy import đều bằng 0 |
| AUD-S3-007 | FIXED | Run documentation | Guide/Vite thống nhất 3000/8080, đủ 12 service/readiness và có `npm run demo:smoke` qua Vite proxy |
| AUD-S3-008 | FIXED | CI runtime coverage | admin-reporting và delivery đã được thêm vào database microservice matrix |
| AUD-S3-009 | FIXED | Frontend local port drift | Runtime Playwright tái hiện `.env.development` mở Vite ở 5173 trong khi guide/smoke dùng 3000; đã đồng bộ `PORT=3000` và khóa web server acceptance tại localhost:3000 |
| AUD-S3-010 | FIXED | Employee task mất context lô | API trả `plotName/plotArea/estimatedCompletionDate` nhưng `TaskSchema` strip field; entity contract đã giữ đủ field, unit 1/1 và browser task→reload xanh |

## Thứ tự xử lý đã chốt

1. **S0 đã đóng (17/17 FIXED).** `AUD-S0-013` đóng ngày 2026-08-20 sau khi xác minh quote system server-authoritative + regression delivery 17/17 và marketplace 48/48 xanh. `AUD-S0-001` đã qua hai cold-start sạch; `AUD-S0-002` đã đóng trong phạm vi Compose, không áp dụng kết luận đó cho multi-host.
2. **S1 đã đóng.** `AUD-S1-001/002/003/005/006` FIXED; `AUD-S1-004` NOT_REPRODUCIBLE bằng regression actual dates. Gate S2 được mở ngày 2026-08-21.
3. **S2 đã đóng (6/6 FIXED).** Dữ liệu dự đoán thu hoạch, RAG/provenance, self-assessment, tracing và Employee evidence đều dùng nguồn thật hoặc fail rõ; finding runtime bổ sung `AUD-S2-009` đóng ngày 2026-08-27.
4. **S3 đã đóng (8/8 FIXED).** Route chết đã được xóa/wire có kiểm chứng; tooling, legacy boundary và run guide đã có gate. Runtime demo smoke qua Vite proxy pass đủ bốn persona và các route chính, không kéo feature mới từ tài liệu ý tưởng vào.

## Lịch sử reclassify/merge

- `AUD-S2-002` → `AUD-S0-012`: public organic/safety claims giả có tác động cao hơn fake-data thông thường.
- `AUD-S2-003` → `AUD-S0-013`: dữ liệu giả đi vào persisted delivery fee/weight, thuộc financial/data integrity.
- `AUD-S2-005` được gộp vào `AUD-S1-001`: mock là triệu chứng của cùng root cause certification lifecycle bị chặn.
- Hai frontend AI hook test đỏ được gắn `AUD-S2-007`; contract đã được sửa và regression farmer/buyer hiện xanh, nên blocker quyền đọc Vite config cũ không còn áp dụng.

## Giai đoạn 3 — kết quả pattern scan S0

Quét có mục tiêu đủ 12 service cho Feign fallback `false`/empty/null, catch swallow quanh mutation, PHI/certification decision và monetary fields lấy từ request. Chỉ promote khi trace được tới invariant ghi/xóa/public claim; fallback read-only không tự động thành S0.

- PHI/food safety: mở rộng `AUD-S0-011`, thêm `AUD-S0-014` và `AUD-S0-017`.
- Destructive cross-schema guard: thêm `AUD-S0-015` (variety) và `AUD-S0-016` (plot); cả ba lookup URL cần thiết hiện không có controller mapping ở season-service.
- Financial/association trust: mở rộng `AUD-S0-013` từ mock FE thành mismatch marketplace/delivery và missing marketplace-order ownership proof.
- Auth/public UI: root cause/contract được chốt ở `AUD-S0-010` và `AUD-S0-012`.
- Các fallback read-model/dashboard/production-diary không quyết định mutation vẫn giữ ở S1/S2 hiện có; không nâng severity chỉ vì grep match.

Hồ sơ contract trước fix nằm ở `docs/audit/patches/AUD-S0-010.md` đến `AUD-S0-017.md`. Không mở patch Giai đoạn 4 nếu test đỏ/acceptance trong hồ sơ tương ứng chưa được dựng.

## Product backlog ngoài audit fix

- Kubernetes/Helm, PostgreSQL migration và horizontal autoscaling.
- Dashboard FDN mới nếu không phục vụ sửa route hiện hành.
- Chu kỳ báo cáo nhân công 24 giờ nếu chưa có acceptance rule sản phẩm chính thức.
- Xây workflow image diagnosis tự động tạo disease/treatment nếu cần contract mới ngoài route hiện hành.

## Evidence log

| Ngày | Phạm vi | Kết quả |
|---|---|---|
| 2026-08-14 | Static Discovery trên `main` | Seed các finding trên; chưa chạy full isolated-stack E2E |
| 2026-08-14 | Baseline local | Backend clean: 11/13 module xanh; marketplace tái hiện annotation gap; admin-reporting bị chặn do Docker daemon; frontend typecheck/lint/build xanh, 266/268 test xanh (2 AI hook test đỏ) |
| 2026-08-14 | S0 regression | Marketplace 35, season 12, delivery 9 test xanh; frontend transition/public-trace tests và typecheck xanh; Compose config/boundary xanh; cold-start còn chờ Docker daemon |
| 2026-08-14 | Isolated Compose runtime | Build từ source đủ 12 service + gateway xanh. MySQL authenticated schema probe healthy và identity Flyway v1–v2 chạy trên volume audit mới. `up --wait` bị chặn do Chroma healthcheck thiếu `curl`; diagnostic start đồng thời với stack dev làm Docker Desktop vượt giới hạn tài nguyên trước khi đủ health evidence |
| 2026-08-14 | Admin reporting baseline | 5 suite không cần container: 19 test xanh; smoke/Flyway Testcontainers còn chờ daemon ổn định |
| 2026-08-14 | Chroma revalidation | `docker compose up -d --build` và `up -d --wait --wait-timeout 300` exit 0; dependency health và gateway HTTP 200, `AUD-S1-006` đóng FIXED |
| 2026-08-14 | Giai đoạn 2 severity review | Nâng public farm claims + persisted shipping mock lên S0; thêm auth refresh/PHI no-claim vào S0; merge admin mock vào S1; queue hiện bị chặn bởi 6 S0 chưa đóng |
| 2026-08-14 | Giai đoạn 3 S0 root-cause | Hoàn tất contract `AUD-S0-010..017`; mở thêm zero-day PHI, variety/plot destructive guard và certification PHI fail-open. Đóng `AUD-S0-002` bằng boundary + host TCP matrix; `AUD-S0-001` vẫn thiếu cold-start lặp vì Docker Desktop API 500 khi hai stack JVM chạy đồng thời. Queue còn 9 S0 chưa đóng |
| 2026-08-14 | Giai đoạn 4 — `AUD-S0-001` acceptance | Restart Docker Desktop theo ủy quyền, stop dev stack không xóa volume, dọn đúng project audit rồi cold-start hai lần từ volume mới. Cả hai lần `up --wait` exit 0 trong khoảng 194 giây; 22 container chạy, 12 service healthy, gateway HTTP 200/`UP`, MySQL healthy và không có mẫu lỗi startup. Finding đóng `FIXED`; còn 8 S0. |
| 2026-08-14 | Giai đoạn 4 — `AUD-S0-011` | Regression đỏ xác nhận claim `NONE/null` bỏ qua PHI và fallback đổi outage thành verified-empty. Bỏ early return, đổi riêng PHI fallback sang exception fail-closed; khóa không persist `ACTIVE/PUBLISHED` khi gate từ chối. Targeted 17 và full marketplace 40 test xanh; còn 7 S0. |
| 2026-08-14 | Giai đoạn 4 — `AUD-S0-014` | Regression đỏ xác nhận unknown field-log sinh zero-day và direct path trả exception không typed. Dùng chung lookup, trả `ERR_PESTICIDE_PHI_NOT_FOUND` 400 trước mutation; H2 integration chứng minh rollback hai bảng. Targeted 4, full season 16 test xanh; audit query dev không có record lịch sử bị ảnh hưởng; còn 6 S0. |
| 2026-08-14 | Giai đoạn 4 — `AUD-S0-017` | Fallback discovery/PHI không còn trả empty; scoring trả typed 503 khi evidence unavailable và revalidate trước apply/issue/certificate publication. Verified-empty PASS, violation FAIL, không season giữ PENDING. Targeted 10 và full farm 13 test xanh; DB dev có 1/2 PHI item PASS cần review thủ công do thiếu provenance; còn 5 S0. |
| 2026-08-14 | Giai đoạn 4 — `AUD-S0-012` | Test đỏ chứng minh route anonymous luôn render standards/log prototype dù API chỉ trả farm summary. Gỡ hai nguồn mock khỏi route sống; tab log dùng empty state không claim. Component 5/5, typecheck, lint 0 error (531 warning debt cũ) và production build xanh; còn 4 S0. |
| 2026-08-14 | Giai đoạn 4 — `AUD-S0-015` | Test đỏ xác nhận thiếu endpoint, fallback false và catch/null cho phép delete. Thêm internal season contract, Feign mapping và typed 503 fail-closed; H2 xác nhận referenced/outage giữ row, verified-false mới xóa. Full crop-catalog 12, season 17 test và boundary script xanh; còn 3 S0. |
| 2026-08-14 | Giai đoạn 4 — `AUD-S0-016` | Test đỏ xác nhận aggregate endpoint vắng và fallback plot không có contract fail-closed. Thay hai public URL bằng một internal aggregate; null/outage typed 503, active refs/other-owner không ghi outbox/delete. Full farm 23, season 18 test và boundary script xanh; còn 2 S0. |
| 2026-08-14 | Giai đoạn 4 — `AUD-S0-010` | Test đỏ xác nhận interceptor chưa export/testable và contract refresh sai. Parse envelope thật, giữ user + local/session provenance, loại malformed shadow, single-flight; 401 clear, 5xx preserve, refresh-401 không recurse. Interceptor 8, auth regression 12 test, typecheck/lint/build xanh; còn 1 S0. |
| 2026-08-20 | AUD-S0-013 documentation close | Xác minh code fix đã có: ShippingQuoteService authoritative quote, DeliveryService ownership check, V12 migration. Regression delivery 17/17 + marketplace 48/48 xanh. S0 gate closed (17/17 FIXED), S1 gate mở. |
| 2026-08-21 | S1 patch queue 001–003 | Chốt certification theo state machine thật, sửa sustainability routing và chuyển delivery provisioning từ browser sang transactional Rabbit consumer. S1 còn `AUD-S1-005`. |
| 2026-08-21 | Giai đoạn 4 — `AUD-S1-005` + S1 gate | Test đỏ chứng minh route export bỏ qua persisted document và tạo ZIP giả từ object JSON. FE dùng typed response + `fileUrl`, tên `.txt` đúng MIME hiện hành và fail rõ khi URL thiếu. API contract 1, UI 2, targeted S1 FE 8, farm 27, season 21, delivery 21, marketplace 49 test cùng typecheck/lint/build xanh. S1 closed; S2 gate mở. |
| 2026-08-21 | Giai đoạn 4 — S2 gate | Đóng `AUD-S2-001/004/006/007/008`: dashboard AI dùng season/log thật; RAG dùng Gemini embedding + Chroma v2 và trả provenance; self-assessment persist/reload server truth; Tempo 2.7.2 nhận và query synthetic OTLP trace. AI 14/14, frontend S2 5/5, full frontend regression, typecheck/lint/build, Compose config, 22 container running, gateway `UP` và Tempo readiness 200 đều xanh. S2 closed; S3 gate mở. |
| 2026-08-21 | Giai đoạn 4 — S3 gate | Đóng `AUD-S3-001/002/003/004/006/007`: dashboard FDN và ba workspace route đã reachable; outbox backfill sửa read-model seed; duplicate page và 56 legacy file được xóa; FSD/legacy gates và run guide/smoke được khôi phục. Farm 27, season 21, sustainability 14, FDN 38, full frontend 294 test; typecheck/lint/build xanh. `LOCAL_DEMO_SMOKE=PASS`, 22 container running, gateway `UP`; S3 closed 8/8. |
| 2026-08-27 | Giai đoạn 5 — portal read-only acceptance | Chromium thật qua localhost:3000, không mock network: Employee task/progress/payroll, Admin dashboard/certification/marketplace, Buyer order/detail, reload và role isolation đều xanh 8/8. Runtime phát hiện và đóng `AUD-S3-009/010`; mutation acceptance vẫn mở và chỉ chạy trên stack audit cô lập. |
| 2026-08-27 | Giai đoạn 5 — Employee evidence | Static/runtime-route trace phát hiện file input gán cứng `dummyimage.com` và toast giả. Backend chỉ có `evidenceUrl`, chưa có upload contract; UI đổi sang URL HTTP(S) persisted, validate/fail rõ và helper regression 2/2 xanh. Đóng `AUD-S2-009`; upload trực tiếp cần patch contract riêng. |
