# TÀI LIỆU PHÂN TÍCH YÊU CẦU NGHIỆP VỤ (BRD/FRS)
## VietFuture2026 — Luồng nghiệp vụ Farmer & Chứng nhận VietGAP

| | |
|---|---|
| **Dự án** | Nền tảng Quản lý Mùa vụ cùng Trợ lý ảo (ACM Platform) — `elnino282/VietFuture2026` |
| **Người soạn thảo** | Senior Business Analyst (phối hợp AI) |
| **Nguồn đầu vào** | `Kichbandemoe2e.docx` (kịch bản demo E2E) + audit trực tiếp source code (nhánh `main`, 12 microservices + FE React) |
| **Đối tượng sử dụng** | AI coding agent (Claude Code / Cursor / …) và đội kỹ sư triển khai |
| **Phiên bản** | v1.0 |

---

## 0. Giới thiệu tài liệu

### 0.1 Mục tiêu & phạm vi

Tài liệu này **không mô tả một hệ thống làm mới từ đầu**. Toàn bộ nội dung được viết sau khi đã **audit trực tiếp source code hiện tại** của 12 microservices và frontend React, đối chiếu với kịch bản demo E2E do stakeholder cung cấp (`Kichbandemoe2e.docx`) và kế hoạch triển khai trước đó (`plan3&4.md`, đã thực hiện phần lớn).

Mục tiêu:
1. **Chuẩn hoá lại** toàn bộ luồng nghiệp vụ Farmer ↔ VietGAP thành đặc tả từng bước, chính xác theo đúng những gì hệ thống *cần* làm — dùng làm "nguồn sự thật" (source of truth) để AI code theo.
2. **Chỉ rõ ranh giới** giữa phần **đã có sẵn** (chỉ cần verify/tinh chỉnh UI) và phần **thực sự cần xây mới** — tránh việc AI đập đi xây lại các module đã hoạt động tốt (Area validation, PHI Gate, Cold-chain alert, Sub-standard disposition, Delivery cold-surcharge... đều đã tồn tại và hoạt động).
3. Với các ý tưởng mới nằm rải rác trong kịch bản demo (những dòng note rời rạc như "training nhân viên", "hồ sơ đánh giá nội bộ", "đặt trước giao hàng"...), tài liệu **suy luận và thiết kế chi tiết** thành đặc tả implement được, kèm đánh giá **mức độ cần thiết (necessity)** để AI có thể tự động implement theo đúng chỉ đạo của Product Owner (ngưỡng ≥ 70% cần thiết → auto-implement).

### 0.2 Quy ước ký hiệu (BẮT BUỘC đọc trước khi code)

| Ký hiệu | Ý nghĩa | Hành động cho AI coding agent |
|---|---|---|
| ✅ **ĐÃ CÓ** | Đã tồn tại trong code, đã verify bằng cách đọc trực tiếp file | **KHÔNG viết lại**. Chỉ tái sử dụng / gọi lại. Nếu cần đổi hành vi → dùng `🔧 MỞ RỘNG` |
| 🔧 **MỞ RỘNG** | Nền tảng đã có, cần thêm field/endpoint/logic mà không phá vỡ contract cũ | Sửa **additive-only**: thêm cột nullable, thêm endpoint mới, không đổi API cũ đã public |
| 🆕 **MỚI** | Chưa tồn tại, cần xây từ đầu | Xây theo đúng convention hiện có của service tương ứng (xem §0.4) |
| 🐞 **LỖI HIỆN TẠI** | Bug xác nhận đang tồn tại trong code, cần fix trước khi mở rộng | Fix **trước tiên**, coi là pre-requisite của mọi task liên quan |
| `[AUTO ≥70%]` | Việc mới có độ cần thiết cao theo suy luận nghiệp vụ | AI **được phép tự động implement** không cần hỏi lại, theo đúng chỉ đạo của Product Owner |
| `[CẦN XÁC NHẬN]` | Việc mới có nhiều phương án hoặc ảnh hưởng lớn tới UX/luồng tiền | Implement **bản MVP hợp lý nhất** nhưng nên gắn `TODO`/feature flag, review với PO trước khi bật mặc định |

### 0.3 Nguyên tắc bám theo codebase hiện tại

1. **Additive-only**: mọi migration mới là `V{n}__...sql` tăng dần, không sửa cột/bảng cũ. Không đổi field trong response DTO đã public (đặc biệt `MarketplaceTraceabilityResponse`, `ProductWarehouseLotResponse`, `HarvestResponse`).
2. **Domain boundary giữ nguyên** như đã thiết lập:
   - Khu vực/Đội nhóm/Task → `season-service`
   - Hồ sơ nông trại/Chứng nhận → `farm-service`
   - PHI/Nhật ký vật tư → `season-service`
   - Kho & Cold-chain → `inventory-service`
   - Compliance score (đất/nước/dinh dưỡng) → `sustainability-service`
   - Marketplace/Truy xuất công khai → `marketplace-service`
   - Giao hàng → `delivery-service`
   - AI (chat, chẩn đoán ảnh) → `ai-service`
3. **Giao tiếp liên service**: ưu tiên tái sử dụng Feign client đã có (`FarmClient`, `SeasonClient`, `InventoryServiceClient`...) trước khi tạo client mới. Sự kiện RabbitMQ mới đặt tên theo pattern đã dùng: `{domain}.{entity}.{action}` (vd: `farm.document.uploaded`, `season.harvest.recorded`).
4. **Không đổi cổng/route** đã khai báo trong `docker-compose.yml` / API Gateway.
5. Style code: Lombok (`@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor @FieldDefaults(level = AccessLevel.PRIVATE)`), MapStruct cho mapper, Flyway cho migration, Feign + `fallbackFactory` cho resilience — **giữ đúng pattern đang dùng**, không đổi sang cách khác.

### 0.4 Cấu trúc tài liệu

| Chương | Nội dung |
|---|---|
| 1 | Ma trận đối chiếu Gap Analysis (kịch bản demo ↔ hiện trạng code) |
| 2 | Luồng A — Khu vực (Sub-zone) & Đội nhóm |
| 3 | Luồng B — Dashboard Tiến độ Đội nhóm |
| 4 | Luồng C — Thu hoạch & Kho lạnh |
| 5 | Luồng D — Vòng đời Chứng nhận VietGAP (trọng tâm việc mới) |
| 6 | Luồng E — Nhật ký Sản xuất hợp nhất & AI hỗ trợ |
| 7 | Luồng F — Cổng An toàn Thu hoạch (PHI Gate) |
| 8 | Luồng G — Cổng Kiểm duyệt Marketplace (trọng tâm việc mới) |
| 9 | Luồng H — Truy xuất nguồn gốc công khai & Người mua |
| 10 | Luồng I — Logistics, Fulfillment & Đặt trước (trọng tâm việc mới) |
| 11 | Đào tạo & Hồ sơ nhân viên (việc mới) |
| 12 | Yêu cầu phi chức năng & phân quyền xuyên suốt |
| 13 | Lộ trình triển khai đề xuất & Definition of Done |
| Phụ lục A–D | Data dictionary, mã lỗi, event catalog, truy vết nguồn |

---

## 1. Đánh giá hiện trạng Codebase (Gap Analysis)

### 1.1 Kết luận tổng quan sau audit

Codebase hiện tại **trưởng thành hơn nhiều** so với những gì một bộ kịch bản demo thông thường giả định. Phần lớn **Part 1, Part 2, Part 3 và Kịch bản 1, 2, 4** trong `Kichbandemoe2e.docx` mô tả các tính năng **đã được implement** (đúng như kế hoạch `plan3&4.md` đã đề ra và đã thực thi). Phần việc mới thực sự cần làm tập trung vào:

- **Vòng đời chứng nhận sau khi "Applied"** (audit ngoài, biên bản không phù hợp, kế hoạch khắc phục, cấp giấy, tái kiểm định kỳ, admin duyệt public) — **Luồng D**.
- **Enforcement thực sự** của cổng kiểm duyệt Marketplace dựa trên chứng nhận/PHI (dữ liệu đã có sẵn qua Feign, nhưng logic chặn **chưa được implement** trong `updateAdminProductStatus`) — **Luồng G**.
- **Đào tạo nhân viên** (chưa có entity) — **Luồng K (11)**.
- **Đặt trước (pre-order) & gom đơn cùng khu vực để giảm phí ship** — **Luồng I**.
- **Tích hợp AI nhận diện sâu bệnh vào Nhật ký sản xuất** (AI đã có, nhưng chưa nối vào luồng ghi nhật ký) — **Luồng E**.
- 1 **bug chặn build** cần fix trước tiên trong `season-service` (xem §1.3).

### 1.2 Ma trận đối chiếu Kịch bản Demo ↔ Hiện trạng Code

