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
| S0 | Authorization/ownership/trust boundary, state bypass, food/financial/auth data integrity hoặc public claim sai có thể gây quyết định nguy hiểm | 1 | **BLOCKED** |
| S1 | Hành động chính trên route sống không hoàn tất hoặc không đi xuyên tầng | 5 | Chưa được mở |
| S2 | Mock/hard-code/fallback/swallowed error làm UI trông đúng nhưng không phản ánh backend/DB | 5 | Chưa được mở |
| S3 | UX, tooling, generated-client debt, route/component chết hoặc migration kiến trúc | 7 | Chưa được mở |

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
| AUD-S0-013 | STATIC_CONFIRMED | Shipping fee/weight/order association phải server-authoritative | FE dùng weight/origin/coords giả; marketplace persist fee mặc định 20k; delivery tin fee/weight/orderId từ buyer và không verify order owner; một quote dùng cho mọi seller group | Per-seller quote contract, tamper test, buyer A/order B reject, hai DB cùng fee |
| AUD-S0-014 | FIXED | Không được coi thuốc không xác định là PHI 0 ngày | Lookup miss/PHI reference không hợp lệ trả typed 400 trước delete/save; direct và field-log path dùng chung lookup invariant; rollback DB đã được chứng minh | Targeted 4/4, full season 16/16 xanh; dev query derived `phi_days=0` trả 0 ngày 2026-08-14 |
| AUD-S0-015 | FIXED | Guard xóa variety phải fail-closed khi season lookup unavailable | Internal endpoint và Feign mapping đã khớp; chỉ verified-false được delete, null/outage trả typed 503; H2 giữ row khi referenced/down | Full crop-catalog 12/12, full season 17/17, ADMIN security và Compose boundary xanh ngày 2026-08-14 |
| AUD-S0-016 | FIXED | Guard xóa plot phải fail-closed khi season/task lookup unavailable | Internal aggregate trả cả active season/task; null/outage typed 503; guard/other-owner không ghi outbox hoặc delete | Full farm 23/23, season 18/18, security matrix và Compose boundary xanh ngày 2026-08-14 |
| AUD-S0-017 | FIXED | Certification PHI evidence unavailable không được ghi PASS/tăng score | Discovery/PHI fallback ném unavailable; typed 503 rollback scoring và chặn apply/issue/publication; verified-empty mới PASS, violation FAIL, không có season giữ PENDING | Targeted 10/10 và full farm 13/13 test xanh ngày 2026-08-14; DB dev có 1/2 PHI item PASS là review candidate, không đủ provenance để quy kết outage |

## S1 — Core flow blocked

| ID | Trạng thái | Luồng | Bằng chứng hiện có / tag |
|---|---|---|---|
| AUD-S1-001 | STATIC_CONFIRMED | Admin certification lifecycle | FE gọi list-all/approve endpoint không tồn tại; tạo nonconformity chỉ toast; lỗi tải chuyển sang mock. Bao gồm finding trùng cũ `AUD-S2-005`; tag `fake-data` |
| AUD-S1-002 | STATIC_CONFIRMED | Production diary | season mặc định sustainability URL 8088, runtime thật 8089; Compose thiếu env nên fallback empty che dữ liệu thiếu; tag `silent-fallback` |
| AUD-S1-003 | STATIC_CONFIRMED | Checkout → delivery | Marketplace order commit trước; delivery create lỗi bị catch và checkout vẫn báo thành công; tag `partial-commit`, `false-success` |
| AUD-S1-004 | HYPOTHESIS | Complete task actual dates | Commit gần nhất đã sửa payload/date; phải tái hiện lại, không mở patch từ ví dụ cũ |
| AUD-S1-005 | STATIC_CONFIRMED | Export VietGAP dossier | FE kỳ vọng ZIP/blob; BE trả `ApiResponse<FarmDocumentResponse>` chứa data URI text; tag `contract-mismatch` |
| AUD-S1-006 | FIXED | Compose cold-start | Chroma probe dùng Bash TCP tới `/api/v2/healthcheck`; full build/up/wait xanh và gateway health HTTP 200 theo runtime acceptance ngày 2026-08-14 |

## S2 — Fake data masking

