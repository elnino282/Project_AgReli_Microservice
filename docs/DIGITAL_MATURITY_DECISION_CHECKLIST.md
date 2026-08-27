# AgReli — Checklist quyết định nâng mức trưởng thành số hóa

**Ngày lập:** 2026-08-25  
**Mục đích:** giúp Product Owner/nhóm dự án quyết định phần nào phải giữ, phần nào nên tối giản và phần nào có thể hoãn mà không làm suy giảm tính đúng đắn của quy trình AgReli.

**Kế hoạch thực thi với hạn chót 3 ngày:** xem [`THREE_DAY_PROJECT_COMPLETION_PLAN.md`](THREE_DAY_PROJECT_COMPLETION_PLAN.md). Kế hoạch này là cut-line thực tế cho kỳ báo cáo; checklist hiện tại tiếp tục là roadmap dài hạn.

## 1. Kết luận dùng để chốt scope

Mục tiêu hợp lý cho đợt phát hành gần nhất không nên là “đủ mọi tính năng để đạt 5/5”, mà là:

- **Release khả tín:** đạt khoảng **4,0–4,2/5**, không có màn hình giả thành công, không có claim thiếu bằng chứng, các hành trình chính đi xuyên UI → API → DB → event/read-model.
- **Release mạnh:** đạt khoảng **4,4–4,6/5**, bổ sung trải nghiệm hiện trường, chứng nhận tách vai trò, thu hồi lô và vận hành có SLO.
- **Gần mức 5:** đạt khoảng **4,7–4,9/5**, cần dữ liệu vận hành thật, đối tác bên ngoài, thiết bị/sensor, chữ ký số và pilot được đo lường. Không thể chứng minh mức này chỉ bằng code hoặc demo nội bộ.

Khuyến nghị hiện tại: **chốt scope ở Release khả tín**, chỉ chọn thêm các mục “Release mạnh” nếu còn capacity. Không đánh đổi các control về an toàn thực phẩm, quyền sở hữu, tính trung thực dữ liệu và bằng chứng VietGAP để lấy tính năng trình diễn.

## 2. Cách sử dụng checklist

### 2.1 Ký hiệu ưu tiên

| Mức | Ý nghĩa | Quy tắc quyết định |
|---|---|---|
| **P0** | Điều kiện để sản phẩm đáng tin cậy | Bắt buộc hoàn thành hoặc ẩn/gỡ luồng khỏi release |
| **P1** | Quy trình lõi để đạt khoảng 4,0–4,2 | Nên giữ; chỉ tối giản cách triển khai, không bỏ outcome |
| **P2** | Tăng lên khoảng 4,4–4,6 | Chọn theo capacity và giá trị demo/pilot |
| **P3** | Tối ưu/hệ sinh thái để tiến gần 5 | Hoãn nếu bị áp lực tiến độ |

### 2.2 Ký hiệu hiện trạng

| Ký hiệu | Nghĩa |
|---|---|
| ✅ | Đã có bằng chứng code/audit chính |
| ◐ | Có một phần nhưng chưa khép kín UI–API–DB hoặc chưa đủ business rule |
| ⚠️ | Có hành vi dễ gây hiểu nhầm/sai quyết định |
| ❌ | Chưa có hoặc chưa tìm thấy bằng chứng |

### 2.3 Effort tương đối

- **XS:** chỉnh cấu hình/UI nhỏ hoặc ẩn luồng.
- **S:** thay đổi nhỏ, phạm vi một service hoặc một màn hình.
- **M:** thay đổi xuyên backend–frontend, có migration/test.
- **L:** nhiều service hoặc một quy trình nghiệp vụ mới.
- **XL:** tích hợp bên ngoài, thiết bị, offline sync hoặc tối ưu thuật toán.

Effort là kích thước tương đối để lập kế hoạch; không phải cam kết lịch vì còn phụ thuộc số người và mức sẵn sàng của môi trường.

