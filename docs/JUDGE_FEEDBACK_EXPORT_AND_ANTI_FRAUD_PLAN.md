# AgReli — Kế hoạch bổ sung quy trình xuất khẩu, kiểm soát đăng bán và chống gian lận thương mại

Ngày lập: 2026-08-28  
Trạng thái: Kế hoạch triển khai, chưa phải tuyên bố tính năng đã hoàn tất  
Phạm vi: VietGAP trồng trọt, lô nông sản, marketplace, xuất khẩu và vận hành chống gian lận.

## 1. Quyết định sản phẩm

### Thách thức lớn nhất của AgReli

Thách thức lớn nhất không phải là số lượng màn hình hay thuật toán AI, mà là **tạo được niềm tin có thể kiểm chứng xuyên suốt chuỗi cung ứng**:

> Mỗi tuyên bố “VietGAP”, “an toàn”, “đúng nguồn gốc”, “còn hàng” hoặc “đủ điều kiện xuất khẩu” phải gắn với đúng người bán, đúng mùa vụ, đúng thửa đất, đúng lô vật lý, đúng khối lượng, đúng giấy tờ còn hiệu lực và đúng yêu cầu của thị trường đích; khi dữ liệu nguồn thay đổi hoặc bị thu hồi, hệ thống phải phản ứng ngay.

Đây là bài toán khó vì dữ liệu nằm ở nhiều service, một phần do con người nhập, quy định xuất khẩu thay đổi theo `quốc gia + mặt hàng + hình thức sản phẩm`, còn gian lận thường xảy ra tại chỗ nối giữa dữ liệu số và hàng hóa vật lý. Một QR đúng kỹ thuật không tự chứng minh dữ liệu bên trong là thật.

Ba nguyên tắc điều hành:

1. **VietGAP không phải giấy phép xuất khẩu.** Chứng nhận VietGAP là một nguồn bằng chứng về quá trình sản xuất trong phạm vi được chứng nhận. Hồ sơ xuất khẩu còn có thể cần mã số vùng trồng/cơ sở đóng gói, kiểm dịch thực vật, kiểm nghiệm an toàn thực phẩm/dư lượng, nhãn, C/O, chứng từ thương mại, vận tải và yêu cầu riêng của nước nhập khẩu.
2. **Không dùng blockchain để thay thế xác minh nguồn.** Ưu tiên định danh, chữ ký/hash, ledger bất biến, mass-balance, kiểm soát quyền, rule versioning và hậu kiểm. Chỉ đánh giá blockchain khi có nhiều tổ chức độc lập cùng ghi dữ liệu và có thỏa thuận quản trị.
3. **Fail-closed tại các quyết định có claim hoặc phát sinh giao dịch.** Có thể lưu nháp khi service nguồn tạm lỗi, nhưng không được gửi duyệt, công bố, nhận đơn hay kết luận “đủ điều kiện” nếu chưa xác minh được nguồn bắt buộc.

## 2. Baseline hiện có và khoảng trống

### Năng lực có thể tái sử dụng

- Chứng nhận đã có state machine, audit ngoài, điểm không phù hợp, hành động khắc phục, tài liệu xác minh và phạm vi theo mùa vụ/sản phẩm/thửa đất.
- Marketplace chỉ chấp nhận claim VietGAP khi chứng nhận `PUBLISHED`, còn hiệu lực và khớp mùa vụ; PHI đã fail-closed.
- Sản phẩm, order item và public trace đã giữ snapshot của farm/season/lot; inventory có lot, transaction ledger và reservation; checkout và shipping quote do server quyết định.
- Các luồng chính có transactional outbox; consumer/read model hiện hữu có `processed_events` để idempotent.
- Delivery được tạo từ `order.created`; admin reporting đã tiêu thụ event của lot, order và marketplace product.

### Khoảng trống cần đóng