| # | Hạng mục trong kịch bản demo | Trạng thái | Bằng chứng trong code | Việc còn lại |
|---|---|---|---|---|
| 1 | TC 1.1 — Tạo sub-zone & validate diện tích (progress bar, block FE+BE) | ✅ ĐÃ CÓ | `farm-service/.../PlotService.java` → `validateAreaRules()`; `Plot.parentPlotId` | Không cần code mới. Chỉ verify UI progress bar hiển thị đúng % (xem Luồng A) |
| 2 | TC 1.2 — Tạo đội nhóm, giao Task vào Team + Sub-zone | ✅ ĐÃ CÓ | `WorkTeam`, `WorkTeamMember`, `Task.workTeamId`, `Task.plotId`, `Task.plotArea`, `Task.estimatedDays` | 🐞 xem §1.3 — field `plotName` bị khai báo trùng 2 lần trong `Task.java`, thiếu `import java.math.BigDecimal` → **service season KHÔNG COMPILE ĐƯỢC ở trạng thái hiện tại** |
| 3 | TC 1.2 (note rời) — training nhân viên mới, lưu hồ sơ đã train | 🆕 MỚI | Không tìm thấy entity nào liên quan (`grep Training` chỉ trúng `LaborManagementService` – không liên quan đào tạo) | Xây mới — xem Luồng K (chương 11) |
| 4 | TC 1.3 — Employee Portal hiển thị text khu vực thay vì bản đồ GIS | ✅ ĐÃ CÓ (backend) / 🔧 cần verify FE | `EmployeeTasksPage.tsx`, `Task.plotName`/`plotArea` đã denormalize sẵn để tránh cần GIS | Verify FE đã bind đúng field `plotName`/`plotArea`, không còn gọi component bản đồ (xem Luồng A) |
| 5 | TC 2.1 — Dashboard Team Progress, không lỗi console `key`, gọi đúng API | ✅ ĐÃ CÓ | `FarmerTeamController` → `GET /api/v1/farmer/dashboard/team-progress`; FE `TeamProgressDashboardWidget.tsx` | Không cần code mới — xem Luồng B để có checklist verify |
| 6 | TC 3.1/3.2 — Báo cáo thu hoạch GRAIN, khoá đếm ngược sấy, xác nhận nhập kho, tính hao hụt ẩm | ✅ ĐÃ CÓ | `Harvest.warehouseReceiptStatus` (`PENDING_RECEIPT/RECEIVED`), `GrainMoistureCalculator`, `Crop.postHarvestDelayDays`, `ReceiveToWarehouseRequest(currentMoisture,targetMoisture,mechanicalLoss)` | Không cần code mới — xem Luồng C để đặc tả lại chính xác cho AI tham chiếu |
| 7 | TC 3.3 — Cảnh báo kho lạnh (`hasTemperatureAlert`, `expiryDate`) | ✅ ĐÃ CÓ | `ColdChainValidationService`, `Warehouse.temperatureMin/Max`, `ProductWarehouseLot.hasTemperatureAlert` (computed) | Không cần code mới |
| 8 | Note rời — xử lý sản phẩm không đạt chuẩn (bán cho chăn nuôi...) | ✅ ĐÃ CÓ | `SubStandardDisposition{SELL_LIVESTOCK_FEED, COMPOSTING, PROCESSING, DISCARDED, SELL_DISCOUNT}`, `ProductWarehousePublicService.disposeSubStandardLot()` | Không cần code mới |
| 9 | Note rời — Rau củ/hoa quả thu hoạch, đóng gói khác ngũ cốc | 🔧 MỞ RỘNG | `cropCategory`, `packagingType`, `processingType` đã có trên `Harvest` & `ProductWarehouseLot` | Cần bổ sung **reference/config theo loại cây trồng** (không phải code logic mới) — xem Luồng C §4.6 |
| 10 | Note rời — Nhật ký sản xuất: phân bón, thuốc BVTV, giống, nước tưới, sơ chế | ✅ ĐÃ CÓ (rải rác nhiều service) | `PesticideRecord` (season), `NutrientInputEvent` (sustainability), `IrrigationWaterAnalysis` (sustainability), `SoilTest` (sustainability), crop/variety (crop-catalog), `processingType` (season) | 🆕 Cần **1 màn hình "Nhật ký sản xuất" hợp nhất** tổng hợp các nguồn trên theo timeline — xem Luồng E |
| 11 | Note rời — generate hồ sơ đầy đủ từ nhật ký sản xuất | 🆕 MỚI | `CertificationScoringService.autoPopulateFromFieldLogs()` đã tự map log → checklist, nhưng **chưa có tính năng "xuất hồ sơ" (export dossier bundle)** | Xây mới — xem Luồng E §6.4 |
| 12 | Kịch bản 1 — Thiết lập Farm Dossier, đăng ký & đánh giá nội bộ VietGAP | ✅ ĐÃ CÓ | `CertificationStandard/Record/ChecklistItem/ItemStatus`, `CertificationService.apply()`, ngưỡng 80% | Không cần code mới cho phần này |
| 13 | Kịch bản 1 — Cơ quan chứng nhận đánh giá (điều kiện, hồ sơ, phỏng vấn, lấy mẫu) | 🆕 MỚI | `CertificationRecord.status` dừng ở `IN_PROGRESS → READY_TO_APPLY → APPLIED`, không có state cho audit ngoài | Xây mới — xem Luồng D §5.4 `[AUTO ≥70%]` |
| 14 | Kịch bản 1 — Khắc phục điểm không phù hợp (plan, edit, bằng chứng, upload) | 🆕 MỚI | Không có entity nonconformity/corrective action | Xây mới — xem Luồng D §5.5 `[AUTO ≥70%]` |
| 15 | Kịch bản 1 — Cấp giấy chứng nhận | 🔧 MỞ RỘNG | `CertificationRecord.certifiedAt/expiryDate` đã có cột nhưng chưa có endpoint set trạng thái `CERTIFIED` | Xây endpoint mới — xem Luồng D §5.6 |
| 16 | Kịch bản 1 — Kiểm tra định kỳ sau cấp giấy, người khác kiểm tra nhân viên | 🆕 MỚI | Không có | Xây mới — xem Luồng D §5.7 `[CẦN XÁC NHẬN]` tần suất kiểm tra |
| 17 | Kịch bản 1 — Admin duyệt tài liệu chứng nhận trước khi public | 🔧 MỞ RỘNG | `FarmDocument.verificationStatus` default `PENDING` đã có cột, nhưng controller `FarmDocumentController` hiện chỉ có CRUD, **chưa có endpoint admin approve** | Xây endpoint mới — xem Luồng D §5.8 |
| 18 | Kịch bản 1 — AI đề xuất phân bón/thuốc an toàn, nhận diện ảnh sâu bệnh | 🔧 MỞ RỘNG | `ai-service` đã có `InternalImageAnalysisRequest`, `GeminiService` (nhận diện ảnh + tư vấn) | Cần **nối luồng** vào màn hình Nhật ký sản xuất, tự lưu kết quả thành gợi ý `PesticideRecord` nháp — xem Luồng E §6.3 |
| 19 | Kịch bản 2 — PHI Harvest Gate chặn thu hoạch sớm | ✅ ĐÃ CÓ | `PesticideRecord`, `PesticidePHIReference`, `PHIHarvestValidationService`, có unit test `PHIHarvestValidationServiceTest` | Không cần code mới — xem Luồng F để đặc tả lại cho rõ |
| 20 | Kịch bản 2 — Widget "Việc quan trọng hôm nay" cảnh báo PHI đang chặn | 🔧 cần verify FE | Cần kiểm tra `SeasonTaskPanels.tsx` / dashboard widget có tiêu thụ dữ liệu PHI blocking chưa | Verify + bổ sung nếu thiếu — xem Luồng F §7.5 |
| 21 | Kịch bản 3 — Chứng nhận hết hạn → khoá Marketplace listing | 🆕 MỚI (logic enforcement) | `FarmClient` (Feign) + `FarmCertificationDto` đã tồn tại phía marketplace-service (đã có sẵn đường dây lấy dữ liệu), nhưng `MarketplaceServiceImpl.updateAdminProductStatus()` **không hề gọi kiểm tra chứng nhận** — set status vô điều kiện | Xây mới — xem Luồng G §8.3 `[AUTO ≥70%]` |
| 22 | Kịch bản 3 — Compliance completeness score, missing evidence count | 🆕 MỚI (nhưng nên tái dùng, không xây service riêng) | `CertificationScoringService.calculateScore()` + `CertificationItemStatus` đã có đủ dữ liệu để suy ra "thiếu bằng chứng gì" | Xây **API tổng hợp mới** dựa trên dữ liệu đã có, KHÔNG tạo bảng điểm song song ở `sustainability-service` — xem Luồng G §8.4 |
| 23 | Kịch bản 4 — Cấu hình phí ship linh hoạt + cold surcharge | ✅ ĐÃ CÓ | `DeliveryRate(weightMinKg,weightMaxKg,baseRateVnd,perKgVnd,isColdChain,coldChainFeeVnd)`, `ShippingFeeCalculator` | Không cần code mới |
| 24 | Kịch bản 4 — DeliveryQuote tại checkout, hiện ETA | ✅ ĐÃ CÓ | `DeliveryController POST /api/v1/delivery/calculate` → `ShippingOption` | Không cần code mới |
| 25 | Kịch bản 4 — Same-day priority list "Đơn cần chuẩn bị hôm nay" | ✅ ĐÃ CÓ (rate/logic) / 🔧 cần verify FE farmer fulfillment queue | `ShippingFeeCalculator` đã hỗ trợ `same_day`; `DeliveryOrder`/`DeliveryStatus` đã có | Verify FE Farmer Portal có tab lọc đơn same-day chưa — xem Luồng I §10.5 |
| 26 | Kịch bản 4 — trạng thái đơn hàng PACKING→READY_FOR_PICKUP→PICKED_UP→IN_TRANSIT→DELIVERED | ✅ ĐÃ CÓ | `DeliveryStatus` enum | Không cần code mới |
| 27 | Note rời — Đặt trước (pre-order) hẹn ngày ship, gom đơn theo khu vực để giảm phí | 🆕 MỚI | `grep preOrder/scheduledDelivery` → không có kết quả | Xây mới — xem Luồng I §10.6–10.7 `[AUTO ≥70%]` cho pre-order, `[CẦN XÁC NHẬN]` cho thuật toán gom đơn |
| 28 | Note rời — Chứng nhận Hữu cơ (Organic) | 🔧 MỞ RỘNG | `CertificationStandard.type` và overload `getOrCreateRecord(farmId, standardCode)` đã hỗ trợ đa loại; UI đăng ký đa chuẩn chưa hoàn thiện | Bổ sung luồng chọn chuẩn và bộ checklist được thẩm định — xem Luồng D §5.9 |

### 1.3 🐞 Lỗi hiện tại cần fix TRƯỚC (blocking)

> **Mức độ: P0 — chặn build.** AI coding agent phải fix mục này trước khi thực hiện bất kỳ task nào chạm vào `season-service`.

**File:** `season-service/src/main/java/org/example/season/entity/Task.java`

- Field `String plotName;` bị khai báo **2 lần** (dòng 56 và dòng 92) trong cùng class `Task` → lỗi compile Java `variable plotName is already defined`.
- Field `BigDecimal plotArea;` được dùng nhưng **thiếu `import java.math.BigDecimal;`** → lỗi compile `cannot find symbol`.

**Cách fix (additive, không đổi field cũ mà tổ dev khác đang dùng):**
1. Xoá khai báo `plotName` bị trùng ở khối "Area-based assignment" (giữ lại field đầu tiên có Javadoc "Denormalized plot name...").
2. Thêm `import java.math.BigDecimal;` vào đầu file.
3. Sau khi sửa, chạy lại toàn bộ test của `season-service` (đặc biệt `PHIHarvestValidationServiceTest`) để đảm bảo không có vòng lặp phụ thuộc field bị ảnh hưởng.
4. Kiểm tra `TaskMapper` (MapStruct) và mọi nơi `builder().plotName(...)` được gọi 2 lần với giá trị khác nhau — nếu có, giữ giá trị denormalized "tại thời điểm giao task" (business-correct hơn).

---

*(Xem tiếp các chương Luồng A–I trong các file kèm theo của bộ tài liệu này.)*
## 2. LUỒNG A — Quản lý Khu vực (Sub-zone) & Phân công Đội nhóm

**Trạng thái tổng thể: ✅ Backend đã hoàn chỉnh. Nhiệm vụ chính là verify/hoàn thiện Frontend + đóng gói thành đặc tả cho AI tham chiếu, cộng thêm 1 tính năng mới (đào tạo — chuyển sang chương 11).**

### 2.1 Mục tiêu nghiệp vụ
Cho phép Farmer chia nhỏ một thửa ruộng cha (Plot) thành các khu vực con (sub-zone) theo diện tích, đảm bảo tổng diện tích các khu vực con không bao giờ vượt quá diện tích thửa cha (ở cả FE lẫn BE), sau đó giao việc (Task) cho Đội nhóm (WorkTeam) gắn với từng khu vực con cụ thể — để nhân viên hiện trường biết chính xác vị trí/quy mô công việc mà không cần bản đồ GIS.

### 2.2 Actor
Farmer (chủ trại), Team Leader, Nhân viên (Employee), Hệ thống.

### 2.3 Data model liên quan (đối chiếu code)

| Entity | Service | Field chính | Trạng thái |
|---|---|---|---|
| `Plot` | farm-service | `id, farmId, plotName, area, parentPlotId, status, boundaryGeoJson, polygon` | ✅ ĐÃ CÓ |
| `WorkTeam` | season-service | `id, seasonId, teamName, teamLeaderUserId, members[]` | ✅ ĐÃ CÓ |
| `WorkTeamMember` | season-service | quan hệ N-N WorkTeam ↔ user | ✅ ĐÃ CÓ |
| `Task` | season-service | `id, seasonId, plotId, plotName, plotArea, workTeamId, estimatedDays, status, actualStartDate/EndDate` | ✅ ĐÃ CÓ (sau khi fix bug §1.3) |

### 2.4 Luồng chính — Bước 1: Tạo khu vực con & validate diện tích

| Bước | Actor | Hành động | Ghi chú kỹ thuật (đã có) |
|---|---|---|---|
| 1 | Farmer | Vào **Quản lý Thửa ruộng**, chọn Thửa ruộng cha, xem Progress Bar diện tích đã dùng | FE tính `% = SUM(area của các Plot có parentPlotId = cha) / area(cha)` |
| 2 | Farmer | Mở form tạo khu vực con, nhập tên + diện tích | `POST /api/v1/farms/{farmId}/plots` với `parentPlotId` |
| 3 | Hệ thống (FE) | Validate real-time: nếu diện tích nhập > diện tích còn trống → khoá nút Lưu, hiện cảnh báo đỏ | `BR-A-01` |
| 4 | Hệ thống (BE) | `PlotService.validateAreaRules(parentId, currentPlotId, newArea)` chặn lần cuối dù FE bị bypass | Trả `400 Bad Request` + message rõ ràng |
| 5 | Hệ thống | Lưu thành công → Progress Bar cập nhật ngay (optimistic update hoặc refetch) | |

**BR-A-01 (Business Rule):** `SUM(area của tất cả sub-zone con hiện có, KHÔNG tính sub-zone đang sửa) + area mới ≤ area(thửa cha)`. Áp dụng cho cả `create` và `update` Plot.

### 2.5 Luồng chính — Bước 2: Tạo Đội nhóm & giao Task vào khu vực

| Bước | Actor | Hành động |
|---|---|---|
| 1 | Farmer | **Quản lý Đội nhóm** → tạo đội (vd "Đội Cày xới"), chọn 1 Team Leader + N thành viên |
| 2 | Farmer | **Quản lý Công việc** → Tạo Task mới: tên, `estimatedDays`, chọn **Đội thực hiện** (`workTeamId`) và **Khu vực** (`plotId` → hệ thống tự denormalize `plotName`, `plotArea` vào Task) |
| 3 | Hệ thống | Lưu Task, gắn đúng ID Đội + ID khu vực con |

### 2.6 Luồng chính — Bước 3: Nhân viên nhận việc (Employee Portal / mobile view)

| Bước | Actor | Hành động | Yêu cầu hiển thị |
|---|---|---|---|
| 1 | Nhân viên | Đăng nhập, vào **Danh sách công việc của tôi** (mobile-view) | `GET` task theo `userId`/`workTeamId` hiện có |
| 2 | Hệ thống | Hiển thị task | **PHẢI** hiện `estimatedDays`, hạn hoàn thành dự kiến (`getEstimatedCompletionDate()` transient method đã có sẵn trên `Task`), và dòng text **"Khu vực: {plotName} — Diện tích: {plotArea} m²"** |
| 3 | Hệ thống | **KHÔNG** hiện nút "Xem Bản đồ" (đã bỏ GIS trong luồng nhân viên) | Kiểm tra `EmployeeTasksPage.tsx` không còn import component bản đồ trong card Task |

**Checklist verify Frontend (không cần code mới nếu đã đúng, chỉ QA lại):**
- [ ] `EmployeeTasksPage.tsx` bind đúng `task.plotName` / `task.plotArea` từ response (không phải gọi thêm API farm-service).
- [ ] Không còn lazy-import `MapView`/`GISWidget` trong route mobile employee.
- [ ] Không có warning console `key` prop trên list Task (đối chiếu §3 — cùng nguyên nhân `teamId` vs `workTeamId` đã fix).
- [ ] Loading state mượt, có skeleton, không "màn hình trắng" khi API chậm.

### 2.7 Ý tưởng mới liên quan (chuyển chi tiết sang Chương 11)
Ghi chú rời trong kịch bản demo: *"Khi giao việc có hình ảnh nghiệm thu, nhân viên báo cáo, lưu lại hình ảnh đúng thửa ruộng; giám sát nghiệm thu"* → đây là yêu cầu **task acceptance với ảnh bằng chứng gắn đúng plot**.

- 🔧 MỞ RỘNG: kiểm tra xem `Task` hiện đã có cơ chế "Progress Log" (`TaskProgressLogResponse` đã thấy trong FE generated models) — nếu đã hỗ trợ upload ảnh trong progress log thì chỉ cần đảm bảo ảnh được lưu kèm `plotId` (denormalized sẵn trên Task, không cần thêm cột). Nếu progress log **chưa hỗ trợ ảnh**, bổ sung field `evidenceImageUrls: List<String>` (JSON array, nullable) vào bảng `task_progress_logs` — additive migration `V{n}__add_evidence_images_to_task_progress_log.sql`.
- Endpoint mở rộng: `POST /api/v1/farmer/tasks/{taskId}/progress-logs` (hoặc endpoint tương đương đang dùng) thêm field `evidenceImageUrls`.
- "Giám sát nghiệm thu": thêm 1 field `acceptanceStatus: PENDING|ACCEPTED|REJECTED` + `acceptedByUserId` + `acceptanceNote` trên progress log cuối cùng của Task, cho phép Farmer/Team Leader duyệt trước khi Task chuyển `DONE`. `[AUTO ≥70%]` — vì đây là điều kiện tiên quyết hợp lý để đảm bảo chất lượng trước khi tính vào compliance.

