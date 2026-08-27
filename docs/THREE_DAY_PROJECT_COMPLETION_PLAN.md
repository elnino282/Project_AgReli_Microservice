# AgReli — Kế hoạch hoàn thiện project trong 3 ngày

**Ngày lập:** 2026-08-25  
**Giả định hạn báo cáo:** 2026-08-28; code freeze muộn nhất cuối ngày 2026-08-27. Nếu giờ nộp thực tế sớm hơn, giữ nguyên thứ tự công việc và rút ngắn từ cuối kế hoạch lên.  
**Nguồn quyết định:** [`DIGITAL_MATURITY_DECISION_CHECKLIST.md`](DIGITAL_MATURITY_DECISION_CHECKLIST.md)  
**Mô hình nguồn lực:** một người chịu trách nhiệm sản phẩm/kỹ thuật làm việc cùng Codex; không giả định có thêm team QA hoặc đối tác bên ngoài trong ba ngày.

## 1. Quyết định điều hành

Trong ba ngày, không thể chứng minh trung thực mức 4,7–5,0 vì mức đó cần pilot, dữ liệu vận hành thật và tích hợp auditor/lab/logistics. Mục tiêu tốt nhất có thể đạt mà vẫn bảo vệ uy tín báo cáo là:

- **Mục tiêu phát hành:** bản demo/release khả tín khoảng **4,0–4,2/5** theo phạm vi đã công bố.
- **Mục tiêu kỹ thuật:** đóng G0 “Truthful UI”, bảo toàn G1/G2 đã có và nâng một phần G3 về bằng chứng/completeness.
- **Mục tiêu báo cáo:** chứng minh rõ “đã hoạt động”, “đã ẩn khỏi release” và “roadmap sau báo cáo”; không tính endpoint/bảng chưa reachable là tính năng hoàn tất.

Ba nguyên tắc không được phá:

1. Không thêm feature lớn hoặc migration mới nếu không trực tiếp đóng một lỗi trung thực/an toàn.
2. Một luồng chưa khép kín phải được **ẩn/redirect và ghi backlog**, không để UI tạo cảm giác đã hoạt động.
3. Từ 24 giờ cuối chỉ sửa regression của phạm vi đã chốt; không nhận thêm scope.

## 2. Review checklist và cut-line 3 ngày

### 2.1 Phải hoàn thành trước báo cáo

| Work package | Checklist nguồn | Outcome tối thiểu | Lý do chọn | Budget |
|---|---|---|---|---:|
| **WP1 — Public trace trung thực** | T-01, T-05 | Route trace marketplace dùng API thật hoặc redirect sang `/trace/:slug`; xóa đường sinh claim/timeline mẫu khỏi route sống | Sửa nhanh, tác động trực tiếp uy tín truy xuất | 1–2 giờ |
| **WP2 — Gỡ admin document giả** | T-02, T-05 | Bỏ route/menu mock hoặc redirect về `cert-audits`/document read-model thật; API lỗi không có fallback mock/local verify | Tránh admin “duyệt thành công” không persist | 1–2 giờ |
| **WP3 — Nghiệm thu task thật** | T-03, T-06, F-02 | `TaskProgressReportsPanel` dùng `useApproveTask/useRejectTask` hiện có, invalidate/refetch và chỉ toast sau thành công | Endpoint và hooks đã có nên giá trị/effort rất tốt | 2–4 giờ |
| **WP4 — Ẩn cam kết recurring giả** | T-04, M-04 | Gỡ lựa chọn weekly/monthly và state không được gửi khỏi checkout; luồng one-time giữ nguyên | Sửa nhỏ, loại rủi ro misleading | ≤1 giờ |
| **WP5 — Training compliance đúng** | C-01 | Checklist chỉ PASS theo record đào tạo hợp lệ; user có list rỗng không được PASS; có unit test coverage/expiry/evidence | Control VietGAP, rủi ro nghiệp vụ cao | 3–5 giờ |
| **WP6 — Production diary không im lặng thiếu nguồn** | C-03, C-04 | Trong release 3 ngày: lỗi nguồn bắt buộc trả typed failure rõ thay vì silently trả diary thiếu; dossier không báo thành công khi diary không xác minh được | Cách fail-explicit ít đổi contract hơn thiết kế completeness v2 | 3–5 giờ |
| **WP7 — Route truth audit có giới hạn** | T-05, T-06 | Rà các route nằm trong demo script; action local-only phải nối API hoặc ẩn; lập danh sách route excluded | Không đủ thời gian sửa toàn bộ prototype trong repo | 2–3 giờ |
| **WP8 — Verification & evidence** | S-01..03, C-05, H-01..02, V-01, M-01..02, O-05 | Test, local smoke, manual journey và evidence report; không chỉ dựa vào code tồn tại | Điều kiện để bảo vệ kết luận báo cáo | 6–8 giờ |