| Mã | Khoảng trống | Hậu quả nếu không xử lý |
|---|---|---|
| GAP-01 | `identity-service` chưa có hồ sơ xác minh người bán/doanh nghiệp, mã số thuế, chủ tài khoản nhận tiền và trạng thái đình chỉ | Có thể lập gian hàng bằng tài khoản không đủ provenance; khó truy vết và xử lý vi phạm |
| GAP-02 | Luồng điền dữ liệu lô khi tạo/cập nhật listing hiện bắt lỗi downstream rồi tiếp tục; chưa có invariant bắt buộc lot thuộc farm/người bán, trạng thái bán được và quantity không vượt available stock | Gắn nhầm/chiếm dụng lot, bán hàng không có thật hoặc dùng snapshot thiếu/cũ |
| GAP-03 | Gate công bố chủ yếu kiểm claim VietGAP và PHI; chưa kiểm seller verification, quality status, hạn dùng, quarantine/recall, hồ sơ kiểm nghiệm và rule của thị trường đích | Sản phẩm không đủ điều kiện vẫn có thể được bán/xuất khẩu |
| GAP-04 | Compliance hiện là kiểm tra tại thời điểm công bố; chưa có cơ chế tự đình chỉ khi chứng nhận bị `REVOKED/EXPIRED`, lot bị quarantine/recall hoặc bằng chứng bị bác bỏ | Claim đúng lúc đăng nhưng sai trong thời gian đang bán |
| GAP-05 | Lot ledger chưa thể hiện đầy đủ quan hệ split/merge/repack/processing, định danh đơn vị đóng gói, quarantine, recall và danh sách người nhận bị ảnh hưởng | Không chứng minh được mass-balance hoặc truy xuôi nhanh khi có sự cố |
| GAP-06 | QR hiện thiên về truy xuất theo sản phẩm/lô; chưa có token chống sao chép, scan telemetry hay cảnh báo một mã xuất hiện bất thường | Có thể chụp/copy QR thật để dán lên hàng giả |
| GAP-07 | Payment proof vẫn là ảnh được duyệt thủ công; chưa có transaction reference duy nhất, kiểm trùng file/tài khoản, đối soát cổng thanh toán và risk signal | Giả mạo/chỉnh sửa chứng từ hoặc dùng một chứng từ cho nhiều đơn |
| GAP-08 | Chưa có bounded context cho hồ sơ xuất khẩu, rule theo thị trường, chứng từ, shipment và kết quả thông quan/cảnh báo | Không thể trả lời trung thực “lô này đã sẵn sàng xuất sang đâu và vì sao” |
| GAP-09 | Chưa có case management cho report listing/seller/QR, risk score, điều tra, evidence hold, SLA và quyết định xử lý | Phát hiện rời rạc nhưng không có quy trình ứng phó/audit |

## 3. Quy trình đích

### 3.1 Đăng bán trong nước

1. Farmer hoàn tất hồ sơ người bán; Admin/Compliance Officer xác minh danh tính và chủ thể kinh doanh. Giai đoạn đầu là xác minh thủ công có bằng chứng, **không tuyên bố đã tích hợp VNeID**.
2. Farmer chỉ chọn được lot thuộc mùa vụ/farm của mình. Backend xác minh lại ownership, trạng thái lot, chất lượng, hạn dùng, lượng khả dụng và đơn vị đo.
3. Listing lưu `DRAFT`; hệ thống dựng checklist server-side gồm seller, lot, PHI, certification claim, nhãn/ảnh và chính sách giao hàng.
4. Khi gửi duyệt, listing chuyển `PENDING_REVIEW`; mọi nguồn bắt buộc phải trả kết quả xác minh, không dùng snapshot cũ để PASS.
5. Admin duyệt theo nguyên tắc bốn mắt với các listing có claim/risk cao. Khi `ACTIVE/PUBLISHED`, snapshot phải có `sourceId`, `sourceVersion`, `checkedAt`, `validUntil` và hash.
6. Trước add-to-cart/checkout và trước stock-out, hệ thống kiểm lại các điều kiện biến động: seller không bị đình chỉ, listing không bị recall, lot còn bán được, đủ lượng và chứng nhận/PHI chưa mất hiệu lực.

### 3.2 Chuẩn bị xuất khẩu