## 3. Các cổng trưởng thành bắt buộc

Maturity không được tính bằng số lượng màn hình. Dùng các cổng dưới đây để tránh “nhiều tính năng nhưng không đáng tin”.

| Gate | Checklist bắt buộc | Nếu không đạt |
|---|---|---|
| **G0 — Truthful UI** | Không mock trên route sống; không toast success nếu chưa persist; lỗi backend không biến thành dữ liệu giả | Maturity tối đa 2,9 |
| **G1 — Security & integrity** | Ownership, role, fail-closed, idempotency và transaction cho hành động quan trọng | Maturity tối đa 3,2 |
| **G2 — End-to-end core** | Farm → season → nhật ký → PHI → harvest → lot → listing → order → delivery chạy xuyên tầng | Maturity tối đa 3,6 |
| **G3 — Evidence & provenance** | Claim/chứng nhận có nguồn, phiên bản, người tạo, thời điểm, audit trail và completeness | Maturity tối đa 4,0 |
| **G4 — Operability** | SLO, backup/restore, event retry/replay, monitoring và runbook | Maturity tối đa 4,4 |
| **G5 — Adoption & ecosystem** | Pilot người dùng thật, auditor/lab/logistics thật, KPI adoption và cải tiến dựa trên dữ liệu | Maturity tối đa 4,7 |

Để tự chấm, mỗi item dùng trạng thái `0 = chưa có`, `0,5 = một phần`, `1 = hoàn tất`. Tính tỷ lệ hoàn tất có trọng số, sau đó áp trần theo gate chưa đạt thấp nhất.

## 4. Checklist P0 — Không được đánh đổi

### 4.1 Tính trung thực của giao diện và dữ liệu

| ID | Checklist/Definition of Done | Hiện tại | Effort | Quyết định |
|---|---|---:|---:|---|
| T-01 | [x] Route `/marketplace/products/:slug/trace` dùng API trace thật hoặc redirect sang route public canonical; không còn timeline/claim hard-code | ✅ | S | **Đã redirect về `/trace/:slug`** |
| T-02 | [x] Trang admin farm document dùng endpoint thật; khi API lỗi hiển thị error/empty state, không nạp mock | ✅ | M | **Đã gỡ page/menu mock và redirect legacy về cert-audits thật** |
| T-03 | [x] Duyệt/từ chối task progress gọi mutation thật, persist trạng thái, ghi người duyệt/thời gian/note và chỉ toast sau response thành công | ✅ | M | **Đã nối mutation và payroll server truth** |
| T-04 | [x] Ẩn “giao hàng tuần/tháng” cho tới khi có recurring-order contract và scheduler thật | ✅ | XS | **Đã ẩn khỏi release** |
| T-05 | [ ] Quét toàn bộ route sống để loại `mock`, `setTimeout giả API`, local-only mutation và fallback tạo claim | ◐ | M | **Bắt buộc** |
| T-06 | [ ] Mọi action quan trọng có loading, error, retry hợp lý; không báo thành công khi response lỗi hoặc dữ liệu reload không khớp | ◐ | S | **Bắt buộc** |

### 4.2 Bảo mật và toàn vẹn nghiệp vụ

| ID | Checklist/Definition of Done | Hiện tại | Effort | Quyết định |
|---|---|---:|---:|---|
| S-01 | [x] Farmer chỉ thao tác farm/plot/season/order thuộc quyền sở hữu; có regression anonymous/sai role/đúng role | ✅ | — | **Giữ nguyên** |
| S-02 | [x] PHI harvest gate và marketplace PHI gate fail-closed khi dữ liệu không xác minh được | ✅ | — | **Giữ nguyên** |
| S-03 | [x] Shipping quote, phí, trọng lượng và liên kết order do server quyết định | ✅ | — | **Giữ nguyên** |
| S-04 | [ ] Mọi endpoint mới có ownership/role test; không dựa vào frontend route guard | ◐ | S/mục | **Bắt buộc** |
| S-05 | [ ] `CurrentUserService` và các service tương tự trả typed authentication/authorization error, không ném `RuntimeException` chung; có test claim thiếu/sai kiểu | ◐ | S | **Nên làm trong release** |
| S-06 | [ ] Mutation tạo order, nhận kho, duyệt task, issue certificate, publish listing có idempotency hoặc invariant chống bấm lặp | ◐ | M | **Bắt buộc cho luồng tài chính/an toàn** |
| S-07 | [ ] Audit log ghi actor, action, aggregate, before/after hoặc decision, timestamp và correlation ID cho hành động nhạy cảm | ◐ | M | **Bắt buộc** |