Tổng budget triển khai dự kiến: **18–26 giờ tập trung**, phần còn lại của ba ngày dành cho review, môi trường, regression và báo cáo.

### 2.2 Chỉ làm nếu toàn bộ work package bắt buộc đã xanh

| Stretch item | Checklist | Điều kiện bắt đầu | Timebox |
|---|---|---|---:|
| Typed authentication error cho sustainability `CurrentUserService` | S-05 | WP1–WP6 xanh, còn ít nhất 4 giờ trước code freeze | 2 giờ |
| Test UI task approval/rejection chuyên biệt | T-03 | Mutation đã nối và frontend targeted test xanh | 1–2 giờ |
| Hiển thị trạng thái diary unavailable thân thiện | C-03 | Backend typed error đã ổn định | 1–2 giờ |
| Ghi decision metadata tối thiểu trong log certification | C-06 | Không cần migration và không đổi public contract | 1–2 giờ |

Stretch item không được phép đẩy lùi full regression hoặc local smoke.

### 2.3 Đưa ra khỏi scope báo cáo hiện tại

Các mục sau vẫn giữ trong roadmap nhưng **không implement trong ba ngày**:

- F-01, F-03..08: evidence image mới, auto-log, seed lot, QR, offline-lite.
- H-03..07: genealogy endpoint mới, quarantine/recall, cold-chain capture mới.
- V-02..07: role auditor/approver đầy đủ, scheduler, lab, signature/checksum.
- M-03, M-05, M-07: pre-order end-to-end, batching và mở rộng fulfillment.
- Toàn bộ P2/P3, trừ verification bắt buộc đã liệt kê trong WP8.

Không xóa code nền đã có. Route chưa hoàn thiện được ẩn hoặc đánh dấu outside release để sau báo cáo có thể tiếp tục mà không phải xây lại.

## 3. Thứ tự thực thi chi tiết

### Ngày 1 — 2026-08-25: Đóng G0 “Truthful UI”

**Mục tiêu ngày:** không còn route demo cốt lõi hiển thị claim hoặc success không được server xác nhận.

### Block 1 — Chốt scope và baseline

- [x] Ghi lại `git status`; không đụng thay đổi không liên quan.
- [x] Chốt danh sách route demo canonical cho bốn persona.
- [x] Chạy targeted baseline hiện có cho frontend liên quan, ghi rõ test đỏ sẵn có nếu có.
- [x] Tạo evidence log, ghi commit/hash, thời gian và command.

**Stop condition:** nếu baseline frontend không build/typecheck do lỗi có trước, timebox điều tra 60 phút; sau đó ghi blocker và chỉ sửa khi lỗi nằm trong demo scope.

### Block 2 — WP1 và WP2

- [x] Redirect/wire `ProductTraceabilityPage` sang public trace thật.
- [x] Gỡ `ProductTraceabilityView` mock khỏi route sống; không cần xóa asset/component nếu còn dùng cho prototype ngoài release.
- [x] Redirect/ẩn `AdminFarmDocumentsPage` mock sang luồng `AdminCertAuditsPage` hoặc admin document read-model thật.
- [x] Thêm route/component regression test: không còn render farm/certification claim mẫu khi API unavailable.

**Acceptance:** anonymous public trace dùng response backend; admin document route không sinh dữ liệu mẫu hoặc local-only verify/reject.

### Block 3 — WP3 và WP4

- [x] Tái sử dụng `useApproveTask`/`useRejectTask`; không tạo Axios/API song song.
- [x] Mutation success invalidate/refetch progress log, task và payroll query liên quan.
- [x] Mutation error giữ dialog/context và hiển thị lỗi; không toast success.
- [x] Gỡ UI/state weekly/monthly khỏi checkout; one-time order payload không đổi.