1. Người dùng tạo hồ sơ với `destinationCountry`, `product/HS code`, dạng hàng hóa, lot, khối lượng, ngày dự kiến xuất và buyer/importer.
2. `export-service` khóa một phiên bản bộ quy tắc `market + commodity + effective date`, rồi thu snapshot từ farm, season, inventory, marketplace và delivery qua API nội bộ.
3. Pre-check trả một trong ba kết quả: `ACTION_REQUIRED`, `ELIGIBLE_FOR_REVIEW`, `BLOCKED`. “Không có dữ liệu” khác hoàn toàn “đã kiểm tra và không có vi phạm”.
4. Hồ sơ quản lý tối thiểu các nhóm bằng chứng:
   - phạm vi VietGAP/chứng nhận khác nếu buyer yêu cầu;
   - mã vùng trồng và cơ sở đóng gói phù hợp thị trường/mặt hàng, trạng thái và thời hạn;
   - nhật ký canh tác, PHI, kết quả kiểm nghiệm/MRL, kiểm dịch thực vật;
   - quy cách, nhãn, bao bì, xử lý, cold-chain nếu có;
   - hợp đồng/invoice/packing list, C/O phù hợp FTA, vận đơn và tờ khai hải quan;
   - chữ ký/hash, người xác minh, ngày hiệu lực và cơ quan phát hành của từng tài liệu.
5. Compliance Officer duyệt dossier; hệ thống chỉ ghi `READY_FOR_CUSTOMS` khi mọi mục bắt buộc của phiên bản rule đều `VERIFIED`.
6. AgReli theo dõi `SHIPPED`, `CLEARED`, `REJECTED`, cảnh báo của nước nhập khẩu và corrective action. MVP quản lý workflow/tài liệu; tích hợp National Single Window, EcoSys/ePhyto chỉ được công bố khi có connector thật và thỏa thuận sử dụng.

State machine đề xuất:

`DRAFT -> PRECHECKING -> ACTION_REQUIRED | ELIGIBLE_FOR_REVIEW -> DOCUMENTS_IN_REVIEW -> READY_FOR_CUSTOMS -> SHIPPED -> CLEARED`

Nhánh kết thúc/ứng phó: `BLOCKED`, `REJECTED`, `CANCELLED`, `RECALLED`.

### 3.3 Chống gian lận: phòng ngừa, phát hiện, ứng phó

| Lớp | Control ưu tiên |
|---|---|
| Phòng ngừa | Seller verification; ownership server-side; chứng từ có hash/version; một lot không được bán quá lượng khả dụng; bốn mắt cho claim/risk cao; presigned URL ngắn hạn; không công khai PII/tài liệu gốc |
| Phát hiện | Rule engine và risk score; payment proof hash trùng; thay đổi giá/stock bất thường; nhiều tài khoản chung bank/phone/device; QR scan đồng thời ở vị trí xa; mass-balance âm; tỷ lệ complaint/return/cancel tăng; chứng nhận/mã vùng trồng hết hiệu lực |
| Ứng phó | Tự `SUSPENDED/QUARANTINED`; mở fraud case; giữ bằng chứng/audit; chặn payout nếu có; thu hồi listing/lot; truy xuôi tới order/buyer; gửi notification; Admin ghi quyết định và lý do; hỗ trợ xuất báo cáo cơ quan có thẩm quyền |

Không tự động kết luận một người dùng “gian lận” chỉ từ risk score. Score dùng để ưu tiên review; quyết định đình chỉ dài hạn phải có người chịu trách nhiệm, lý do và đường khiếu nại.

## 4. Phân rã theo service