### 2.8 Acceptance Criteria (Definition of Done — Luồng A)
- [ ] Bug §1.3 đã fix, `season-service` build xanh.
- [ ] Tạo sub-zone vượt diện tích bị chặn cả FE và BE (400 + message rõ tên field gây lỗi).
- [ ] Task tạo mới lưu đúng `workTeamId` + `plotId`, hiển thị đúng trên Employee Portal không cần bản đồ.
- [ ] (Nếu áp dụng §2.7) Task progress log hỗ trợ ảnh nghiệm thu + trạng thái duyệt của giám sát.

---

## 3. LUỒNG B — Bảng điều khiển Tiến độ Đội nhóm (Team Progress Dashboard)

**Trạng thái tổng thể: ✅ ĐÃ CÓ đầy đủ. Chương này chỉ đóng vai trò checklist QA, không phát sinh việc code mới trừ khi audit lộ ra lỗi.**

### 3.1 Mục tiêu nghiệp vụ
Farmer xem nhanh tiến độ từng Đội nhóm trong 1 mùa vụ: tên đội, khu vực phụ trách, tổng số việc, % hoàn thành — không có lỗi console, không gọi sai API.

### 3.2 Luồng chính

| Bước | Actor | Hành động |
|---|---|---|
| 1 | Farmer | Vào **Dashboard Mùa vụ** |
| 2 | Farmer | Cuộn tới widget **Tiến độ Đội nhóm** |
| 3 | Hệ thống | Widget gọi `GET /api/v1/farmer/dashboard/team-progress` (`FarmerTeamController`) |
| 4 | Hệ thống | Render danh sách đội: tên, khu vực, tổng việc, `ProgressBar` % hoàn thành, dùng `React.key` là `workTeamId` (không phải `teamId` — lỗi cũ đã fix theo memory dự án) |

### 3.3 Business Rule
**BR-B-01:** % hoàn thành = `COUNT(Task.status = DONE) / COUNT(Task) WHERE workTeamId = X`, tính real-time (không cache quá 60s nếu dùng React Query — dùng `staleTime` hợp lý để tránh gọi API dồn dập).

### 3.4 Acceptance Criteria
- [ ] Mở DevTools Console (F12): không xuất hiện warning `Each child in a list should have a unique "key" prop`.
- [ ] Network tab xác nhận đúng 1 lần gọi `/api/v1/farmer/dashboard/team-progress` khi load, không gọi lặp.
- [ ] Dữ liệu hiển thị đúng: Tên Đội, Khu vực (plotName), Tổng số việc, % hoàn thành khớp với dữ liệu Task thực tế.

---

## 4. LUỒNG C — Thu hoạch & Chuỗi cung ứng lạnh (Harvest & Warehouse)

**Trạng thái tổng thể: ✅ Backend đã hoàn chỉnh (drying countdown, tính hao hụt ẩm, cảnh báo kho lạnh, xử lý hàng không đạt chuẩn). Việc còn lại chủ yếu là bổ sung reference-data theo loại cây trồng và đóng gói đặc tả chuẩn để AI/QA đối chiếu.**

### 4.1 Mục tiêu nghiệp vụ
Đảm bảo hàng hoá nông sản (ngũ cốc, rau củ, trái cây) được thu hoạch, nhập kho, tính đúng khối lượng tịnh, cảnh báo đúng điều kiện bảo quản (đặc biệt chuỗi lạnh cho hàng dễ hư hỏng), và có đường xử lý rõ ràng cho hàng không đạt chuẩn.

### 4.2 Data model liên quan

| Entity | Service | Field trọng yếu | Trạng thái |
|---|---|---|---|
| `Harvest` | season-service | `harvestDate, grossWetWeight, netDryWeight, warehouseReceiptStatus(PENDING_RECEIPT/RECEIVED), warehouseReceivedDate, qualityGrade, subStandardQuantity, subStandardDisposition, packagingType, packagingCount, processingType, cropCategory` | ✅ ĐÃ CÓ |
| `Crop` | crop-catalog-service | `postHarvestDelayDays` (số ngày sấy/chờ trước khi được nhập kho) | ✅ ĐÃ CÓ |
| `ProductWarehouseLot` | inventory-service | `initialQuantity, onHandQuantity, expiryDate, cropCategory, packagingType/Count, processingType, status(IN_STOCK/HOLD/DEPLETED/ARCHIVED/AVAILABLE)` | ✅ ĐÃ CÓ |
| `Warehouse` | inventory-service | `storageCategory, temperatureMin/Max, humidityMin/Max` | ✅ ĐÃ CÓ |
| `SubStandardDisposition` (enum) | season-service/inventory-service | `SELL_LIVESTOCK_FEED, COMPOSTING, PROCESSING, DISCARDED, SELL_DISCOUNT` | ✅ ĐÃ CÓ |

### 4.3 Luồng chính — Thu hoạch ngũ cốc (GRAIN) có khoá đếm ngược sấy

| Bước | Actor | Hành động | Kết quả hệ thống |
|---|---|---|---|
| 1 | Farmer | **Thu hoạch** → "Báo cáo Thu hoạch ngoài đồng" → nhập `grossWetWeight` | `Harvest.warehouseReceiptStatus = PENDING_RECEIPT` |
| 2 | Hệ thống | Tính `earliestReceiveDate = harvestDate + crop.postHarvestDelayDays` | Hiển thị trên danh sách Lô Thu hoạch |
| 3 | Farmer | Mở Dropdown "Hành động" trước hạn sấy | Nút **"Xác nhận Nhập kho" bị disabled**, hiện text **"Chờ phơi sấy ({N} ngày)"** |
| 4 | Farmer | Mở lại sau khi đủ ngày sấy | Nút sáng màu xanh **"Xác nhận Nhập kho"** |
| 5 | Farmer | Click → Modal nhập `currentMoisture` (%), `targetMoisture` (%), `mechanicalLoss` (kg, optional) → Xác nhận | Gọi `POST .../receive-to-warehouse` |
| 6 | Hệ thống | `GrainMoistureCalculator` tính `netDryWeight` từ `grossWetWeight`, độ ẩm hiện tại/mục tiêu, hao hụt cơ học | `warehouseReceiptStatus = RECEIVED`, đẩy `ProductWarehouseLot` mới vào kho, nút đổi thành "Đã nhập kho" (khoá vĩnh viễn) |

**BR-C-01:** Công thức tính khối lượng khô tịnh (net dry weight) dùng logic sấy ngũ cốc chuẩn:
`netDryWeight = grossWetWeight × (100 − currentMoisture) / (100 − targetMoisture) − mechanicalLoss`
(Đây là công thức chuẩn ngành đã được `GrainMoistureCalculator` hiện thực — AI **không cần** viết lại, chỉ cần tham chiếu khi viết test hoặc mở rộng cho loại nông sản khác.)

### 4.4 Luồng chính — Thu hoạch rau củ/trái cây (không cần sấy, cần lạnh)

| Bước | Actor | Hành động |
|---|---|---|
| 1 | Farmer | Báo cáo thu hoạch, chọn `cropCategory = VEGETABLE/FRUIT` |
| 2 | Farmer | Nhập `packagingType`, `packagingCount`, `processingType` (sơ chế: rửa/cắt/đóng túi...) ngay khi thu hoạch (khác GRAIN — không cần chờ sấy) |
| 3 | Hệ thống | `ColdChainValidationService.validateStorageCategory(cropCategory, warehouse.storageCategory)` chặn nếu farmer chọn nhập vào kho không đủ điều kiện lạnh cho loại hàng dễ hỏng |
| 4 | Hệ thống | Sau khi nhập kho, tính `hasTemperatureAlert` = `true` nếu nhiệt độ kho ngoài ngưỡng `[temperatureMin, temperatureMax]` cấu hình cho `cropCategory` đó |
| 5 | Hệ thống | Set `expiryDate` dựa trên hạn sử dụng dự kiến của loại hàng |

### 4.5 Luồng cảnh báo kho lạnh

| Bước | Actor | Hành động |
|---|---|---|
| 1 | Warehouse Manager | Vào **Danh sách Lô hàng (Warehouse Lots)** |
| 2 | Hệ thống | Dòng có `hasTemperatureAlert = true` → highlight đỏ/cảnh báo, hiện badge **"Tổn thương do lạnh"**, hiện rõ `expiryDate` |

### 4.6 🔧 Việc mở rộng — Reference data theo loại cây trồng

Ghi chú demo: *"tùy loại cây trồng có kho thu hoạch khác"*, *"Rau củ, hoa quả thì thu hoạch thế nào, đóng gói, nhập kho như thế nào"*. Đây **không phải logic code mới** (logic điều hướng theo `cropCategory` đã có ở `ColdChainValidationService`) mà là **thiếu dữ liệu cấu hình**:

- 🆕 Bổ sung bảng seed `crop_category_storage_profile` (hoặc mở rộng `crop-catalog-service.Crop` với các cột nullable: `defaultStorageCategory`, `requiresColdChain (boolean)`, `shelfLifeDays`) để hệ thống **tự gợi ý** kho phù hợp và tự tính `expiryDate` khi tạo Harvest, thay vì Farmer phải tự nhớ. `[AUTO ≥70%]` — additive, không phá dữ liệu cũ, rất cần thiết để tính năng cold-chain alert hoạt động chính xác cho từng loại cây thay vì chỉ dựa vào `cropCategory` thô.
- Migration đề xuất: `crop-catalog-service: V{n}__add_storage_profile_to_crop.sql` (cột nullable, backward-compatible).
- API mở rộng: `GET /api/v1/crops/{id}` trả thêm field trên (không đổi field cũ).

### 4.7 Luồng xử lý sản phẩm không đạt chuẩn (đã có, mô tả lại để AI không xây trùng)

| Bước | Actor | Hành động |
|---|---|---|
| 1 | Farmer/QC | Trong quá trình phân loại, gắn `subStandardQuantity` + chọn `subStandardDisposition` (vd `SELL_LIVESTOCK_FEED`) cho phần hàng không đạt |
| 2 | Hệ thống | `POST` tới `ProductWarehouseController` → `disposeSubStandardLot()`, sinh `ProductWarehouseTransactionType = SOLD_LIVESTOCK_FEED` (hoặc tương ứng) |
| 3 | Hệ thống | Trừ `onHandQuantity` của lô gốc, ghi nhận giao dịch riêng cho phần hàng loại 2 (không lẫn vào doanh thu hàng đạt chuẩn — quan trọng cho báo cáo tài chính & truy xuất) |

### 4.8 Acceptance Criteria (DoD — Luồng C)
- [ ] Thu hoạch GRAIN đúng khoá đếm ngược, không cho nhập kho sớm (FE disabled + BE validate).
- [ ] Công thức `netDryWeight` cho ra kết quả khớp ví dụ trong kịch bản demo (5000kg ướt, ẩm 25%→14%, hao hụt cơ học 1% → verify bằng unit test đã có `GrainMoistureCalculatorTest` nếu có, hoặc viết bổ sung nếu thiếu).
- [ ] Rau củ/trái cây nhập kho không cần chờ sấy, có `packagingType/Count/processingType`.
- [ ] Kho không đủ điều kiện lạnh bị chặn nhận hàng dễ hỏng (`ColdChainValidationService`).
- [ ] `hasTemperatureAlert` hiển thị đúng badge đỏ trên danh sách lô hàng.
- [ ] (Nếu làm §4.6) `Crop` có storage profile, `expiryDate` khi tạo Harvest được auto-suggest theo `shelfLifeDays`.
## 5. LUỒNG D — Vòng đời Chứng nhận VietGAP (Farm Dossier & Certification Lifecycle)

**Trạng thái tổng thể: 🔧 Nền tảng đã có (checklist, auto-score, apply). 🆕 Phần audit ngoài, khắc phục không phù hợp, cấp giấy, tái kiểm định kỳ, admin duyệt public là VIỆC MỚI TRỌNG TÂM của toàn bộ tài liệu này.**

### 5.1 Mục tiêu nghiệp vụ
Số hoá toàn bộ hành trình một nông trại đạt chứng nhận VietGAP: từ thiết lập hồ sơ, tự đánh giá nội bộ, đăng ký, audit bởi tổ chức chứng nhận (certification body), xử lý điểm không phù hợp (nonconformity), đến khi được cấp giấy và duy trì hiệu lực qua các đợt tái kiểm tra định kỳ. Metadata mặc định hiện bám **TCVN 11892-1:2026**; checklist chi tiết phải tiếp tục được đối chiếu với bản tiêu chuẩn có bản quyền và tổ chức chứng nhận.

### 5.2 Actor
- **Farmer**: chủ hồ sơ, thực hiện tự đánh giá, nộp hồ sơ, khắc phục lỗi.
- **Auditor** (vai trò mới — đại diện tổ chức chứng nhận, có thể là Admin đóng vai hoặc user role riêng): thực hiện đánh giá, ghi nhận nonconformity, xác nhận khắc phục, cấp giấy.
- **Admin (hệ thống nội bộ VietFuture2026)**: duyệt tài liệu trước khi public, giám sát toàn bộ tiến trình, không thay thế vai trò Auditor về mặt pháp lý nhưng kiểm soát dữ liệu hiển thị trên nền tảng.
- **Hệ thống**: tự động tính điểm, tự động cảnh báo hết hạn.

### 5.3 Trạng thái hiện tại (đã verify trong code) — làm nền để mở rộng

```
CertificationRecord.status hiện tại (farm-service):
IN_PROGRESS ──(score ≥ 80%)──► READY_TO_APPLY ──(apply())──► APPLIED
                                                                  │
                                                          (DỪNG Ở ĐÂY — chưa có state tiếp theo)
```
- `CertificationScoringService.autoPopulateFromFieldLogs()`: tự động map Field Log / Soil Test / Water Test / PHI record sang từng `CertificationChecklistItem` (PASS/FAIL/PENDING). **✅ Giữ nguyên, tái sử dụng.**
- `getOrCreateRecord()` mặc định `VIETGAP-PLANTING-2026`, nhận `standardCode` cho luồng đa chuẩn và ánh xạ mã 2024 cũ để tương thích dữ liệu — xem §5.9.