**Acceptance:** reload sau approve/reject vẫn thấy server truth; checkout không còn hứa tự tạo đơn định kỳ.

### Gate cuối ngày 1

Chạy:

```powershell
cd agricultural-crop-management-frontend
npm run typecheck
npm run lint
npm run test -- --run <cac-test-lien-quan>
npm run build
```

- [x] Không có lỗi typecheck/lint/build mới.
- [x] WP1–WP4 có test hoặc manual evidence rõ.
- [ ] Nếu một WP chưa ổn định sau timebox, rollback phần chưa hoàn chỉnh và chọn phương án ẩn/redirect đơn giản hơn.

### Ngày 2 — 2026-08-26: Đóng rule compliance và fail-explicit

**Mục tiêu ngày:** không cấp PASS hoặc xuất hồ sơ dựa trên dữ liệu thiếu mà hệ thống không nói rõ.

### Block 1 — WP5 Training compliance

- [x] Định nghĩa record hợp lệ: đúng chương trình/category bắt buộc, có ngày đào tạo, chưa hết `certifiedUntil`, evidence theo yêu cầu.
- [x] Tính coverage trên toàn bộ thành viên thuộc mùa vụ/đội; không dùng `Map.isEmpty()` làm điều kiện PASS.
- [x] Không đồng nhất cờ legacy `isTrained` với evidence certification.
- [x] Thêm test tối thiểu:
  - [x] Có thành viên nhưng list record rỗng → không PASS.
  - [x] Một phần thành viên hợp lệ → không PASS nếu ngưỡng 100%.
  - [x] Record hết hạn → không PASS.
  - [x] Tất cả thành viên có record hợp lệ → PASS.
  - [x] Downstream unavailable → không mutate PASS.

**Quyết định scope:** dùng ngưỡng cố định 100% cho release; cấu hình ngưỡng động đưa vào roadmap.

### Block 2 — WP6 Production diary/dossier

- [x] Thay silent catch bằng typed unavailable/error path có log/correlation.
- [x] Với API diary hiện tại, ưu tiên fail-explicit để tránh đổi schema xuyên OpenAPI trong ba ngày.
- [x] Export dossier không persist document hoặc toast success khi diary bắt buộc unavailable.
- [x] Thêm test rollback/no-persist cho dossier và test diary source failure.

**Quyết định kiến trúc sau deadline:** response v2 sẽ bổ sung `completenessStatus`, `missingSources`, `generatedAt` và cho phép xem partial diary; không nhét thiết kế v2 vào release gấp.

### Block 3 — WP7 Route truth audit

Chỉ audit route có trong demo/report:

- Farmer: dashboard, farms/certification, season workspace, task, field log, harvest, inventory.
- Employee: tasks, progress, payroll.
- Buyer/Public: marketplace, product, public trace, cart, checkout, order.
- Admin: dashboard, certification audit, users, reports.

Cho mỗi action ghi một trong ba kết quả:

- `VERIFIED_REAL`: API + persistence + reload.
- `HIDDEN_FROM_RELEASE`: route/action bị ẩn hoặc redirect.
- `ROADMAP_ONLY`: tồn tại code nền nhưng không claim trong báo cáo.

### Gate cuối ngày 2

```powershell
cd farm-service
mvn -Dtest=CertificationScoringServiceTest,CertificationServiceTest test
mvn test

cd ../season-service
mvn test

cd ../agricultural-crop-management-frontend
npm run typecheck
npm run lint
npm run test -- --run
npm run build
```

- [x] Farm full suite xanh.
- [x] Season full suite xanh.
- [x] Frontend full suite/typecheck/lint/build xanh.
- [x] Không có migration hoặc contract change chưa generate/test.
- [x] Code freeze chức năng bắt đầu sau gate này.

### Ngày 3 — 2026-08-27: Integration, evidence và rehearsal

**Mục tiêu ngày:** biến kết quả kỹ thuật thành bằng chứng báo cáo có thể lặp lại.

### Block 1 — CI và runtime

- [x] Chạy CI gate hoặc cùng tập lệnh tương đương cho toàn bộ service bị tác động.
- [x] Khởi động stack theo `RUN_GUIDE.md`; không chạy song song audit/dev stack nếu thiếu tài nguyên.
- [x] Xác minh gateway `UP`, 12 service healthy và frontend truy cập qua port canonical.
- [x] Chạy `npm run demo:smoke`.