| Service | Trách nhiệm bổ sung | Dữ liệu/API chính |
|---|---|---|
| `identity-service` | Nguồn sự thật cho seller verification | `seller_profiles`, `seller_verification_checks`, status `UNVERIFIED/PENDING/VERIFIED/REJECTED/SUSPENDED`; internal lookup chỉ trả trường tối thiểu |
| `farm-service` | Chứng nhận/scope/version; mã vùng trồng; lịch sử thu hồi/hết hạn | Bổ sung source authority, validity, document hash; event `certification.status.changed`, `production-area-code.status.changed` |
| `inventory-service` | Lot genealogy, đóng gói, mass-balance, quality hold/quarantine/recall | `lot_genealogy`, `lot_identifiers`, `quality_holds`, `recalls`, transaction bất biến; API lot compliance/impacted recipients |
| `marketplace-service` | Gate đăng bán/checkout, seller snapshot, listing moderation, payment fraud signals | Listing decision snapshot; `SUSPENDED/RECALLED`; report listing; payment reference/file hash; không tự sở hữu hồ sơ KYC/lab |
| `export-service` mới | Rule registry, export dossier, checklist, shipment/compliance decision | `export_db`; rule set versioned, dossier, document requirement, verification, shipment, decision history |
| `incident-service` | Fraud case và cảnh báo vận hành | Case link seller/listing/lot/order/QR; severity, assignee, evidence, SLA, resolution; consumer idempotent |
| `delivery-service` | Chain-of-custody và điều kiện vận chuyển | Pickup/handover/delivery events, seal/container, temperature evidence khi tuyến yêu cầu; không tự quyết eligibility |
| `admin-reporting-service` | Read model chống gian lận/xuất khẩu | Dashboard risk, recall reach, export readiness/rejection; chỉ là read model, không là nguồn quyết định |
| Frontend | Wizard có giải thích và portal review | Seller verification, listing readiness, export dossier, fraud/recall console, public trace với trạng thái live |

`export-service` là service độc lập vì quy tắc xuất khẩu, dossier và shipment có vòng đời riêng, không nên biến marketplace hoặc farm thành nơi sở hữu mọi nghiệp vụ. Service này chỉ dùng DTO/API/event; không import entity/repository của service khác.

## 5. Contract và event bắt buộc

### API nội bộ tối thiểu

- `GET /api/v1/internal/users/{userId}/seller-verification`
- `POST /api/v1/internal/lots/{lotId}/compliance-check` với `sellerUserId`, quantity, purpose, destination và `asOf`
- `GET /api/v1/internal/certifications/scopes/resolve` với farm/season/plot/product/standard/asOf
- `GET /api/v1/internal/export-rules/resolve` với country/commodity/HS/effectiveDate

API nội bộ không được route qua gateway. Nếu chuyển từ single-host Compose sang multi-host/Kubernetes, phải bổ sung service authentication/mTLS trước khi coi boundary là đủ an toàn.

### API public/authenticated chính

- `/api/v1/farmer/seller-profile/**`
- `/api/v1/farmer/marketplace/products/{id}/readiness`
- `/api/v1/export-dossiers/**`
- `/api/v1/admin/export-dossiers/**`
- `/api/v1/marketplace/products/{id}/reports`
- `/api/v1/admin/fraud-cases/**`
- `/api/v1/public/trace/{token}` chỉ trả view được phép công khai, không trả document URL nội bộ hoặc PII.

### Event

- `identity.seller.verification.changed`
- `farm.certification.status.changed`
- `farm.production_area_code.status.changed`
- `inventory.lot.quality_hold.changed`
- `inventory.lot.recalled`
- `marketplace.product.suspended`
- `marketplace.payment.risk.detected`
- `export.dossier.status.changed`
- `export.shipment.rejected`

Event nghiệp vụ phải ghi transactional outbox cùng aggregate. Consumer phải lưu `processed_events`; event có `eventId`, `occurredAt`, `aggregateId`, `aggregateVersion`, `reasonCode` và correlation ID. Consumer nhận event thu hồi phải xử lý version cũ/mới rõ ràng, không được “last delivery wins” mù quáng.

## 6. Backlog theo giai đoạn

### Giai đoạn 0 — Chốt rule và threat model (3–5 ngày)

- [ ] Chọn **một** mặt hàng và **một** thị trường xuất khẩu cho pilot; không xây bộ rule “mọi quốc gia”.
- [ ] Workshop cùng chuyên gia xuất nhập khẩu/đơn vị kiểm dịch để xác nhận checklist và ai có thẩm quyền xác minh từng loại chứng từ.
- [ ] Threat model bốn luồng: seller onboarding, listing, payment/order, export/recall.
- [ ] Chốt retention, PII, quyền xem tài liệu và ma trận role `FARMER/ADMIN/AUDITOR/COMPLIANCE_OFFICER`.
- [ ] Ghi rõ MVP nào chỉ hỗ trợ chuẩn bị hồ sơ, connector nào là tương lai.