### 4.3 Compliance và bằng chứng

| ID | Checklist/Definition of Done | Hiện tại | Effort | Quyết định |
|---|---|---:|---:|---|
| C-01 | [x] `TRAINING_RECORD` chỉ PASS khi đủ tỷ lệ nhân sự bắt buộc, đúng category, còn hiệu lực và có evidence; map có user nhưng record rỗng phải FAIL/PENDING | ✅ | M | **Đã khóa ngưỡng 100% và fail-closed** |
| C-02 | [x] Chọn một nguồn sự thật đào tạo: `EmployeeTrainingRecord`; cờ `SeasonEmployee.isTrained/trainedAt` chỉ là projection hoặc được loại khỏi quyết định compliance | ✅ | M | **Decision compliance chỉ dùng training record** |
| C-03 | [ ] Production diary trả `COMPLETE/PARTIAL/UNAVAILABLE`, `missingSources` và `generatedAt`; không nuốt lỗi sustainability rồi giả định hồ sơ đầy đủ | ⚠️ | M | **Bắt buộc** |
| C-04 | [ ] Export dossier có manifest nguồn, phiên bản, checksum và danh sách phần thiếu; không cho gắn nhãn “đầy đủ” nếu nguồn bắt buộc unavailable | ◐ | M | **Bắt buộc** |
| C-05 | [x] Claim VietGAP/Organic trên marketplace chỉ publish khi chứng nhận `PUBLISHED`, chưa hết hạn và snapshot được lưu | ✅ | — | **Giữ nguyên** |
| C-06 | [ ] Mọi quyết định PASS/FAIL/BLOCK lưu rule code/version, input reference và thời điểm đánh giá | ❌ | M | **Giữ bản MVP decision log** |
| C-07 | [ ] Reference PHI, checklist và tiêu chuẩn có version/effective date; hồ sơ lịch sử không đổi theo seed hiện tại | ◐ | L | **Tối giản: version cho VietGAP + PHI trước** |

## 5. Checklist P1 — Release khả tín khoảng 4,0–4,2

### 5.1 Tác nghiệp hiện trường và “nhập một lần, dùng nhiều nơi”

| ID | Checklist/Definition of Done | Hiện tại | Effort | Phương án tối giản |
|---|---|---:|---:|---|
| F-01 | [ ] Progress log lưu ảnh bằng chứng thật trong MinIO, gắn task/season/plot/actor/time | ❌/◐ | M | Một ảnh bắt buộc + note; chưa cần gallery/video |
| F-02 | [x] Farmer duyệt/từ chối nghiệm thu; chỉ task được duyệt mới tính payroll | ✅ | M | Approve chuyển task sang `DONE` rồi mới tính lại payroll; reject persist lý do |
| F-03 | [ ] Hoàn thành task loại phun thuốc/bón phân/tưới tạo hoặc liên kết field log tương ứng | ◐ | L | Chỉ tự động hóa 3 loại task VietGAP quan trọng |
| F-04 | [ ] Nhật ký vật tư tham chiếu supply item/lot và lượng thực dùng; có stock movement tương ứng | ◐ | L | Chỉ bắt buộc với thuốc BVTV và phân bón |
| F-05 | [ ] Ghi nhận giống/seed lot, nguồn giống và lượng sử dụng; bỏ placeholder “available soon” | ❌ | M | Một form seed log đơn giản trong season |
| F-06 | [ ] Form hiện trường hoàn thành trong khoảng 30 giây với input tối thiểu, nút lớn, tiếng Việt rõ và validation tại chỗ | ◐ | M | Tối ưu 5 tác vụ phổ biến nhất |
| F-07 | [ ] Có QR cho plot/task/lot để mở đúng ngữ cảnh | ◐ | M | QR URL ký/opaque; không dùng blockchain |
| F-08 | [ ] Có offline-lite: lưu draft cục bộ, cảnh báo chưa đồng bộ, retry khi có mạng | ❌ | L | Không làm conflict-resolution đa thiết bị trong release đầu |