| ID | Trạng thái | Vị trí | Bằng chứng hiện có |
|---|---|---|---|
| AUD-S2-001 | STATIC_CONFIRMED | Dashboard AI harvest | recent logs và expected growth days hard-code nhưng gọi API thật |
| AUD-S2-004 | STATIC_CONFIRMED | AI RAG | Chroma auto-config bị exclude; primary dummy vector store luôn trả empty |
| AUD-S2-006 | RUNTIME_CONFIRMED | Observability/Tempo | Service Compose tên `tempo` thực tế chạy `mailhog/mailhog:latest`; UI/container trông “Up” nhưng không có tracing backend |
| AUD-S2-007 | STATIC_CONFIRMED | AI chat adapter/provenance | Hai hook đã chuyển từ `sendAiChatMessage` sang `aiApi.chat/buyerChat`, nhưng luôn tạo assistant message với sources `[]`; hai regression test cũ đỏ và provenance bị bỏ dù UI vẫn có câu trả lời |
| AUD-S2-008 | STATIC_CONFIRMED | Farmer self-assessment | Route sống cập nhật self-assessment bằng local state, không persistence; reload có thể mất dữ liệu nhưng UI trong phiên trông đã cập nhật |

## S3 — UX / dead code

| ID | Trạng thái | Vị trí | Bằng chứng hiện có |
|---|---|---|---|
| AUD-S3-001 | STATIC_CONFIRMED | Farmer dashboard | Dashboard entities/FDN hooks không được route sống dùng; một số client endpoint không có backend hiện hành |
| AUD-S3-002 | STATIC_CONFIRMED | Season workspace | Soil/water/nutrient component đã có nhưng route/tab bị comment |
| AUD-S3-003 | STATIC_CONFIRMED | Season pages | `SeasonsPage` chứa PHI UI nhưng route dùng `SeasonManagement` khác |
| AUD-S3-004 | STATIC_CONFIRMED | Frontend architecture tooling | `check:fsd` và `check:legacy*` trỏ tới hai script không tồn tại; command gate luôn hỏng nếu chạy |
| AUD-S3-005 | STATIC_CONFIRMED | Delivery generated client debt | Orval config chưa có delivery-service; delivery dùng handwritten shared API. Đây là cleanup/contract tooling, không tự nó là runtime bug |
| AUD-S3-006 | STATIC_CONFIRMED | FSD migration | Legacy folders/import exceptions còn tồn tại; chỉ cleanup sau các luồng reachable và không tăng baseline legacy |
| AUD-S3-007 | STATIC_CONFIRMED | Run documentation | `RUN_GUIDE.md` ghi gateway 8000/frontend 5173, lệch config hiện hành 8080/3000 |
| AUD-S3-008 | FIXED | CI runtime coverage | admin-reporting và delivery đã được thêm vào database microservice matrix |

## Thứ tự xử lý đã chốt

1. **Đóng S0 hiện hành:** `AUD-S0-013`. `AUD-S0-001` đã qua hai cold-start sạch; `AUD-S0-002` đã đóng trong phạm vi Compose, không áp dụng kết luận đó cho multi-host.
2. **S1:** `AUD-S1-001` → `AUD-S1-002` → `AUD-S1-003` → `AUD-S1-005`; tái hiện `AUD-S1-004` song song ở bước chuẩn bị nhưng chỉ mở patch nếu chuyển thành `RUNTIME_CONFIRMED`.
3. **S2:** `AUD-S2-001` → `AUD-S2-004` → `AUD-S2-007` → `AUD-S2-008` → `AUD-S2-006`. `AUD-S2-006` không chặn nghiệp vụ nhưng phải bỏ trạng thái observability giả trước deploy có tracing claim.
4. **S3:** route chết trước, sau đó run docs/tooling/generated-client/FSD cleanup; mỗi thay đổi vẫn phải độc lập và không kéo feature mới từ tài liệu ý tưởng vào.

## Lịch sử reclassify/merge

- `AUD-S2-002` → `AUD-S0-012`: public organic/safety claims giả có tác động cao hơn fake-data thông thường.
- `AUD-S2-003` → `AUD-S0-013`: dữ liệu giả đi vào persisted delivery fee/weight, thuộc financial/data integrity.
- `AUD-S2-005` được gộp vào `AUD-S1-001`: mock là triệu chứng của cùng root cause certification lifecycle bị chặn.
- Hai frontend AI hook test đỏ được gắn `AUD-S2-007`; lần chạy lại trong sandbox hiện bị chặn bởi quyền đọc Vite config, evidence lỗi assertion từ baseline Giai đoạn 1 vẫn được giữ.

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