**Gate:** Có rule matrix được chuyên gia nghiệp vụ ký duyệt, data owner và acceptance trước khi migration/code.

### Giai đoạn 1 — Marketplace trustworthy baseline (Sprint 1–2, 2 tuần)

- [ ] Seller verification thủ công có audit, expiry/suspension và ownership check.
- [ ] Sửa create/update/submit listing: lot lookup, farm/season ownership, lot status, quality, expiry và available quantity đều server-authoritative; lookup bắt buộc lỗi thì submit/publish fail-closed.
- [ ] Decision snapshot có provenance/version/validity; recheck ở publish, add-to-cart và checkout.
- [ ] Payment proof lưu SHA-256, transaction reference duy nhất, phát hiện hash/reference dùng lại; giữ admin verification hiện tại làm fallback có kiểm soát.
- [ ] Report listing/seller và admin moderation; mọi quyết định có audit reason.
- [ ] Security tests anonymous/sai role/đúng role và ownership; concurrency test chống oversell.

**Gate:** Tài khoản chưa xác minh hoặc lot không thuộc farmer không thể publish; dependency bắt buộc unavailable không tạo claim PASS; một chứng từ thanh toán không thể xác nhận hai đơn.

### Giai đoạn 2 — Lot integrity, quarantine và recall (Sprint 3–4, 2 tuần)

- [ ] Additive Flyway cho genealogy `PARENT -> CHILD` với nghiệp vụ split/merge/repack/process và yield/loss reason.
- [ ] Mass-balance invariant theo unit chuẩn; không cho quantity đầu ra vượt đầu vào hợp lệ.
- [ ] `QUALITY_HOLD/QUARANTINED/RELEASED/RECALLED/DISPOSED`; bốn mắt khi release lô rủi ro cao.
- [ ] Event recall tự suspend listing, chặn checkout/stock-out, tìm order/buyer bị ảnh hưởng và tạo notification/case.
- [ ] Public trace thể hiện provenance và trạng thái hiện hành; claim snapshot lịch sử không che cảnh báo live.
- [ ] Diễn tập trace-back/trace-forward và recall trên seed data.

**Gate:** Từ một lot tìm được nguồn trực tiếp và mọi bên nhận trực tiếp; recall không cho phát sinh đơn mới và liệt kê đủ đơn bị ảnh hưởng.

### Giai đoạn 3 — Export readiness MVP (Sprint 5–6, 2 tuần)

- [ ] Scaffold `export-service` từ `service-template`, port dự kiến 8093, schema `export_db`, health/OpenAPI/Compose/CI.
- [ ] Rule set versioned cho đúng pilot; không sửa rule đã gắn dossier, chỉ phát hành version mới.
- [ ] Dossier wizard, pre-check, checklist evidence, manual verification và decision history.
- [ ] Quản lý mã vùng trồng/cơ sở đóng gói, lab result, phytosanitary/C/O metadata; file hash và effective/expiry date.
- [ ] Sinh gói hồ sơ tải xuống từ tài liệu persisted; nguồn thiếu/sai URL phải fail-explicit, không sinh ZIP giả.
- [ ] E2E từ season/lot hợp lệ đến `READY_FOR_CUSTOMS`, cùng các nhánh expiry, sai destination và service outage.

**Gate:** Kết quả readiness luôn giải thích được rule version, evidence nào đạt/thiếu/hết hạn và ai xác minh; không quảng bá là đã nộp cho cơ quan nhà nước nếu mới chỉ export dossier.

### Giai đoạn 4 — Fraud operations và QR chống sao chép (Sprint 7–8, 2 tuần)