### 5.4 🆕 Mở rộng State Machine — vòng đời đầy đủ `[AUTO ≥70%]`

Bổ sung các state sau `APPLIED` (additive — không đổi 3 state cũ):

```
APPLIED
   │  (Admin/Auditor lên lịch đánh giá)
   ▼
AUDIT_SCHEDULED ──────────────► AUDIT_IN_PROGRESS
                                        │
                        (Auditor kết luận, ghi nhận nonconformity nếu có)
                                        ▼
                     ┌──────────────────┴───────────────────┐
                     ▼                                       ▼
         NONCONFORMITY_FOUND                          AUDIT_PASSED
                     │                                       │
     (Farmer nộp Corrective Action Plan + bằng chứng)        │
                     ▼                                       │
         CORRECTIVE_ACTION_SUBMITTED                         │
                     │                                       │
        (Auditor xác nhận khắc phục đạt/không đạt)           │
                     ▼                                       │
        ┌────────────┴─────────────┐                         │
        ▼                          ▼                         │
  AUDIT_PASSED              REJECTED (phải nộp lại           │
        │                    từ IN_PROGRESS)                 │
        └───────────────────┬─────────────────────────────────┘
                             ▼
                        CERTIFIED  ──(Admin duyệt public)──► PUBLISHED
                             │
                  (định kỳ / gần expiryDate)
                             ▼
                    PERIODIC_REVIEW_DUE ──(nộp hồ sơ định kỳ, đạt)──► CERTIFIED (gia hạn implicit)
                             │
                    (quá hạn không nộp / audit định kỳ FAIL)
                             ▼
                         EXPIRED (hoặc REVOKED nếu vi phạm nghiêm trọng)
```

### 5.5 Data model mới (additive, `farm-service`, cùng schema `farm_db` với `CertificationRecord`)

**Migration mới:** `farm-service/src/main/resources/db/migration/V{n}__certification_audit_workflow.sql`

| Bảng mới | Field | Kiểu | Ghi chú |
|---|---|---|---|
| `certification_audits` | `id` PK | BIGINT IDENTITY | |
| | `record_id` | INT FK → `certification_records.id` | |
| | `audit_type` | VARCHAR(30) | `INITIAL`, `PERIODIC`, `RE_AUDIT` |
| | `scheduled_date` | DATE | |
| | `auditor_user_id` | BIGINT | user đóng vai Auditor |
| | `auditor_org_name` | VARCHAR(255) | tên tổ chức chứng nhận |
| | `status` | VARCHAR(30) | `SCHEDULED, IN_PROGRESS, PASSED, FAILED` |
| | `interview_notes` | TEXT | ghi chú phỏng vấn |
| | `sample_collection_notes` | TEXT | ghi chú lấy mẫu |
| | `conducted_at` | DATETIME | |
| | `created_at/updated_at` | DATETIME | |
| `certification_nonconformities` | `id` PK | | |
| | `audit_id` | FK → `certification_audits.id` | |
| | `checklist_item_id` | FK → `certification_checklist_items.id`, nullable | liên kết tới đúng tiêu chí bị lỗi nếu có |
| | `severity` | VARCHAR(20) | `MINOR, MAJOR, CRITICAL` |
| | `description` | TEXT | |
| | `status` | VARCHAR(30) | `OPEN, CORRECTIVE_ACTION_SUBMITTED, RESOLVED, REJECTED` |
| | `created_at` | DATETIME | |
| `certification_corrective_actions` | `id` PK | | |
| | `nonconformity_id` | FK | |
| | `plan_description` | TEXT | kế hoạch khắc phục |
| | `evidence_urls` | TEXT (JSON array) | tái dùng MinIO storage sẵn có (giống `FarmDocument.fileUrl`) |
| | `applies_from_season_id` | INT, nullable | "khắc phục ở mùa vụ sau" — liên kết season-service qua ID tham chiếu, không FK cross-db |
| | `submitted_by_user_id` | BIGINT | |
| | `submitted_at` | DATETIME | |
| | `reviewed_by_user_id` | BIGINT, nullable | Auditor xác nhận |
| | `review_result` | VARCHAR(20), nullable | `ACCEPTED, REJECTED` |
| | `reviewed_at` | DATETIME, nullable | |

**Mở rộng bảng cũ (additive, cột nullable):**
- `certification_records`: thêm `certificate_number VARCHAR(100) NULL`, `certificate_document_id INT NULL` (FK tới `farm_documents.id` — liên kết file giấy chứng nhận đã upload), `next_periodic_review_date DATE NULL`, `published_at DATETIME NULL`, `published_by_user_id BIGINT NULL`.

### 5.6 Luồng chi tiết từng bước

#### Bước D1 — Thiết lập Hồ sơ Nông trại (Farm Dossier) — ✅ đã có, mô tả lại
1. Farmer tạo Farm + Plot + Season (đã có).
2. Farmer vào tab **Hồ sơ nông trại** → xem `CertificationDetailsResponse` (tự động điền % từ Field Log/Soil Test/Water Test/PHI).
3. Farmer bổ sung thủ công các mục chưa tự động điền được (`updateItemStatus`), đính kèm bằng chứng (`evidenceUrl`).
4. Khi `complianceScore ≥ 80%` → trạng thái tự chuyển `READY_TO_APPLY`, nút "Đăng ký chứng nhận" (`apply()`) được bật.

#### Bước D2 — Đăng ký & Audit bởi tổ chức chứng nhận — 🆕 MỚI `[AUTO ≥70%]`
1. Farmer bấm "Đăng ký chứng nhận" → `status = APPLIED` (đã có).
2. **[MỚI]** Admin/Auditor vào màn hình quản trị chứng nhận, thấy danh sách hồ sơ `APPLIED`, tạo lịch đánh giá:
   `POST /api/v1/farms/{farmId}/certification/audits` — body: `{auditType, scheduledDate, auditorUserId, auditorOrgName}` → tạo `certification_audits` record, `CertificationRecord.status = AUDIT_SCHEDULED`.
3. Đến ngày, Auditor mở hồ sơ, ghi `interviewNotes`, `sampleCollectionNotes`, đối chiếu từng checklist item với thực địa:
   `PUT /api/v1/certification-audits/{auditId}/start` → `status = AUDIT_IN_PROGRESS`, `record.status = AUDIT_IN_PROGRESS`.
4. Auditor kết luận:
   - Nếu **không phát hiện lỗi** → `PUT /api/v1/certification-audits/{auditId}/complete` với `{result: PASSED}` → `audit.status = PASSED`, `record.status = AUDIT_PASSED`.
   - Nếu **phát hiện điểm không phù hợp** → với mỗi lỗi, gọi `POST /api/v1/certification-audits/{auditId}/nonconformities` body `{checklistItemId?, severity, description}` → tạo `certification_nonconformities` (status `OPEN`). Sau khi ghi hết lỗi, `complete` với `{result: FAILED}` → `record.status = NONCONFORMITY_FOUND`.

**BR-D-01:** Nếu có bất kỳ nonconformity `severity = CRITICAL` nào đang `OPEN`, hồ sơ **không được** chuyển sang `CERTIFIED` dù các lỗi khác đã resolved.

#### Bước D3 — Khắc phục điểm không phù hợp (Corrective Action) — 🆕 MỚI `[AUTO ≥70%]`
> Đúng theo note gốc trong kịch bản demo: *"Khắc phục các điểm không phù hợp, khắc phục như thế nào ở mùa vụ sau (plan, edit, bằng chứng, upload)"*.

1. Farmer xem danh sách nonconformity `OPEN` của hồ sơ mình: `GET /api/v1/farms/{farmId}/certification/nonconformities`.
2. Với mỗi lỗi, Farmer soạn **kế hoạch khắc phục**: mô tả cách sửa, có thể gắn với **mùa vụ kế tiếp** nếu lỗi cần thời gian canh tác mới để chứng minh (vd lỗi về luân canh), upload bằng chứng (ảnh/tài liệu, tái dùng MinIO uploader sẵn có của `FarmDocumentController`):
   `POST /api/v1/certification-nonconformities/{id}/corrective-actions` body `{planDescription, evidenceUrls[], appliesFromSeasonId?}` → tạo `certification_corrective_actions` (chưa submit).
3. Farmer có thể **sửa (edit)** kế hoạch nhiều lần trước khi nộp chính thức: `PUT /api/v1/certification-corrective-actions/{id}`.
4. Farmer nộp chính thức: `POST /api/v1/certification-corrective-actions/{id}/submit` → `nonconformity.status = CORRECTIVE_ACTION_SUBMITTED`; nếu tất cả nonconformity của audit đều ở trạng thái này → `record.status = CORRECTIVE_ACTION_SUBMITTED`.
5. Auditor xem xét, xác nhận: `PUT /api/v1/certification-corrective-actions/{id}/review` body `{result: ACCEPTED|REJECTED, reviewNote}`.
   - Nếu **tất cả** corrective action của audit đều `ACCEPTED` → `record.status = AUDIT_PASSED`.
   - Nếu có action `REJECTED` → nonconformity quay lại `OPEN`, Farmer làm lại bước 2 (giới hạn số vòng lặp hợp lý — đề xuất tối đa 3 vòng trước khi hồ sơ bị `REJECTED` toàn bộ và phải nộp lại từ đầu — `[CẦN XÁC NHẬN]` với PO về số vòng tối đa).

#### Bước D4 — Cấp giấy chứng nhận — 🔧 MỞ RỘNG `[AUTO ≥70%]`
1. Khi `record.status = AUDIT_PASSED`, Auditor cấp giấy:
   `POST /api/v1/farms/{farmId}/certification/issue` body `{certificateNumber, issuedDate, expiryDate, certificateDocumentId}` → `record.status = CERTIFIED`, set `certifiedAt`, `expiryDate`, `certificateNumber`.
2. Farmer tải lên file giấy chứng nhận PDF/ảnh (tái dùng `FarmDocumentController.uploadDocument` với `documentType = CERTIFICATE`), liên kết `certificateDocumentId` vào `CertificationRecord`.
3. Farmer cũng tải lên kết quả xét nghiệm nước, hồ sơ đất vào cùng tab Hồ sơ nông trại (`documentType = WATER_TEST_REPORT`, `SOIL_TEST_REPORT` — **đã có sẵn enum `FarmDocumentType`**, không cần thêm).

#### Bước D5 — Admin duyệt trước khi Public — 🔧 MỞ RỘNG `[AUTO ≥70%]`
> Note gốc: *"Admin kiểm tra đối chiếu đúng chưa và duyệt tài liệu chứng nhận VietGAP này trước khi cho phép public."*

1. `FarmDocument.verificationStatus` mặc định `PENDING` (đã có cột, chưa có endpoint) → thêm endpoint admin:
   `PATCH /api/v1/admin/farms/{farmId}/documents/{documentId}/verify` body `{status: VERIFIED|REJECTED, note}`.
2. Với riêng tài liệu `CERTIFICATE` gắn vào `CertificationRecord`, khi Admin `VERIFIED` → hệ thống tự động set `record.status = PUBLISHED`, `publishedAt`, `publishedByUserId`.
3. **BR-D-02:** Chỉ khi `record.status = PUBLISHED` thì badge "VietGAP còn hiệu lực" mới được phép hiển thị công khai trên Marketplace/trang truy xuất (liên kết trực tiếp tới Luồng G và Luồng H).

#### Bước D6 — Kiểm tra định kỳ (Periodic Review) — 🆕 MỚI `[CẦN XÁC NHẬN tần suất]`
> Note gốc: *"Kiểm tra định kỳ, những hồ sơ đúng chuẩn chưa? upload hồ sơ kiểm tra định kỳ, có người lại kiểm tra nhân viên."*

1. Hệ thống (scheduled job, có thể tái dùng cơ chế cron/notification đã có ở `incident-service` cho cảnh báo hết hạn tài liệu) tính `next_periodic_review_date` (đề xuất mặc định: 6 tháng sau `certifiedAt`, cấu hình được — **cần PO xác nhận chu kỳ chính thức theo quy định VietGAP thực tế**, tạm đề xuất theo thông lệ ngành).
2. Đến hạn, `record.status = PERIODIC_REVIEW_DUE`, sinh cảnh báo trên Dashboard Farmer (tái dùng cơ chế alert đã có ở `incident-service`/`AdminAlertService`).
3. Farmer upload hồ sơ kiểm tra định kỳ mới (tái dùng `FarmDocumentType`, thêm giá trị enum mới `PERIODIC_INSPECTION` — additive enum value).
4. Một **Auditor/nhân sự giám sát khác** (không nhất thiết là người audit ban đầu — đúng ý "có người lại kiểm tra nhân viên") thực hiện review tương tự Bước D2 nhưng với `audit_type = PERIODIC`. Nếu đạt → `record.status = CERTIFIED` (gia hạn hiệu lực), nếu không đạt và quá hạn → `record.status = EXPIRED`.

#### Bước D7 — Cảnh báo hết hạn — ✅ nền tảng đã có, chỉ cần nối dữ liệu mới
`FarmDocumentController` đã có `GET /api/v1/farms/{farmId}/documents/expiring` — mở rộng logic tương tự cho `CertificationRecord.expiryDate` để cảnh báo trước 30/15/7 ngày trên Dashboard Farmer, đúng như note *"Trước ngày đó có cảnh báo để kiểm tra"* (liên kết trực tiếp Luồng G — chặn Marketplace).

### 5.7 🔧 Hỗ trợ đa chuẩn chứng nhận (VietGAP + Hữu cơ + GlobalGAP)
Ghi chú demo có nhắc "giấy chứng nhận hữu cơ". `CertificationStandard.type` và API backend đã hỗ trợ nhận `standardCode`; mặc định hiện là `VIETGAP-PLANTING-2026` và giữ alias mã cũ.