### 5.2 Thu hoạch, kho và truy xuất lô

| ID | Checklist/Definition of Done | Hiện tại | Effort | Phương án tối giản |
|---|---|---:|---:|---|
| H-01 | [x] Harvest bị chặn khi PHI vi phạm hoặc reference không xác định | ✅ | — | Giữ nguyên |
| H-02 | [x] Thu hoạch tạo/nhận lô kho, có grade, hao hụt, condition và xử lý hàng không đạt | ✅ | — | Giữ nguyên |
| H-03 | [ ] Có genealogy query xuyên `season → harvest → product lot → listing → order item` | ◐ | M | Một endpoint/read-model tổng hợp, chưa cần graph database |
| H-04 | [ ] Có trạng thái `QUARANTINED/RELEASED/RECALLED` cho lô và block xuất/bán khi quarantine | ❌ | M | Ba trạng thái và reason/note là đủ cho MVP |
| H-05 | [ ] Recall MVP: chọn lot, khóa listing, tìm order/buyer bị ảnh hưởng, tạo incident và notification | ❌ | L | Manual trigger; chưa cần tự động kết nối cơ quan quản lý |
| H-06 | [ ] Trace-forward/trace-back được kiểm thử với một lô chia thành nhiều order và một order có nhiều seller | ◐ | M | Hai integration tests canonical |
| H-07 | [ ] Cold-chain MVP lưu phép đo thủ công tại receive/stock-out và cảnh báo vượt ngưỡng | ◐ | M | Hoãn sensor streaming |

### 5.3 Chứng nhận VietGAP khả dụng

| ID | Checklist/Definition of Done | Hiện tại | Effort | Phương án tối giản |
|---|---|---:|---:|---|
| V-01 | [x] State machine audit → NC → CAPA → pass → certified → published có kiểm soát transition | ✅ | — | Giữ nguyên |
| V-02 | [ ] Identity có role `AUDITOR` và `CERT_APPROVER`; người audit không tự phê duyệt chứng thư của cùng hồ sơ | ◐ | M | Dùng chung UI admin nhưng khác role/quyền, chưa cần portal riêng |
| V-03 | [ ] Auditor chỉ xem farm/hồ sơ được phân công | ❌ | M | Assignment theo `auditorUserId` |
| V-04 | [ ] Scheduler chuyển/cảnh báo `PERIODIC_REVIEW_DUE`, `EXPIRED`; event làm khóa/ẩn claim liên quan | ◐ | M | Job chạy hằng ngày là đủ |
| V-05 | [ ] CAPA có due date, owner, evidence, review result và SLA alert | ◐ | M | In-app notification trước; hoãn SMS/Zalo |
| V-06 | [ ] Sampling/lab MVP lưu sample code, ngày lấy mẫu, lab name, kết quả file và trạng thái verify | ◐ | M | Upload PDF thủ công; hoãn tích hợp API lab |
| V-07 | [ ] Certificate có file, checksum, issue/expiry, approver và public verification code | ◐ | M | Audit-trail + checksum; hoãn chữ ký số pháp lý nếu chưa có đối tác |
| V-08 | [ ] Chỉ công bố chứng nhận sau khi certificate document được verify và separation-of-duties pass | ◐ | S | Bắt buộc |