- [ ] Risk rule registry versioned, score có reason code; fraud case trong `incident-service`.
- [ ] QR token ký số, rotation/revocation; tùy mức rủi ro có serial cho kiện/đơn vị thay vì một QR tĩnh cho toàn listing.
- [ ] Scan telemetry tối thiểu: token, timestamp, coarse location theo consent, device/session hash, result; rate limit và privacy notice.
- [ ] Luật phát hiện copy QR, velocity bất thường, payment duplicate, seller/linkage bất thường và complaint spike.
- [ ] Admin fraud console: triage, evidence, action, appeal, SLA; dashboard chỉ đọc event.
- [ ] Red-team test: đổi lot ID, replay QR, reuse payment proof, cert revoked sau publish, concurrent checkout, sửa evidence.

**Gate:** Mỗi alert giải thích được tín hiệu; action có người/lý do/thời điểm; false positive có đường release/appeal; không expose PII trên public trace.

### Giai đoạn 5 — Tích hợp và pilot thật (sau MVP, 4–8+ tuần)

- [ ] Chỉ tích hợp EcoSys, National Single Window/ePhyto, lab, payment gateway hoặc carrier sau khi có API/quyền sử dụng và sandbox chính thức.
- [ ] Ký số doanh nghiệp, webhook idempotent, reconciliation job và dead-letter/replay.
- [ ] Pilot một hợp tác xã, một exporter/đơn vị đóng gói, một mặt hàng, một thị trường.
- [ ] Đo thời gian chuẩn bị dossier, tỷ lệ thiếu hồ sơ, trace/recall time, false-positive và số lần phải nhập lại dữ liệu.
- [ ] Pen-test, backup/restore, disaster recovery, data retention và runbook sự cố.

## 7. Phạm vi demo cho cuộc thi

Nếu thời gian chỉ có 1–2 tuần, không cố hoàn tất toàn bộ roadmap. Demo đáng tin nhất gồm:

1. Một seller `VERIFIED` và một seller `UNVERIFIED`; seller chưa xác minh bị chặn publish.
2. Một lot sạch có VietGAP đúng scope và một lot bị `QUARANTINED`; gate giải thích khác biệt.
3. Một export dossier cho đúng `mặt hàng + thị trường pilot`, hiển thị checklist versioned và tài liệu thiếu/hết hạn.
4. Admin phát lệnh recall; listing tự suspend, checkout bị chặn và buyer/order bị ảnh hưởng xuất hiện trong case.
5. Quét QR sau recall thấy cảnh báo live; quét lặp bất thường sinh alert nhưng không tự kết tội seller.

Thông điệp với giám khảo: **AgReli không “tự cấp VietGAP” và không “tự cấp phép xuất khẩu”; nền tảng thu thập bằng chứng, áp dụng gate có thể giải thích, giữ audit trail và hỗ trợ cơ quan/người có thẩm quyền ra quyết định.**

## 8. Tiêu chí nghiệm thu tổng thể

| Nhóm | Tiêu chí đo được |
|---|---|
| Seller | 100% listing sellable thuộc seller `VERIFIED`; suspend seller làm ngừng listing trong SLA đã định |
| Listing | Không publish nếu ownership/lot/quality/PHI/cert bắt buộc không xác minh được; mọi PASS có provenance |
| Tồn kho | Reservation concurrent không oversell; mass-balance không âm; split/merge truy vết hai chiều |
| Recall | Không nhận đơn mới sau recall; truy xuôi đủ order/buyer; thông báo và audit có bằng chứng |
| Export | 100% decision gắn rule version; không `READY_FOR_CUSTOMS` khi còn requirement bắt buộc chưa `VERIFIED` |
| Fraud | Payment reference/hash không dùng cho nhiều order; alert có reason; quyết định con người có appeal/audit |
| Security | Anonymous/sai role/khác owner bị chặn; internal endpoint không qua gateway; public trace không lộ PII/tài liệu riêng |
| Reliability | Outbox chỉ processed sau publish; consumer idempotent; outage bắt buộc không biến thành verified-empty |
| Truthful UI | Reload luôn lấy server truth; không có mock/success giả; connector chưa tích hợp được ghi rõ “chuẩn bị hồ sơ” |

## 9. Kiểm thử bắt buộc