- 🔧 Đổi chữ ký hàm thành `getOrCreateRecord(Integer farmId, String standardCode)` (overload giữ bản cũ gọi mặc định VietGAP để **không phá code đang gọi hàm này**), cho phép Farmer chọn đăng ký thêm chuẩn Hữu cơ song song. `[AUTO ≥70%]` — additive, rủi ro thấp, giá trị nghiệp vụ rõ ràng (đã có sẵn trong plan gốc của dự án).
- Cần seed thêm `CertificationStandard` cho `ORGANIC` + checklist tương ứng (dữ liệu, không phải code logic).

### 5.8 API Contract tổng hợp (mới, tuân theo convention `/api/v1/farms/{farmId}/certification/...` đã có)

| Method | Path | Mô tả | Trạng thái |
|---|---|---|---|
| GET | `/api/v1/farms/{farmId}/certification` | Lấy chi tiết + auto-populate score | ✅ ĐÃ CÓ |
| PUT | `/api/v1/farms/{farmId}/certification/items/{itemId}` | Cập nhật 1 checklist item | ✅ ĐÃ CÓ |
| POST | `/api/v1/farms/{farmId}/certification/apply` | Đăng ký chứng nhận | ✅ ĐÃ CÓ |
| POST | `/api/v1/farms/{farmId}/certification/audits` | Auditor/Admin lên lịch audit | 🆕 MỚI |
| PUT | `/api/v1/certification-audits/{auditId}/start` | Bắt đầu audit | 🆕 MỚI |
| PUT | `/api/v1/certification-audits/{auditId}/complete` | Kết luận audit (PASSED/FAILED) | 🆕 MỚI |
| POST | `/api/v1/certification-audits/{auditId}/nonconformities` | Ghi nhận lỗi không phù hợp | 🆕 MỚI |
| GET | `/api/v1/farms/{farmId}/certification/nonconformities` | Farmer xem lỗi cần khắc phục | 🆕 MỚI |
| POST | `/api/v1/certification-nonconformities/{id}/corrective-actions` | Tạo kế hoạch khắc phục (nháp) | 🆕 MỚI |
| PUT | `/api/v1/certification-corrective-actions/{id}` | Sửa kế hoạch trước khi nộp | 🆕 MỚI |
| POST | `/api/v1/certification-corrective-actions/{id}/submit` | Nộp chính thức | 🆕 MỚI |
| PUT | `/api/v1/certification-corrective-actions/{id}/review` | Auditor xác nhận đạt/không đạt | 🆕 MỚI |
| POST | `/api/v1/farms/{farmId}/certification/issue` | Cấp giấy chứng nhận | 🆕 MỚI |
| PATCH | `/api/v1/admin/farms/{farmId}/documents/{documentId}/verify` | Admin duyệt tài liệu (kể cả giấy chứng nhận) | 🆕 MỚI |
| POST | `/api/v1/farms/{farmId}/certification/periodic-reviews` | Khởi tạo đợt kiểm tra định kỳ | 🆕 MỚI |

### 5.9 Event (RabbitMQ) mới — theo pattern `{domain}.{entity}.{action}` đã dùng
- `farm.certification.audit_scheduled`
- `farm.certification.nonconformity_recorded`
- `farm.certification.corrective_action_submitted`
- `farm.certification.certified` — **admin-reporting-service** subscribe để cập nhật read-model; **marketplace-service** subscribe để invalidate cache trạng thái chứng nhận đang lưu (nếu marketplace có cache — nếu gọi Feign real-time thì không cần).
- `farm.certification.expired`
- `farm.document.verified` — thay thế/bổ sung cho `farm.document.uploaded` đã có.

### 5.10 Phân quyền (role-based access)
| Role | Quyền |
|---|---|
| Farmer | CRUD checklist item của farm mình, apply, xem nonconformity, tạo/sửa/nộp corrective action, upload document |
| Auditor (role mới hoặc Admin đóng vai) | Tạo/thực hiện audit, ghi nonconformity, review corrective action, issue certificate |
| Admin | Verify document, publish certificate ra public, xem toàn bộ hồ sơ mọi farm |
| Buyer/Public | Chỉ đọc trạng thái `PUBLISHED` qua trang truy xuất (Luồng H) — không thấy `auditorNotes`, `interviewNotes`, chi phí nội bộ |

**BR-D-03 (bảo mật dữ liệu):** `interviewNotes`, `sampleCollectionNotes`, `auditorNotes`, và mọi field liên quan tới quy trình đánh giá nội bộ **tuyệt đối không được** trả về trong endpoint public (`/trace/{traceCode}` — Luồng H). Chỉ trả: tên chuẩn, trạng thái, ngày cấp/hết hạn, số giấy chứng nhận.

### 5.11 Acceptance Criteria (DoD — Luồng D)
- [ ] Toàn bộ state machine §5.4 implement đúng, có transition guard (không cho nhảy state tuỳ tiện qua endpoint).
- [ ] Farmer không tự issue được giấy chứng nhận cho chính mình (chỉ role Auditor/Admin).
- [ ] Nonconformity CRITICAL còn `OPEN` thì không thể `issue`.
- [ ] Corrective action lưu được nhiều bằng chứng, liên kết đúng mùa vụ tương lai nếu có.
- [ ] Document `CERTIFICATE` phải qua `VERIFIED` mới khiến `record.status = PUBLISHED`.
- [ ] Badge công khai chỉ hiện khi `PUBLISHED`, không lộ dữ liệu nội bộ (BR-D-03).
- [ ] Hỗ trợ đăng ký song song nhiều chuẩn (`VietGAP` + `Organic`) không đè dữ liệu lên nhau.
## 6. LUỒNG E — Nhật ký Sản xuất hợp nhất & AI hỗ trợ

**Trạng thái tổng thể: ✅ Dữ liệu nguồn đã có rải rác ở nhiều service. 🆕 Cần 1 lớp hợp nhất (aggregation) + nối AI vào luồng ghi nhật ký.**

### 6.1 Mục tiêu nghiệp vụ
Nông dân cần **một nơi duy nhất** để xem toàn bộ "nhật ký đồng ruộng" theo dòng thời gian (cấy/gieo, bón phân, phun thuốc, tưới nước, sơ chế...), thay vì phải vào nhiều trang riêng lẻ. Từ nhật ký này, hệ thống tự động suy ra hồ sơ VietGAP (đã có ở Luồng D) và hỗ trợ AI phát hiện sâu bệnh kịp thời.

### 6.2 Hiện trạng nguồn dữ liệu (đã verify — KHÔNG xây lại)

| Loại nhật ký | Entity/Service đã có | Trạng thái |
|---|---|---|
| Nhật ký đồng ruộng chung | `FieldLog` (season-service) | ✅ ĐÃ CÓ |
| Nhật ký thuốc BVTV (kèm PHI) | `PesticideRecord` (season-service) | ✅ ĐÃ CÓ |
| Nhật ký phân bón / dinh dưỡng | `NutrientInputEvent` (sustainability-service) | ✅ ĐÃ CÓ |
| Hồ sơ nước tưới | `IrrigationWaterAnalysis` (sustainability-service) | ✅ ĐÃ CÓ |
| Kiểm nghiệm đất | `SoilTest` (sustainability-service) | ✅ ĐÃ CÓ |
| Giống cây trồng | `crop-catalog-service` (Crop/Variety) | ✅ ĐÃ CÓ |
| Sơ chế | `Harvest.processingType` (season-service) | ✅ ĐÃ CÓ |
| Ghi nhận dịch bệnh | `DiseaseRecordService` (đề cập trong service inventory cũ — cần verify còn tồn tại sau tách microservice; nếu không còn, coi là 🆕 nhỏ, tái dùng `FieldLog` với `logType=DISEASE`) | 🔧 verify lại |

### 6.3 🆕 Bước E1 — Timeline Nhật ký Sản xuất hợp nhất `[AUTO ≥70%]`

Đây là 1 **read-model tổng hợp** (aggregation layer), không di chuyển dữ liệu gốc khỏi service chủ quản (giữ đúng domain boundary).

- **Vị trí đặt logic:** đề xuất đặt tại `season-service` (vì season là trục thời gian chính của canh tác) dưới dạng 1 service mới `ProductionDiaryAggregationService`, gọi Feign tới `sustainability-service` (nutrient/irrigation/soil) và `crop-catalog-service`, kết hợp dữ liệu `FieldLog`/`PesticideRecord`/`Harvest` nội bộ đã có.
- **API mới:** `GET /api/v1/farmer/seasons/{seasonId}/production-diary?from=&to=&type=` — trả về danh sách sự kiện hợp nhất, mỗi phần tử:
  ```json
  {
    "eventDate": "2026-07-01",
    "eventType": "FERTILIZER | PESTICIDE | IRRIGATION | FIELD_LOG | HARVEST | SOIL_TEST",
    "title": "...",
    "sourceService": "sustainability-service",
    "sourceId": 123,
    "detailUrl": "/api/v1/..." 
  }
  ```
- **FE:** trang `ProductionDiaryPage.tsx` (mới) dạng timeline, filter theo loại, mỗi item click-through về đúng trang chi tiết hiện có (không xây lại form nhập liệu — chỉ tổng hợp hiển thị).
- **Lý do necessity cao:** đây chính là nguồn dữ liệu `CertificationScoringService.autoPopulateFromFieldLogs()` đang dùng ngầm — hiển thị lại cho Farmer thấy **tại sao** checklist của họ PASS/FAIL, tăng tính minh bạch, giảm thắc mắc.

### 6.4 🆕 Bước E2 — Xuất Hồ sơ (Dossier Export) `[CẦN XÁC NHẬN định dạng]`

> Note gốc: *"generate từ nhật ký sản xuất ra toàn bộ hồ sơ"*.

1. Farmer bấm "Xuất hồ sơ VietGAP" trên trang Nhật ký Sản xuất hoặc trang Hồ sơ nông trại.
2. Hệ thống tổng hợp: `CertificationDetailsResponse` (Luồng D) + toàn bộ `production-diary` trong khoảng thời gian mùa vụ + danh sách `FarmDocument` đã `VERIFIED` → sinh 1 file PDF/ZIP (tái dùng thư viện tạo PDF nếu backend Java đã có sẵn dependency tương tự, nếu chưa có thì đây là phần cần thêm dependency — cân nhắc dùng cùng cơ chế export report đã có ở `admin-reporting-service` nếu tồn tại, tránh thêm thư viện mới trùng chức năng).
3. API mới: `POST /api/v1/farms/{farmId}/certification/export-dossier` → trả về `documentUrl` (lưu MinIO), đồng thời tạo `FarmDocument` mới `documentType = OTHER` (hoặc thêm enum `EXPORTED_DOSSIER`) để lưu vết đã xuất khi nào, phục vụ audit.
4. `[CẦN XÁC NHẬN]` với PO: định dạng xuất (PDF đơn giản liệt kê hay cần đúng biểu mẫu hành chính VietGAP chính thức?) — MVP nên làm PDF liệt kê đầy đủ dữ liệu trước, biểu mẫu chuẩn hoá là việc giai đoạn sau.

### 6.5 🔧 Bước E3 — Tích hợp AI vào luồng ghi nhật ký `[AUTO ≥70%]`

> Note gốc: *"trường hợp đột xuất phát hiện có sâu đề nghị thuốc bảo vệ, nhận diện hình ảnh sâu bệnh dùng api có sẵn"*, *"AI đề xuất loại phân bón, thuốc bảo vệ an toàn cho cây và người dùng"*.

`ai-service` đã có `InternalImageAnalysisRequest` + `GeminiService` — **năng lực AI đã tồn tại**, việc còn lại là **nối luồng** (orchestration), không phải xây model/API AI mới:

| Bước | Actor | Hành động |
|---|---|---|
| 1 | Farmer | Trong màn hình ghi Field Log, thấy nút "Chẩn đoán bằng AI" (component sẵn có theo `src/entities/ai`, `src/features/ai` trong FE) |
| 2 | Farmer | Chụp/upload ảnh cây bị nghi sâu bệnh |
| 3 | FE | Gọi `ai-service` (route hiện có qua API Gateway) với ảnh |
| 4 | `ai-service` | `GeminiService` phân tích, trả về: tên bệnh/sâu nghi ngờ, mức độ tin cậy, **đề xuất thuốc BVTV an toàn** (tên hoạt chất) |
| 5 | 🆕 FE/BE mới | Farmer xem đề xuất, bấm "Tạo nhật ký thuốc từ đề xuất này" → **tự động điền sẵn** form `CreatePesticideRecordRequest` (tên thuốc, ngày dự kiến phun) từ kết quả AI, Farmer chỉ cần xác nhận + điền ngày thực tế → giảm thao tác nhập liệu thủ công |
| 6 | Hệ thống | Lưu `PesticideRecord` như luồng bình thường (không đổi entity/API cũ) → PHI tự động tính lại (Luồng F) |

- **Việc code mới thực sự** ở bước 5: 1 hàm mapping `AiDiseaseSuggestionResponse → CreatePesticideRecordRequest` (prefill), thuần FE hoặc 1 endpoint nhỏ trung gian nếu cần enrich thêm dữ liệu PHI reference (`PesticidePHIReferenceRepository` đã có, tra theo tên hoạt chất AI đề xuất để tự điền luôn `phiDays`).

### 6.6 Acceptance Criteria (DoD — Luồng E)
- [ ] Trang Nhật ký Sản xuất hợp nhất hiển thị đúng dữ liệu từ ≥ 4 service nguồn, không sai lệch, không trùng lặp.
- [ ] Xuất hồ sơ tạo ra file tải về được, lưu vết trong `FarmDocument`.
- [ ] Từ ảnh chẩn đoán AI, Farmer tạo được `PesticideRecord` với tối đa 2 thao tác xác nhận (không phải gõ lại tên thuốc).
- [ ] PHI tự động tính lại đúng ngay sau khi tạo `PesticideRecord` từ gợi ý AI (dùng chung logic Luồng F, không viết logic PHI thứ 2).

---

## 7. LUỒNG F — Cổng An toàn Thu hoạch (PHI Harvest Gate)

**Trạng thái tổng thể: ✅ ĐÃ CÓ ĐẦY ĐỦ, đã có unit test. Chương này mô tả lại chính xác để AI KHÔNG viết lại, chỉ cần verify UI cảnh báo.**