### 5.4 Marketplace và delivery

| ID | Checklist/Definition of Done | Hiện tại | Effort | Phương án tối giản |
|---|---|---:|---:|---|
| M-01 | [x] Listing sellable qua compliance gate, snapshot PHI/certification và stock reservation | ✅ | — | Giữ nguyên |
| M-02 | [x] Checkout dùng shipping quote authoritative, idempotent order và delivery provisioning bằng event | ✅ | — | Giữ nguyên |
| M-03 | [ ] Pre-order hoặc đi xuyên product form → product detail → checkout → order → delivery date → farmer queue, hoặc bị ẩn hoàn toàn | ◐ backend | L | Nếu thiếu thời gian: **ẩn pre-order** |
| M-04 | [x] Không hiển thị recurring weekly/monthly cho tới khi có persisted schedule, cancel/pause và scheduler | ✅ | XS để ẩn / XL để làm | **Đã ẩn** |
| M-05 | [ ] Batch suggestion chỉ hiển thị khi API thật trả eligible; không cam kết giảm phí nếu quote chưa áp dụng rate batch | ◐ backend | M | Hoãn toàn bộ nếu chưa chứng minh giá trị |
| M-06 | [ ] COD và bank transfer/payment proof có trạng thái đối soát rõ | ✅/◐ | S | Giữ hai phương thức; hoãn payment gateway |
| M-07 | [ ] Buyer order detail và farmer fulfillment hiển thị cùng một delivery state machine | ◐ | M | Không thêm driver app trong release này |

## 6. Checklist P2 — Release mạnh khoảng 4,4–4,6

| ID | Checklist | Hiện tại | Effort | Có thể hoãn? |
|---|---|---:|---:|---|
| A-01 | [ ] Dashboard exception-first: việc hôm nay, PHI block, hồ sơ thiếu, CAPA quá hạn, lô sắp hết hạn | ◐ | M | Không nên hoãn quá lâu |
| A-02 | [ ] Data completeness score theo farm/season nhưng không tạo claim song song với certification | ◐ | M | Có |
| A-03 | [ ] KPI dictionary thống nhất định nghĩa, owner, nguồn, freshness và công thức | ❌ | M | Có |
| A-04 | [ ] AI suggestion luôn có nguồn, confidence, disclaimer và bước người dùng xác nhận trước khi tạo record | ✅/◐ | M | Giữ control, hoãn AI nâng cao |
| A-05 | [ ] AI quality monitoring: tỷ lệ accept/reject, lỗi nguồn, latency và feedback | ❌ | M | Có |
| N-01 | [ ] Notification preference thật; in-app/email hoạt động theo event quan trọng | ◐ | M | Giữ in-app, email tùy capacity |
| N-02 | [ ] SMS/Zalo cho cảnh báo PHI, recall, certificate expiry | ❌ | L | Có, trừ khi pilot yêu cầu |
| O-01 | [ ] SLO cho gateway/core services, freshness read-model và event lag | ◐ | M | Không nên hoãn monitoring cơ bản |
| O-02 | [ ] Backup và restore drill có bằng chứng, không chỉ có cấu hình backup | ❌/◐ | M | Không nên hoãn trước production |
| O-03 | [ ] DLQ/replay runbook và test idempotent consumer | ◐ | M | Không nên hoãn trước production |
| O-04 | [ ] Data retention, quyền xóa/ẩn PII, consent và access-log policy | ❌/◐ | L | Có thể làm theo mức tối thiểu pháp lý |
| O-05 | [ ] E2E canonical journeys cho Farmer, Employee, Buyer, Admin/Auditor | ◐ | L | Không nên hoãn các journey lõi |
| U-01 | [ ] Pilot 5–10 người dùng hiện trường; đo thời gian nhập log, lỗi và tỷ lệ hoàn thành | ❌ | M | Bắt buộc để tuyên bố >4,4 |
| U-02 | [ ] Onboarding wizard, hướng dẫn theo ngữ cảnh và kênh hỗ trợ | ◐ | M | Có |
| U-03 | [ ] Accessibility/mobile kiểm thử dưới nắng, mạng yếu, màn hình nhỏ | ❌/◐ | M | Nên làm cùng pilot |