### Block 2 — Bốn hành trình canonical

1. **Farmer:** farm/plot → season → task/log → PHI → harvest → product lot.
2. **Employee:** nhận task → cập nhật progress → Farmer approve/reject → reload → payroll phản ánh đúng rule.
3. **Certification/Admin:** self-assessment → apply → audit/NC/CAPA → issue/verify → public claim snapshot.
4. **Buyer:** xem product thật → public trace thật → cart → authoritative quote → order → delivery được provision qua event.

Mỗi journey phải lưu:

- Request/response hoặc screenshot chính.
- ID aggregate sử dụng.
- DB/server truth sau reload.
- Test/command và thời điểm.
- Known limitation nếu có.

### Block 3 — Báo cáo và demo rehearsal

- [x] Cập nhật checklist: chỉ tick item có evidence.
- [x] Lập bảng before/after theo G0–G5; không tự nâng điểm nhờ item roadmap.
- [x] Chuẩn bị demo script 10–15 phút, ưu tiên luồng liên thông thay vì số lượng menu.
- [x] Chuẩn bị slide “đã tối giản có chủ đích” và roadmap sau báo cáo.
- [ ] Rehearsal từ môi trường sạch hoặc dữ liệu seed đã xác định.
- [x] Export/copy evidence cần thiết sang thư mục báo cáo.

### Gate cuối ngày 3

- [x] Không còn test đỏ trong phạm vi release.
- [x] Không còn route/action mock trong demo script.
- [ ] Demo chạy được hai lần liên tiếp.
- [x] Có rollback note cho mọi thay đổi rủi ro.
- [x] Chỉ nhận sửa P0 regression sau thời điểm này.

## 4. Phân vai Human và Codex

| Công việc | Human/PO | Codex |
|---|---|---|
| Chốt route demo và điều gì được claim | **Quyết định cuối** | Đề xuất dựa trên code/evidence |
| Sửa code, test, contract và tài liệu | Review/accept | Implement, chạy test, ghi evidence |
| Credential, Docker Desktop, external account | Cung cấp/vận hành | Không tự thay đổi secret |
| Business rule training threshold | Xác nhận; mặc định release là 100% | Implement rule/test theo quyết định |
| Quyết định ẩn feature khi timebox hết | **Quyết định cuối** | Chủ động báo rủi ro và tạo phương án ẩn an toàn |
| Demo rehearsal và nội dung báo cáo | Trình bày/accept | Chuẩn bị script, checklist và evidence |

Quy tắc làm việc với Codex:

- Giao từng work package độc lập; hoàn tất test trước khi chuyển WP tiếp theo.
- Không yêu cầu “fix tất cả TODO/mock” trong một lệnh rộng.
- Mỗi lần hoàn tất phải báo file thay đổi, test đã chạy, rủi ro còn lại và checklist ID tương ứng.
- Không cho phép sửa migration đã phát hành, generated client bằng tay hoặc cross-service entity dependency.

## 5. Test gate và evidence matrix

| WP | Test bắt buộc | Evidence báo cáo |
|---|---|---|
| WP1 | Public trace component/API regression + anonymous access | Trace response thật và ảnh trang QR |
| WP2 | Admin route/redirect regression; không fallback mock | Network/error state hoặc cert-audit thật |
| WP3 | Approve, reject, API failure và cache invalidation | Trạng thái trước/sau reload + payroll invariant |
| WP4 | Checkout component không còn recurring controls; create order regression | Payload order one-time thật |
| WP5 | `CertificationScoringServiceTest` với empty/partial/expired/full/unavailable | Checklist không PASS sai |
| WP6 | Diary downstream failure + dossier no-persist/rollback | Typed error, không tạo document giả |
| WP7 | Route matrix manual/static scan | Danh sách real/hidden/roadmap |
| WP8 | Full suites + demo smoke + 4 journeys | Log test, health, screenshot và aggregate IDs |

## 6. Risk register và quyết định sẵn