### 7.1 Mục tiêu nghiệp vụ
Ngăn chặn nông dân thu hoạch sớm hơn thời gian cách ly an toàn (Pre-Harvest Interval) sau khi phun thuốc BVTV/bón phân, đảm bảo dư lượng dưới ngưỡng MRL theo yêu cầu VietGAP.

### 7.2 Data model (đã có)
- `PesticideRecord(seasonId, pesticideName, applicationDate, phiDays, harvestAllowedDate)` — `harvestAllowedDate` tính sẵn = `applicationDate + phiDays`.
- `PesticidePHIReference` — bảng tra cứu ~200+ loại thuốc phổ biến VN kèm PHI mặc định.
- `PHIHarvestValidationService` — logic chặn, đã có `PHIHarvestValidationServiceTest`.

### 7.3 Luồng chính

| Bước | Actor | Hành động |
|---|---|---|
| 1 | Farmer | Ghi nhận `PesticideRecord`: chọn thuốc (autocomplete từ `PesticidePHIReference`, tự điền `phiDays` mặc định, Farmer có thể sửa nếu thuốc đặc thù), ngày phun |
| 2 | Hệ thống | Tính `harvestAllowedDate = applicationDate + phiDays`, lưu lại |
| 3 | Farmer | Ở ngày bất kỳ, thử tạo `Harvest` record cho season đó |
| 4 | Hệ thống | `PHIHarvestValidationService` quét **tất cả** `PesticideRecord` chưa hết hạn cách ly của season → nếu `harvestDate < MAX(harvestAllowedDate)` của bất kỳ record nào → **chặn**, trả lỗi nghiệp vụ |
| 5 | FE | Hiện thông báo rõ ràng: **tên vật tư gây chặn, ngày đã phun, số ngày cách ly yêu cầu, ngày an toàn có thể thu hoạch** |

**BR-F-01:** Công thức chặn = `max(applicationDate + requiredIntervalDays)` trên **toàn bộ** pesticide record active của season, không chỉ record mới nhất.

### 7.4 Mã lỗi đề xuất (nếu chưa có, verify trong `ErrorCode` của season-service)
`HARVEST_BLOCKED_BY_PHI` — kèm payload chi tiết (`pesticideName`, `appliedDate`, `requiredIntervalDays`, `earliestSafeDate`) để FE render đúng thông báo trong kịch bản demo, không chỉ trả message chung chung.

### 7.5 🔧 Widget "Việc quan trọng hôm nay" trên Dashboard — cần verify/bổ sung

> Note gốc: *"Trên Dashboard của nông dân xuất hiện khối 'Việc quan trọng hôm nay' cảnh báo về PHI đang active và các thao tác thu hoạch đang bị chặn."*

- Kiểm tra `SeasonTaskPanels.tsx` / dashboard hiện tại đã có mục cảnh báo PHI-blocking chưa.
- Nếu chưa: thêm 1 endpoint tổng hợp nhỏ `GET /api/v1/farmer/dashboard/phi-alerts` (season-service) trả về danh sách season đang có pesticide record chưa qua `harvestAllowedDate`, kèm số ngày còn lại — tái dùng `PHIHarvestValidationService` logic, chỉ đổi chiều truy vấn (liệt kê thay vì chặn). `[AUTO ≥70%]`.

### 7.6 Acceptance Criteria (DoD — Luồng F)
- [ ] Tạo Harvest trước ngày an toàn bị chặn với message đầy đủ 4 thông tin (tên thuốc/ngày phun/số ngày cách ly/ngày an toàn).
- [ ] Sau ngày an toàn, tạo Harvest bình thường.
- [ ] Dashboard hiển thị cảnh báo PHI đang active trước khi Farmer thao tác thử (chủ động, không đợi bị chặn mới biết).
## 8. LUỒNG G — Cổng Kiểm duyệt Marketplace (Compliance Gate)

**Trạng thái tổng thể: 🆕 VIỆC MỚI TRỌNG TÂM. Dữ liệu nguồn (chứng nhận, PHI) đã có sẵn qua Feign client, nhưng logic enforcement (chặn duyệt) HOÀN TOÀN CHƯA TỒN TẠI trong `MarketplaceServiceImpl`.**

### 8.1 Mục tiêu nghiệp vụ
Marketplace **không được phép** để lọt sản phẩm gắn nhãn "đạt chuẩn" (VietGAP/Hữu cơ) nếu chứng nhận đã hết hạn, chưa được cấp, hoặc lô hàng vi phạm thời gian cách ly PHI — và phải cho Admin biết **chính xác lý do** một farm chưa đủ điều kiện, thay vì kiểm tra thủ công.

### 8.2 Bằng chứng hiện trạng (đã verify trực tiếp code)

```java
// marketplace-service/.../MarketplaceServiceImpl.java — updateAdminProductStatus()
public MarketplaceProductDetailResponse updateAdminProductStatus(Long productId, MarketplaceUpdateProductStatusRequest request) {
    MarketplaceProduct product = marketplaceProductRepository.findById(productId)...
    product.setStatus(request.status());          // ⚠️ SET VÔ ĐIỀU KIỆN — KHÔNG CÓ VALIDATION
    ...
    return toProductDetail(product);
}
```

Trong khi đó, **dữ liệu để validate đã sẵn sàng**:
- `marketplace-service/.../client/FarmClient.java` (Feign) — đã có kết nối tới `farm-service`.
- `marketplace-service/.../dto/client/FarmCertificationDto.java` — đã có `(certificationName, certificationType, status, issuedDate, expiryDate, complianceScore)`.
- `marketplace-service/.../client/SeasonClient.java` — đã có kết nối tới `season-service` (có thể lấy trạng thái PHI của harvest liên quan).
- `marketplace-service/.../dto/client/PesticideRecordDto.java` — đã có sẵn DTO.

**Kết luận: đây là bài toán "nối dây" (wiring) + business rule, không phải xây hạ tầng liên service từ đầu.**

### 8.3 🆕 Thiết kế Compliance Gate `[AUTO ≥70%]`

#### 8.3.1 Luồng chính

| Bước | Actor | Hành động |
|---|---|---|
| 1 | Farmer | Tạo `MarketplaceProduct`, gắn nhãn tuân thủ mong muốn (`complianceClaim: VIETGAP \| ORGANIC \| NONE`), liên kết `lotCode`/`harvestId` để truy xuất |
| 2 | Farmer | Đưa sản phẩm vào hàng chờ duyệt (`status → PENDING_REVIEW`, luồng cũ giữ nguyên) |
| 3 | Admin | Mở màn hình duyệt, bấm "Duyệt" → gọi `PATCH /api/v1/marketplace/admin/products/{id}/status` với `status=PUBLISHED` (endpoint cũ, **request/response giữ nguyên contract**) |
| 4 | 🆕 Hệ thống | **Trước khi set status**, `MarketplaceComplianceGateService` (mới) chạy các kiểm tra: |
| 4a | | Nếu `product.complianceClaim = VIETGAP` → gọi `FarmClient.getCertification(farmId, "VIETGAP")`: nếu không tồn tại hoặc `status != PUBLISHED` (theo state machine Luồng D) hoặc `expiryDate < today` → **chặn**, mã lỗi `CERTIFICATION_EXPIRED` hoặc `CERTIFICATION_MISSING` |
| 4b | | Nếu sản phẩm liên kết `harvestId` → gọi `SeasonClient` kiểm tra harvest đó có bị PHI-block tại thời điểm thu hoạch không (đối chiếu `PesticideRecordDto`) — nếu có vi phạm PHI đã xảy ra → **chặn**, mã lỗi `PHI_VIOLATION_DETECTED` (đây là guard bổ sung phòng trường hợp harvest được tạo trước khi PHI Gate được bật, hoặc dữ liệu bị chỉnh sửa sau) |
| 5a | Hệ thống | Nếu **PASS** cả 2 kiểm tra → set status như luồng cũ, kèm badge tuân thủ được **"khoá cứng"** vào snapshot của product (xem BR-G-02) |
| 5b | Hệ thống | Nếu **FAIL** → trả lỗi 409/422 kèm mã lỗi cụ thể + thông tin chi tiết (tên chứng nhận, ngày hết hạn) → **KHÔNG** set status, sản phẩm **không được duyệt public với nhãn "đạt chuẩn"**, không hiển thị badge cho người mua (đúng yêu cầu kịch bản demo) |

**BR-G-01:** Nếu `product.complianceClaim = NONE` (nông dân không gắn nhãn tuân thủ, bán hàng thường) → **bỏ qua** bước 4a/4b, cho duyệt bình thường theo luồng cũ (không được phá vỡ trường hợp sản phẩm không cần chứng nhận).

**BR-G-02 (Snapshot an toàn thu hoạch):** Khi duyệt PASS, hệ thống lưu lại **bản snapshot** tại đúng thời điểm duyệt (`certificationSnapshotJson`, `harvestSafetySnapshotJson` — cột mới trên `MarketplaceProduct`, TEXT nullable) để nếu chứng nhận hết hạn *sau đó*, sản phẩm **đã bán** vẫn giữ được lịch sử đúng cho trang truy xuất — không hồi tố (retroactive) badge của đơn hàng cũ. Đây chính là *"Hệ thống lưu lại bản snapshot đánh giá an toàn đính kèm vào lô hàng này"* trong Kịch bản 1 của kịch bản demo — cần implement đúng ở bước Harvest Gate (Luồng C/F) **và** nhắc lại ở đây để Marketplace không phá vỡ snapshot khi hiển thị lại.

#### 8.3.2 Data model mới

| Bảng/cột | Field | Ghi chú |
|---|---|---|
| `marketplace_products` (mở rộng) | `compliance_claim VARCHAR(20) NULL` | `VIETGAP, ORGANIC, NONE` |
| | `certification_snapshot_json TEXT NULL` | snapshot tại thời điểm duyệt |
| | `harvest_safety_snapshot_json TEXT NULL` | snapshot PHI tại thời điểm duyệt |
| | `compliance_checked_at DATETIME NULL` | |

Migration: `marketplace-service: V{n}__add_compliance_gate_fields.sql` (additive, giữ đúng nguyên tắc §0.3 mục 1 — khớp với `V7__marketplace_extensions.sql` đã dự kiến trong `plan3&4.md`).

#### 8.3.3 API Contract