## 7. Checklist P3 — Chỉ làm khi core đã ổn định

Các mục này giúp tiến gần mức 5 nhưng có tỷ lệ effort/giá trị thấp nếu dự án còn chịu áp lực tiến độ.

| ID | Hạng mục | Effort | Khuyến nghị |
|---|---|---:|---|
| X-01 | [ ] Offline sync đầy đủ, conflict resolution đa thiết bị | XL | Hoãn; dùng offline-lite |
| X-02 | [ ] IoT temperature/humidity streaming và device management | XL | Hoãn; dùng phép đo thủ công có audit |
| X-03 | [ ] Tích hợp API phòng lab | XL | Hoãn; upload kết quả + verify |
| X-04 | [ ] Chữ ký số pháp lý/CA cho certificate | L/XL | Hoãn tới khi có đối tác/yêu cầu pháp lý rõ |
| X-05 | [ ] Payment gateway và tự động đối soát | L/XL | Hoãn; COD + bank transfer |
| X-06 | [ ] Tích hợp hãng vận chuyển/driver tracking thời gian thực | XL | Hoãn; state machine nội bộ |
| X-07 | [ ] Tối ưu tuyến giao hàng và dynamic batching | XL | Hoãn; batching theo zone/date nếu thật sự cần |
| X-08 | [ ] Multi-standard đầy đủ VietGAP/Organic/GlobalGAP | XL | Chốt một standard VietGAP trước |
| X-09 | [ ] Blockchain traceability | XL | Không cần; snapshot + hash + audit log đủ cho mục tiêu hiện tại |
| X-10 | [ ] AI dự báo giá, nhu cầu, sản lượng và tự tối ưu kế hoạch | XL | Chỉ làm sau khi có dữ liệu thật đủ dài |
| X-11 | [ ] Voice assistant đầy đủ và nhận dạng đa giọng địa phương | L/XL | Hoãn; voice-to-text cơ bản nếu pilot cần |
| X-12 | [ ] Full accounting/ERP, hóa đơn và sổ cái | XL | Ngoài core; tích hợp sau thay vì tự xây |

## 8. Cut-line đề xuất theo tiến độ

### Phương án A — Tiến độ rất gấp

Mục tiêu: **release đáng tin khoảng 4,0/5**.

Giữ:

- Toàn bộ P0.
- PHI, certification gate, authoritative shipping, ownership và trace snapshot hiện có.
- Task evidence + duyệt thật.
- Training compliance đúng.
- Production diary completeness.
- Genealogy query cơ bản.
- Runtime smoke và regression journey lõi.

Tối giản/ẩn:

- Redirect route trace mock sang public trace.
- Ẩn recurring order, pre-order và batch suggestion.
- Một tiêu chuẩn VietGAP.
- COD và bank transfer/payment proof.
- Lab document upload thủ công.
- Cold-chain measurement thủ công.
- In-app notification trước.

Hoãn toàn bộ P3.

### Phương án B — Cân bằng chất lượng và trình diễn

Mục tiêu: **khoảng 4,3–4,5/5**.

Bao gồm Phương án A, cộng:

- Auditor/cert approver tách role.
- Scheduler expiry/periodic review.
- Recall MVP.
- QR plot/task/lot.
- Offline-lite.
- Pre-order một ngày giao cố định, nếu có đủ capacity.
- Pilot người dùng hiện trường và backup/restore drill.

Vẫn hoãn IoT, payment gateway, route optimization, multi-standard và full offline sync.

### Phương án C — Gần mức 5