| Rủi ro | Dấu hiệu | Quyết định sẵn |
|---|---|---|
| Thay production diary contract gây lan rộng | Orval/Feign/frontend đồng loạt lỗi | Giữ contract, fail-explicit; completeness v2 sau deadline |
| Admin document endpoint mới tốn migration/security | Không có list-all contract phù hợp | Redirect/ẩn route, dùng cert-audit thật |
| Task approval UI khó khớp progress log | Không suy ra được `taskId` tin cậy | Dẫn người dùng sang `TasksWorkspacePage` thật; không giữ nút local-only |
| Full tests vượt timebox | Môi trường/Docker chậm | Targeted trước, CI/full suite ban đêm; không bỏ test phạm vi thay đổi |
| Phát sinh bug ngoài demo scope | TODO/mock ở route không báo cáo | Ghi `ROADMAP_ONLY`, không mở rộng WIP |
| Codex tạo patch quá rộng | Diff chạm nhiều service không cần thiết | Dừng, chia WP nhỏ, review diff trước test |
| Muốn thêm feature để slide đẹp hơn | P2/P3 chưa có acceptance rõ | Dùng roadmap/architecture slide, không code trong 24 giờ cuối |

## 7. Nội dung nên trình bày trong báo cáo

Không tuyên bố “AgReli đạt 5/5”. Trình bày theo cấu trúc:

1. **Hiện trạng có bằng chứng:** hệ thống đã ở mức integrated/controlled cho core flow.
2. **Ba ngày hardening:** loại fake success, sửa compliance và chứng minh E2E.
3. **Đánh đổi có chủ đích:** ẩn recurring/pre-order/batching và prototype thay vì demo giả.
4. **Nền tảng mở rộng:** microservice boundary, outbox, snapshots, typed contracts và additive migrations cho phép tiếp tục roadmap.
5. **Lộ trình tới gần 5:** mỗi giai đoạn có outcome/KPI, không chỉ danh sách feature.

Điểm mục tiêu sau ba ngày chỉ được chốt sau test/evidence. Dự kiến hợp lý là **4,0–4,2/5 trong phạm vi release**, trong khi maturity vận hành toàn hệ thống vẫn phải được nâng bằng pilot thực tế.

## 8. Roadmap sau báo cáo để tiến gần “hoàn hảo”

### Sprint 1 — Evidence và certification integrity

- Hoàn thiện `EmployeeTrainingRecord` làm nguồn sự thật duy nhất.
- Production diary response v2 có completeness/provenance.
- Task evidence MinIO + supervisor approval transaction.
- Auditor/Cert Approver role và separation of duties.
- Scheduler periodic review/expiry.

### Sprint 2 — Genealogy và recall

- Genealogy read-model xuyên season–lot–order.
- Quarantine/release/recall state machine.
- Recall notification và trace-forward/back integration tests.
- Cold-chain manual readings có audit.

### Sprint 3 — Field adoption và operability

- QR plot/task/lot.
- Offline-lite và data sync indicator.
- Seed lot và actual material consumption.
- Backup/restore drill, DLQ/replay runbook và SLO.
- Pilot 5–10 người dùng hiện trường.

### Quý tiếp theo — Ecosystem và optimization

- Lab/certification body/signature integration.
- Logistics/payment provider khi có đối tác thật.
- Sensor cold chain nếu ROI được xác nhận.
- Pre-order/batching end-to-end.
- AI monitoring và dự báo sau khi có đủ dữ liệu lịch sử.

Mỗi sprint phải dùng lại checklist ID, Definition of Done và evidence matrix; không mở service hoặc data model mới chỉ để đạt một con số maturity.

## 9. Definition of Done cho kỳ báo cáo 3 ngày

Kỳ báo cáo được coi là sẵn sàng khi:

- [x] WP1–WP7 hoàn tất hoặc có quyết định ẩn được kiểm thử.
- [x] Full test của service/frontend bị tác động xanh.
- [x] Typecheck, lint và build frontend xanh.
- [x] Local demo smoke pass.
- [ ] Bốn journey canonical có evidence và chạy lặp lại.
- [x] Không có success local-only hoặc mock claim trong demo scope.
- [x] Checklist và route matrix phản ánh server truth.
- [x] Báo cáo phân biệt rõ current capability với roadmap.
- [x] Code freeze được tôn trọng và có buffer xử lý regression.

Nếu một mục không đạt, giảm scope demo hoặc hạ kết luận maturity; không dùng mock để bù.