- Unit/property tests cho state transition, rule evaluation, mass-balance, risk reason và token signature.
- MockMvc security tests cho anonymous, sai role, đúng role và cross-owner ở mọi API mới.
- Contract tests cho identity/farm/inventory/export/marketplace; null, timeout và malformed response phải có semantics rõ.
- Integration tests với DB thật cho migration, optimistic locking, concurrent reservation, outbox và processed event.
- E2E theo persona farmer/compliance/admin/buyer, gồm reload và role isolation.
- Chaos tests: farm/inventory/lab connector unavailable đúng lúc submit/publish/checkout.
- Recall drill và audit replay: từ QR/order truy ngược tới input và truy xuôi toàn bộ recipient.

## 10. Rủi ro và giới hạn cần công bố

- Quy định nhập khẩu thay đổi theo thị trường và thời điểm; rule phải có owner nghiệp vụ, ngày hiệu lực và lịch review, không để developer tự diễn giải pháp lý.
- VNeID, EcoSys, National Single Window, ePhyto, lab và payment gateway cần quyền tích hợp; mock/manual workflow không được trình bày như connector production.
- Hash/chữ ký chứng minh file không đổi sau thời điểm ghi nhận, không chứng minh nội dung ban đầu là đúng; vẫn cần issuer/verifier và quy trình lấy mẫu.
- Geolocation/device fingerprint có rủi ro riêng tư; chỉ thu tối thiểu, có consent/retention và không hiển thị công khai.
- AI có thể hỗ trợ OCR/phát hiện bất thường, nhưng không là nguồn duy nhất để cấp chứng nhận, block payout hay kết luận gian lận.

## 11. Cơ sở đối chiếu chính thức

- [Thông tư 02/2024/TT-BKHCN về quản lý truy xuất nguồn gốc sản phẩm, hàng hóa](https://vanban.chinhphu.vn/?classid=1&docid=209961&pageid=27160), hiệu lực từ 01/06/2024.
- [Luật Thương mại điện tử số 122/2025/QH15](https://vanban.chinhphu.vn/?classid=1&docid=216503&pageid=27160&typegroupid=3) và [Nghị định 248/2026/NĐ-CP](https://vanban.chinhphu.vn/?docid=218747&orggroupid=2&pageid=27160), cùng hiệu lực từ 01/07/2026.
- [Bộ Công Thương phổ biến trách nhiệm xác thực người bán và xử lý sản phẩm/gian hàng vi phạm](https://moit.gov.vn/tin-tuc/bo-cong-thuong-pho-bien-luat-thuong-mai-dien-tu-va-nghi-dinh-so-248-2026-nd-cp.html).
- [Luật Bảo vệ quyền lợi người tiêu dùng số 19/2023/QH15](https://vanban.chinhphu.vn/?classid=1&docid=208363&orggroupid=1&pageid=27160&previousPage=other+articles), hiệu lực từ 01/07/2024.
- [Cục Bảo vệ thực vật — quản lý mã số vùng trồng và cơ sở đóng gói phục vụ xuất khẩu](https://sansangxuatkhau.ppd.gov.vn/tin-tuc-su-kien/tang-cuong-quan-ly-ma-so-vung-trong-va-co-so-dong-goi-nong-san-xuat-khau.html), trong đó nêu yêu cầu hồ sơ sản xuất, giám sát dư lượng và truy xuất.
- [Cục Bảo vệ thực vật — cổng yêu cầu kiểm dịch/an toàn thực phẩm theo thị trường](https://ppd.gov.vn/kiem-dich-thuc-vat.html).
- [EcoSys — hệ thống và hướng dẫn khai báo C/O điện tử](https://ecosys.gov.vn/Homepage/DocumentView.aspx), thể hiện C/O và chứng từ kèm theo phụ thuộc loại hồ sơ/hiệp định.
- [IPPC ePhyto technical information](https://ippc.int/en/ephyto/ephyto-technical-information/) cho định hướng tích hợp chứng thư kiểm dịch thực vật điện tử quốc tế.

Các nguồn trên dùng để xây yêu cầu sản phẩm ban đầu, không thay thế tư vấn pháp lý/chuyên môn theo đúng mặt hàng và nước nhập khẩu của pilot.