Mục tiêu: **4,7–4,9/5**, chỉ chọn sau khi Phương án B đã ổn định.

- Tích hợp lab/certification body/logistics/payment thật.
- Chữ ký số pháp lý.
- Sensor cold chain.
- Offline sync đầy đủ.
- Recall drill với dữ liệu/pilot thật.
- SLO và KPI adoption đạt trong nhiều chu kỳ vận hành.
- AI/predictive optimization có monitoring và dữ liệu đủ dài.

## 9. Definition of Done cho từng tính năng được giữ

Một tính năng chỉ được coi là “đã số hóa” khi tất cả câu trả lời dưới đây là **Có**:

- [ ] Có actor và quyền hạn rõ ràng.
- [ ] Có state transition/business rule rõ ràng.
- [ ] UI gọi API thật và hiển thị loading/error/empty state đúng.
- [ ] Dữ liệu được persist hoặc event được ghi transactionally.
- [ ] Reload trang vẫn thấy server truth.
- [ ] Có ownership/role check ở backend.
- [ ] Có audit/provenance đủ để giải trình.
- [ ] Có xử lý downstream unavailable theo fail-open/fail-closed đã quyết định.
- [ ] Có test happy path, reject path, wrong role và duplicate/retry nếu liên quan.
- [ ] Có monitoring/log/correlation để điều tra lỗi.
- [ ] Có tài liệu vận hành và người chịu trách nhiệm nghiệp vụ.
- [ ] Không còn mock, fallback claim hoặc success local-only trên route sống.

Nếu thiếu một trong bốn mục `persist`, `backend authorization`, `audit/provenance`, `không fake success`, tính năng không được tính vào maturity dù màn hình đã hoàn thiện.

## 10. KPI nghiệm thu chương trình số hóa

| KPI | Mục tiêu Release khả tín | Mục tiêu Release mạnh/gần 5 |
|---|---:|---:|
| Action UI báo thành công nhưng không persist | 0 | 0 |
| Claim public không có provenance | 0 | 0 |
| Hoạt động đồng ruộng ghi trong 24 giờ | ≥90% | ≥95% |
| Thời gian ghi một log phổ biến | ≤60 giây | ≤30 giây |
| Bằng chứng dossier sinh/tái sử dụng tự động | ≥60% | ≥80% |
| Nhân sự bắt buộc có training hợp lệ | 100% | 100% |
| Harvest vi phạm PHI bị chặn | 100% | 100% |
| Lô có genealogy tới order item | ≥95% | ≥99% |
| Thời gian trace-forward/trace-back một lô | ≤10 phút | ≤2 phút |
| Chênh lệch tồn kho so với kiểm kê | <5% | <2% |
| E2E canonical journeys pass | 100% core | 100% core + external pilot |
| Backup restore drill | Pass trước production | Pass định kỳ |
| CAPA nghiêm trọng đóng đúng SLA | ≥90% | ≥95% |
| OTIF giao hàng | ≥90% | ≥95% |

## 11. Quy tắc quyết định cuối cùng

Khi buộc phải cắt scope, áp dụng thứ tự:

1. **Cắt tính năng tối ưu và tích hợp bên ngoài trước.**
2. **Cắt toàn bộ một luồng chưa khép kín thay vì để lại UI giả.**
3. **Tối giản số actor/UI nhưng giữ backend authorization và separation of duties.**
4. **Tối giản cách thu bằng chứng nhưng không bỏ provenance.**
5. **Giữ một tiêu chuẩn, một payment method set, một delivery model hoạt động thật trước khi mở rộng.**
6. **Không cắt PHI, ownership, compliance gate, audit trail, idempotency và tính trung thực của dữ liệu.**
7. **Không dùng AI để thay thế luật an toàn hoặc quyết định cấp chứng nhận.**

Checklist này cần được review lại sau mỗi sprint bằng dữ liệu test/runtime, không chỉ dựa trên việc file hoặc endpoint đã tồn tại.