| Method | Path | Thay đổi |
|---|---|---|
| PATCH | `/api/v1/marketplace/admin/products/{productId}/status` | 🔧 **Contract request/response giữ nguyên** — chỉ thêm validation nội bộ + response lỗi mới khi FAIL. Không breaking change cho FE đang gọi. |
| GET | `/api/v1/marketplace/admin/products/{productId}/compliance-check` | 🆕 MỚI — cho phép Admin **xem trước** kết quả kiểm tra compliance mà không cần thử duyệt (dry-run), trả `{eligible: boolean, reasons: [...]}" |

### 8.4 🆕 Compliance Completeness Score & Missing Evidence — TÁI SỬ DỤNG, không xây điểm số song song `[AUTO ≥70%]`

> Note gốc: *"Sustainability Service tính điểm complianceCompletenessScore... báo cáo nông trại bị thiếu chứng từ nước tưới (missingEvidenceCount)."*

**Quyết định kiến trúc quan trọng:** kịch bản demo gợi ý đặt tại `sustainability-service`, nhưng **audit code cho thấy** `CertificationScoringService` (farm-service) đã tính `complianceScore` dựa trên đúng các checklist item (bao gồm cả mục nước tưới, đất, PHI...). **Xây một điểm số song song ở service khác sẽ gây lệch dữ liệu (2 nguồn sự thật) — vi phạm nguyên tắc §0.3.** Đề xuất:

1. **KHÔNG** tạo `complianceCompletenessScore` mới ở `sustainability-service`.
2. **Mở rộng** `CertificationDetailsResponse` (farm-service, đã có) thêm field:
   - `missingMandatoryEvidenceCount: int` — đếm số `CertificationItemStatus` có `isMandatory=true` nhưng `status != PASS`.
   - `missingEvidenceItems: List<{itemCode, category, description}>` — danh sách chi tiết để Admin biết chính xác thiếu gì (đúng yêu cầu *"biết rõ lý do vì sao farm chưa đạt chuẩn"*).
3. Marketplace-service khi gọi `FarmClient` để lấy `FarmCertificationDto`, mở rộng DTO thêm 2 field trên (additive trên record Java — thêm field vào cuối `record`, hoặc tạo `FarmCertificationDetailDto` mới kế thừa nếu muốn giữ nguyên record cũ tuyệt đối không đổi — **khuyến nghị tạo DTO mới** để không ảnh hưởng nơi khác đang dùng `FarmCertificationDto`).
4. Admin xem tại màn hình duyệt Marketplace **hoặc** trực tiếp tại trang Certification của farm-service (không cần màn hình riêng mới — tái dùng `CertificationPage.tsx`, thêm panel "Compliance Gate — lý do chưa đạt" khi xem từ góc nhìn Admin).

### 8.5 Acceptance Criteria (DoD — Luồng G)
- [ ] Duyệt sản phẩm gắn nhãn VietGAP khi chứng nhận đã `EXPIRED` → bị chặn, trả đúng mã lỗi `CERTIFICATION_EXPIRED`, sản phẩm không hiển thị badge cho buyer.
- [ ] Duyệt sản phẩm không gắn nhãn tuân thủ nào → không bị ảnh hưởng bởi Compliance Gate (BR-G-01).
- [ ] Snapshot chứng nhận được lưu tại thời điểm duyệt, không đổi ngược khi chứng nhận hết hạn sau này (BR-G-02).
- [ ] Admin có thể tra cứu lý do chưa đạt chuẩn (missing evidence) mà không cần hỏi Farmer thủ công.
- [ ] Không có 2nd source of truth cho compliance score (tái sử dụng `CertificationScoringService`, không tạo bảng điểm song song).
## 9. LUỒNG H — Truy xuất nguồn gốc công khai & Trải nghiệm Người mua

**Trạng thái tổng thể: ✅ ĐÃ CÓ phần lớn (Module 3.4 trong `plan3&4.md` đã thực thi: `PublicTracePage.tsx`, `MarketplaceTraceabilityResponse`). Việc còn lại là đảm bảo dữ liệu mới từ Luồng D/G (snapshot chứng nhận) được phản ánh đúng, không lộ dữ liệu nội bộ.**

### 9.1 Mục tiêu nghiệp vụ
Người mua quét QR/truy cập `/trace/{traceCode}` **không cần đăng nhập**, thấy toàn bộ hành trình sản phẩm minh bạch: nông trại, chứng nhận, ngày thu hoạch, tuân thủ cách ly — nhưng **không thấy** thông tin nội bộ/chi phí nhạy cảm.

### 9.2 Luồng chính (đã có, mô tả lại để AI đối chiếu khi mở rộng)

| Bước | Actor | Hành động |
|---|---|---|
| 1 | Buyer | Xem trang chi tiết sản phẩm trên Marketplace, thấy badge nổi bật: "Có truy xuất", "VietGAP còn hiệu lực", "Thu hoạch {ngày}" |
| 2 | Buyer | Quét QR hoặc vào `/trace/{traceCode}` |
| 3 | Hệ thống | `PublicTracePage.tsx` gọi endpoint public (không auth) trả `MarketplaceTraceabilityResponse`: Farm → Plot → Season → Harvest → ProductLot, timeline mốc thời gian, badge chứng nhận, trạng thái an toàn PHI |
| 4 | Hệ thống | **Ẩn** toàn bộ field nội bộ (giá vốn, `auditorNotes`, `interviewNotes`, thông tin liên hệ nội bộ...) |

### 9.3 🔧 Điểm cần đối chiếu lại sau khi hoàn thành Luồng D & G

| Hạng mục | Việc cần làm |
|---|---|
| Badge chứng nhận trên trang trace | Phải đọc từ **snapshot** đã lưu ở BR-G-02 (Luồng G), không gọi real-time tới `CertificationRecord` hiện tại — tránh trường hợp 1 đơn hàng cũ hiển thị sai badge khi chứng nhận farm đã thay đổi sau này |
| Trạng thái PHI trên trang trace | Hiển thị theo `harvestSafetySnapshotJson`, liệt kê tên thuốc đã dùng kèm trạng thái an toàn (SAFE) — **không hiện** thuốc có PHI đang vi phạm (vì sản phẩm đó lẽ ra đã bị chặn ở Luồng F/G) |
| Timeline hiển thị | Đảm bảo field ngày cấy/trồng lấy đúng từ Nhật ký sản xuất hợp nhất (Luồng E) thay vì chỉ có ngày thu hoạch đơn lẻ như hiện tại (nếu FE hiện chưa show giai đoạn gieo trồng) — 🔧 bổ sung field `plantingDate`/`plantingLogSummary` nếu chưa có trong response |

### 9.4 Đặt hàng trước cho hàng tươi sống — chuyển chi tiết sang Luồng I §10.6
Ghi chú demo về "đặt trước hẹn ngày ship" thuộc phạm vi checkout/logistics, được đặc tả đầy đủ ở Luồng I để tránh trùng lặp.

### 9.5 Acceptance Criteria (DoD — Luồng H)
- [ ] Trang `/trace/{traceCode}` truy cập được không cần đăng nhập.
- [ ] Không có field nhạy cảm nào lọt ra response public (kiểm tra bằng cách so sánh field-by-field với `CertificationDetailsResponse` nội bộ).
- [ ] Badge hiển thị đúng theo snapshot, ổn định theo thời gian (không đổi ngược khi dữ liệu gốc thay đổi sau).

---

## 10. LUỒNG I — Logistics, Fulfillment & Đặt trước (Pre-order)

**Trạng thái tổng thể: ✅ Phần tính phí ship/cold-surcharge/same-day đã có đầy đủ trong `delivery-service`. 🆕 Đặt trước (pre-order) hẹn ngày giao + gom đơn theo khu vực để giảm phí là VIỆC MỚI.**

### 10.1 Mục tiêu nghiệp vụ
Cho phép Buyer đặt mua nông sản tươi sống với ngày giao được hẹn trước (vì cần thời gian thu hoạch/sơ chế), đồng thời hệ thống tận dụng việc nhiều đơn cùng khu vực trong cùng ngày để đề xuất mức phí ship rẻ hơn cho tất cả — và Farmer có luồng chuẩn bị hàng theo độ ưu tiên rõ ràng.

### 10.2 Data model liên quan (đã có, KHÔNG xây lại)

| Entity | Service | Trạng thái |
|---|---|---|
| `DeliveryOrder, DeliveryProvider, DeliveryRate, DeliveryStatus` | delivery-service | ✅ ĐÃ CÓ |
| `ShippingFeeCalculator` (cold surcharge, same-day) | delivery-service | ✅ ĐÃ CÓ |
| `CalculateShippingRequest / ShippingOption` | delivery-service | ✅ ĐÃ CÓ |

### 10.3 Luồng chính (đã có) — Cấu hình & Checkout tiêu chuẩn

| Bước | Actor | Hành động |
|---|---|---|
| 1 | Admin | Cấu hình `DeliveryRate` theo `zoneFrom/zoneTo`, `weightMin/Max`, `baseRate`, `perKg`, `isColdChain`, `coldChainFeeVnd` — không còn phí cứng 20.000đ |
| 2 | Buyer | Thêm sản phẩm vào giỏ, nhập địa chỉ |
| 3 | Hệ thống | `POST /api/v1/delivery/calculate` → trả về danh sách `ShippingOption` (Giao tiêu chuẩn / Giao nhanh trong ngày) kèm phí + ETA |
| 4 | Buyer | Thấy rõ phí + ETA trước khi đặt hàng |

### 10.4 Luồng chính (đã có) — Fulfillment cho Farmer

| Bước | Actor | Hành động |
|---|---|---|
| 1 | Farmer | Sau khi buyer đặt hàng thành công, đơn xuất hiện trong danh sách "Đơn cần chuẩn bị hôm nay" (ưu tiên same-day) |
| 2 | Farmer/Shipper | Cập nhật tuần tự: `PACKING → READY_FOR_PICKUP → PICKED_UP → IN_TRANSIT → DELIVERED` (enum `DeliveryStatus` đã có) |
| 3 | Buyer | Theo dõi tiến trình trên Order Detail |

**Checklist verify FE (không phải code mới nếu đã đúng):**
- [ ] Farmer Portal có tab/filter riêng cho đơn `same_day` (đối chiếu §1.2 mục 25).
- [ ] Order Detail của Buyer render đúng timeline theo `DeliveryStatus`.

### 10.5 🆕 Đặt trước (Pre-order) hàng tươi sống `[AUTO ≥70%]`

> Note gốc: *"Đặt trước sản phẩm hẹn ngày ship thực phẩm tươi sống."*

#### Data model mới
`marketplace-service`, mở rộng `MarketplaceOrder` (additive):
- `is_pre_order BOOLEAN DEFAULT FALSE`
- `requested_delivery_date DATE NULL`
- `harvest_ready_date DATE NULL` — ngày farmer dự kiến có hàng (có thể suy ra từ `Season`/kế hoạch thu hoạch nếu farmer đã lên lịch, hoặc farmer nhập tay)

#### Luồng chính

| Bước | Actor | Hành động |
|---|---|---|
| 1 | Farmer | Khi tạo `MarketplaceProduct` cho hàng chưa thu hoạch (hoặc thu hoạch theo đợt), đánh dấu `allowsPreOrder = true`, khai báo `earliestFulfillmentDate` |
| 2 | Buyer | Ở trang sản phẩm, nếu `allowsPreOrder`, thấy lựa chọn **"Đặt trước — hẹn ngày giao"** thay vì "Mua ngay" | 
| 3 | Buyer | Chọn ngày giao mong muốn (≥ `earliestFulfillmentDate`), đặt hàng | Tạo `MarketplaceOrder(isPreOrder=true, requestedDeliveryDate=...)` |
| 4 | Hệ thống | Không trừ tồn kho `ProductWarehouseLot` ngay (vì hàng chưa thu hoạch) — chỉ giữ chỗ (reservation) — 🆕 cần cơ chế reservation nhẹ, hoặc đơn giản hoá MVP: pre-order chỉ áp dụng cho sản phẩm đã có lô nhưng **ngày giao được hẹn sau** (không cần đổi cơ chế trừ kho) — `[CẦN XÁC NHẬN]` với PO chọn 1 trong 2 phương án MVP |
| 5 | Farmer | Đơn pre-order xuất hiện trong danh sách "Đơn hẹn giao {ngày}" tách riêng khỏi "Đơn cần chuẩn bị hôm nay" |

### 10.6 🆕 Gom đơn theo khu vực để giảm phí ship (Order Batching) `[CẦN XÁC NHẬN thuật toán]`

> Note gốc: *"có nhiều người đặt trong 1 ngày, khu vực ship rẻ hơn."*

- Đây là bài toán tối ưu có nhiều cách tiếp cận (batch theo phường/quận, theo tuyến giao, theo nhà cung cấp vận chuyển) — độ phức tạp thuật toán cao hơn hẳn phần còn lại của tài liệu này, nên đánh dấu `[CẦN XÁC NHẬN]` thay vì auto-implement toàn bộ.
- **MVP đề xuất (an toàn, additive, giá trị rõ ràng ngay cả khi thuật toán tối ưu chưa có):**
  1. `delivery-service` thêm endpoint `GET /api/v1/delivery/batch-suggestions?date=&zone=` — đếm số `DeliveryOrder` có `requestedDeliveryDate` + `zone` trùng nhau trong ngày.
  2. Nếu số lượng đơn cùng zone/ngày ≥ ngưỡng cấu hình (vd 5 đơn) → hệ thống áp dụng `DeliveryRate` có `perKgVnd` thấp hơn (rate "bulk", đã có cấu trúc `DeliveryRate` linh hoạt theo `zoneFrom/zoneTo` — chỉ cần thêm 1 rate tier mới trong seed data, không đổi entity).
  3. Hiển thị cho Buyer ở bước checkout: "Đặt trong hôm nay tại khu vực của bạn để được phí ship ưu đãi" (khuyến khích buyer chọn ngày phổ biến, tăng tỷ lệ batch tự nhiên) — thuần UX, không cần thuật toán ghép tuyến phức tạp ở MVP.
  4. Thuật toán ghép tuyến/tối ưu lộ trình thực sự (nếu cần sau này) nên để **giai đoạn 2**, ngoài phạm vi tài liệu này.

### 10.7 🔧 Lựa chọn phạm vi giao hàng (nội đô / tỉnh / toàn quốc)

> Note gốc: *"ship nội đô, ship tỉnh thành, toàn quốc."*

`DeliveryRate.zoneFrom/zoneTo` đã là cơ chế zone-based — **đã hỗ trợ kỹ thuật** việc phân biệt các mức phạm vi này qua dữ liệu cấu hình (vd `zoneTo = "HCM_NOI_DO"`, `"HCM_TINH"`, `"TOAN_QUOC"`), không cần đổi entity. Việc còn lại thuần là:
- Seed đủ dữ liệu `DeliveryRate` cho 3 tier phạm vi.
- FE hiển thị rõ 3 lựa chọn tương ứng tại bước chọn địa chỉ giao hàng thay vì chỉ hiện 1 danh sách phẳng — 🔧 cải thiện UI, không phải backend mới.

### 10.8 Acceptance Criteria (DoD — Luồng I)
- [ ] Buyer đặt trước được hàng tươi sống với ngày giao hẹn trước, đơn tách biệt khỏi luồng mua ngay.
- [ ] Farmer thấy rõ danh sách đơn theo ngày hẹn giao, không lẫn với đơn same-day thường.
- [ ] Batch suggestion hoạt động đúng ngưỡng cấu hình, không phá vỡ luồng tính phí ship hiện tại nếu số đơn chưa đủ ngưỡng (fallback về giá thường).
- [ ] 3 tier phạm vi giao hàng hiển thị rõ ràng, đúng phí theo từng tier.
## 11. LUỒNG K — Đào tạo & Hồ sơ Nhân viên (Employee Training)

**Trạng thái tổng thể: 🆕 MỚI hoàn toàn — không tìm thấy entity liên quan trong toàn bộ codebase.**

### 11.1 Mục tiêu nghiệp vụ
Ghi nhận và lưu trữ hồ sơ đào tạo của nhân viên (đặc biệt quan trọng với VietGAP — checklist chuẩn thường yêu cầu bằng chứng nhân sự được đào tạo về an toàn thực phẩm, sử dụng thuốc BVTV, quy trình phân loại/thu hoạch), phục vụ cả mục đích quản lý nhân sự lẫn làm bằng chứng cho checklist chứng nhận.

### 11.2 Data model mới (`season-service`, cùng schema quản lý nhân lực với `WorkTeam`)

Migration: `season-service/src/main/resources/db/migration/V{n}__employee_training.sql`

| Bảng | Field | Ghi chú |
|---|---|---|
| `training_programs` | `id, title, category, description, isMandatory, createdAt` | Danh mục chương trình đào tạo (vd "An toàn sử dụng thuốc BVTV", "Quy trình phân loại rau củ") — `category` dùng để map với `CertificationChecklistItem` nếu cần (`dataSourceType`) |
| `employee_training_records` | `id, userId, workTeamId (nullable), trainingProgramId, trainedAt, trainerName, evidenceUrls (TEXT JSON), certifiedUntil (DATE, nullable), status (COMPLETED/EXPIRED)` | 1 bản ghi mỗi lần nhân viên hoàn thành 1 khoá |

### 11.3 Luồng chính

| Bước | Actor | Hành động |
|---|---|---|
| 1 | Farmer/Team Leader | Vào **Quản lý Nhân công** → tab **Đào tạo** → tạo chương trình đào tạo (nếu chưa có) hoặc chọn chương trình có sẵn |
| 2 | Farmer/Team Leader | Chọn thời điểm đào tạo cho nhân viên mới hoặc cả đội trước mùa vụ: `POST /api/v1/farmer/employees/{userId}/training-records` body `{trainingProgramId, trainedAt, trainerName, evidenceUrls[], certifiedUntil?}` |
| 3 | Hệ thống | Lưu hồ sơ, liên kết `userId` + `workTeamId` hiện tại (nếu nhân viên đang thuộc đội nào) |
| 4 | Bất kỳ lúc nào | Farmer xem lại **"nhân viên trong mùa vụ đã được train chưa"**: `GET /api/v1/farmer/seasons/{seasonId}/training-status` → liệt kê từng thành viên `WorkTeamMember` kèm trạng thái đào tạo mới nhất |

### 11.4 Liên kết với VietGAP Checklist (tái sử dụng cơ chế auto-populate đã có)
`CertificationScoringService.autoPopulateFromFieldLogs()` (farm-service) hiện chỉ đọc từ `season-service` (Field Log, PHI) và `sustainability-service` (soil/water). Mở rộng thêm 1 nguồn:
- Thêm `dataSourceType = TRAINING_RECORD` cho các `CertificationChecklistItem` liên quan đào tạo nhân sự (dữ liệu seed, không phải code logic mới).
- `CertificationScoringService` gọi thêm 1 Feign nhỏ tới `season-service` để lấy tỷ lệ nhân viên đã đào tạo đạt yêu cầu → set `PASS/FAIL` tương ứng.

### 11.5 Acceptance Criteria (DoD — Luồng K)
- [ ] Tạo được hồ sơ đào tạo, gắn đúng nhân viên + đội.
- [ ] Truy vấn được trạng thái đào tạo của toàn bộ nhân viên trong 1 mùa vụ.
- [ ] Checklist VietGAP mục liên quan nhân sự tự động PASS khi đủ % nhân viên đã đào tạo (ngưỡng cấu hình được, đề xuất mặc định 100% với đội trực tiếp thao tác vật tư nguy hại, `[CẦN XÁC NHẬN]` với PO).

---

## 12. Yêu cầu phi chức năng & Phân quyền xuyên suốt

### 12.1 Bảo mật & Phân quyền (tổng hợp toàn bộ tài liệu)

| Vai trò | Phạm vi truy cập chính |
|---|---|
| **Farmer** | Toàn quyền dữ liệu farm/season/task/harvest/certification của **chính mình** (đã có `FarmerOwnershipService` — farm-service — **bắt buộc tái sử dụng** cho mọi endpoint mới thay vì viết check quyền riêng lẻ) |
| **Employee** | Chỉ đọc task được giao cho mình/đội mình, ghi progress log |
| **Team Leader** | Như Employee + quyền duyệt nghiệm thu task trong đội mình (§2.7) |
| **Auditor** (role mới) | Đọc hồ sơ chứng nhận của farm được giao audit, ghi audit/nonconformity, KHÔNG có quyền sửa dữ liệu canh tác gốc |
| **Admin** | Duyệt tài liệu, duyệt marketplace, xem toàn hệ thống, KHÔNG tự issue chứng nhận (tách biệt vai trò Admin nội bộ vs Auditor bên ngoài — tránh xung đột lợi ích) |
| **Buyer** | Chỉ đọc dữ liệu public (trace page, marketplace), đặt hàng |

**BR-NF-01:** Toàn bộ endpoint mới trong tài liệu này liên quan tới `farmId` phải đi qua `FarmerOwnershipService` (hoặc middleware phân quyền tương đương) — **tuyệt đối không** tự viết logic check `createdBy == currentUser` rời rạc ở từng service.

**BR-NF-02:** Role `Auditor` là role **mới** cần thêm vào `identity-service` (bảng roles hiện có, additive — thêm 1 row `AUDITOR`, không đổi role cũ). Trong giai đoạn đầu có thể cho phép `Admin` kiêm nhiệm vai trò Auditor (feature-flag `AUDITOR_ROLE_ENFORCED=false`) để không chặn demo, nhưng cấu trúc dữ liệu (`auditorUserId`) phải sẵn sàng tách vai trò khi cần.

### 12.2 Tính nhất quán dữ liệu liên service (Event-Driven)

Toàn bộ event mới (liệt kê ở Phụ lục C) phải tuân thủ pattern hiện có: publish qua RabbitMQ topic exchange, consumer có retry/dead-letter tương tự cấu hình hiện tại của `admin-reporting-service`. **Không** dùng đồng bộ (synchronous Feign call) cho các luồng không cần phản hồi ngay (vd cập nhật read-model), chỉ dùng Feign đồng bộ khi cần validate ngay trong transaction (vd Compliance Gate ở Luồng G, PHI Gate ở Luồng F — đây là các trường hợp **đúng đắn** để dùng Feign đồng bộ vì cần chặn ngay, khớp với pattern `FarmClient`/`SeasonClient` đã dùng).

### 12.3 Khả năng chịu lỗi (Resilience)
Mọi Feign client mới (vd `AuditorNotificationClient` nếu cần) phải theo đúng pattern đã sửa trong dự án: dùng `fallbackFactory` (không dùng `fallback` đơn thuần — đã được flag là anti-pattern trong lịch sử dự án), có `@RestControllerAdvice` xử lý `FeignException` tương ứng, và bật `spring.cloud.openfeign.circuitbreaker.enabled: true` ở service mới nếu global config chưa phủ (đã ghi nhận thiếu ở một số service trong audit trước đây).

### 12.4 Hiệu năng
- Endpoint tổng hợp mới (Nhật ký Sản xuất hợp nhất §6.3, Team Progress §3) nên có `staleTime`/cache hợp lý ở FE (React Query) — tránh N+1 call tới nhiều microservice mỗi lần render.
- Compliance Gate (Luồng G) chạy đồng bộ trong request duyệt sản phẩm — chấp nhận latency thêm ~1-2 Feign call vì tần suất duyệt sản phẩm thấp (không phải hot path).

### 12.5 Đa ngôn ngữ (i18n)
Dự án đã có `i18next` + `docs/i18n.md`. Mọi label/message lỗi mới (đặc biệt message PHI-block, Compliance-block) phải thêm vào file ngôn ngữ theo đúng cấu trúc hiện có, **không hard-code chuỗi tiếng Việt trong component**.

---

## 13. Lộ trình triển khai đề xuất & Definition of Done tổng thể

### 13.1 Thứ tự ưu tiên đề xuất cho AI coding agent

| Giai đoạn | Nội dung | Lý do thứ tự |
|---|---|---|
| **P0** | Fix bug §1.3 (`Task.java`) | Chặn build toàn bộ `season-service`, phải làm trước tiên |
| **P1** | Luồng D (Certification Audit Lifecycle) — §5.4–5.9 | Là nền tảng dữ liệu cho Luồng G và Luồng H, phải có trước |
| **P2** | Luồng G (Marketplace Compliance Gate) — §8 | Phụ thuộc trực tiếp Luồng D (cần `CertificationRecord.status = PUBLISHED` tồn tại) |
| **P3** | Luồng F verify + widget PHI (§7.5), Luồng C §4.6 (storage profile) | Độc lập, rủi ro thấp, giá trị cao |
| **P4** | Luồng E (Production Diary + AI hook) — §6 | Phụ thuộc dữ liệu đã ổn định từ P1–P3 |
| **P5** | Luồng K (Employee Training) — §11 | Độc lập, có thể làm song song P1–P4 |
| **P6** | Luồng I (Pre-order + Batching) — §10.5–10.6 | Phức tạp nhất về UX, nên làm sau khi các luồng lõi ổn định |
| **P7** | Luồng A/B/C phần verify FE (§2.6, §3, §4.8 checklist) | QA thuần, làm song song bất kỳ lúc nào |
| **P8** | Luồng H đối chiếu snapshot (§9.3) | Phải làm sau P1+P2 vì phụ thuộc snapshot mới sinh ra |

### 13.2 Definition of Done tổng thể của toàn bộ tài liệu
- [ ] Không có migration nào sửa/xoá cột bảng cũ — chỉ thêm mới (additive).
- [ ] Không có API contract cũ nào bị đổi field/kiểu dữ liệu (chỉ thêm field mới, nullable).
- [ ] Mọi entity/DTO/service mới tuân thủ đúng style code hiện có (Lombok annotations, MapStruct, Flyway naming `V{n}__snake_case.sql`).
- [ ] Mọi Feign client mới dùng `fallbackFactory`.
- [ ] Mọi endpoint theo domain đúng service (không để logic Certification lọt vào `season-service`, không để logic PHI lọt vào `farm-service`, v.v.).
- [ ] Toàn bộ Acceptance Criteria trong từng chương (§2.8, §3.4, §4.8, §5.11, §6.6, §7.6, §8.5, §9.5, §10.8, §11.5) đạt PASS.
- [ ] Có unit test cho mọi business rule mới đánh số `BR-*` trong tài liệu này (tối thiểu 1 test case happy-path + 1 test case chặn/reject).

---

## Phụ lục A — Data Dictionary tổng hợp (entity/bảng mới)

| Service | Bảng mới | Mục đích | Chương |
|---|---|---|---|
| farm-service | `certification_audits` | Quản lý đợt audit ngoài | §5.5 |
| farm-service | `certification_nonconformities` | Điểm không phù hợp phát hiện khi audit | §5.5 |
| farm-service | `certification_corrective_actions` | Kế hoạch khắc phục + bằng chứng | §5.5 |
| farm-service | `certification_records` (mở rộng cột) | `certificateNumber, certificateDocumentId, nextPeriodicReviewDate, publishedAt, publishedByUserId` | §5.5 |
| farm-service | `crop_category_storage_profile` (hoặc mở rộng `Crop`) | Gợi ý kho/hạn dùng theo loại cây | §4.6 |
| season-service | `training_programs`, `employee_training_records` | Đào tạo nhân viên | §11.2 |
| marketplace-service | `marketplace_products` (mở rộng cột) | `complianceClaim, certificationSnapshotJson, harvestSafetySnapshotJson, complianceCheckedAt` | §8.3.2 |
| marketplace-service | `marketplace_orders` (mở rộng cột) | `isPreOrder, requestedDeliveryDate, harvestReadyDate` | §10.5 |
| season-service | `tasks.task_progress_logs` (mở rộng cột, nếu chưa có ảnh) | `evidenceImageUrls, acceptanceStatus, acceptedByUserId, acceptanceNote` | §2.7 |

## Phụ lục B — Danh mục mã lỗi (Error Code) mới

| Mã lỗi | Service | Ý nghĩa |
|---|---|---|
| `HARVEST_BLOCKED_BY_PHI` | season-service | Thu hoạch bị chặn do chưa đủ thời gian cách ly (verify tồn tại, bổ sung payload chi tiết nếu thiếu) |
| `CERTIFICATION_EXPIRED` | marketplace-service | Chứng nhận đã hết hạn khi duyệt sản phẩm |
| `CERTIFICATION_MISSING` | marketplace-service | Chưa có/chưa hoàn tất chứng nhận được gắn nhãn |
| `PHI_VIOLATION_DETECTED` | marketplace-service | Lô hàng liên kết có vi phạm PHI tại thời điểm thu hoạch |
| `CERTIFICATION_INVALID_TRANSITION` | farm-service | Cố gắng chuyển state không hợp lệ trong vòng đời chứng nhận (§5.4) |
| `CRITICAL_NONCONFORMITY_OPEN` | farm-service | Không thể issue chứng nhận khi còn nonconformity CRITICAL mở |

## Phụ lục C — Danh mục sự kiện (RabbitMQ) mới

| Event | Publisher | Subscriber đề xuất |
|---|---|---|
| `farm.certification.audit_scheduled` | farm-service | incident-service (nhắc lịch), admin-reporting-service |
| `farm.certification.nonconformity_recorded` | farm-service | incident-service (cảnh báo Farmer) |
| `farm.certification.corrective_action_submitted` | farm-service | admin-reporting-service |
| `farm.certification.certified` | farm-service | admin-reporting-service, marketplace-service (nếu có cache) |
| `farm.certification.expired` | farm-service | incident-service, marketplace-service |
| `farm.document.verified` | farm-service | admin-reporting-service |
| `season.training.recorded` | season-service | farm-service (nếu Certification cần trigger tính lại score) |
| `marketplace.product.compliance_blocked` | marketplace-service | admin-reporting-service (thống kê tỷ lệ bị chặn) |

## Phụ lục D — Truy vết nguồn (Traceability Matrix rút gọn)

| Nội dung gốc trong `Kichbandemoe2e.docx` | Chương xử lý trong BRD này |
|---|---|
| Part 1 (TC 1.1–1.3): Area-based Assignment | Chương 2 |
| Part 2 (TC 2.1): Team Progress Dashboard | Chương 3 |
| Part 3 (TC 3.1–3.3): Harvest & Cold Chain | Chương 4 |
| Note rời: training, hồ sơ đào tạo | Chương 11 |
| Note rời: xử lý hàng không đạt chuẩn, phân loại theo cây trồng | Chương 4 (§4.6, §4.7) |
| Note rời: nhật ký sản xuất, generate hồ sơ | Chương 6 |
| Kịch Bản 1: Happy Path (Farm Dossier → VietGAP → Harvest Gate → Admin duyệt → Buyer) | Chương 5, 6, 9 |
| Kịch Bản 2: PHI Harvest Gate | Chương 7 |
| Kịch Bản 3: Marketplace Block (chứng nhận hết hạn, compliance score) | Chương 8 |
| Kịch Bản 4: Logistics & Fulfillment | Chương 10 |
| Note rời: đặt trước, gom đơn, phạm vi giao hàng | Chương 10 (§10.5–10.7) |

---

*Hết tài liệu. Mọi mục đánh dấu `[CẦN XÁC NHẬN]` nên được review nhanh với Product Owner trước khi bật mặc định cho production; các mục còn lại (`[AUTO ≥70%]` hoặc không đánh dấu vì đã re-verify là ĐÃ CÓ/MỞ RỘNG rõ ràng) được phép triển khai trực tiếp theo đúng chỉ đạo ban đầu.*
