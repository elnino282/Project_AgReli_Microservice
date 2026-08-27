# Kế hoạch số hóa hành trình chứng nhận VietGAP

Ngày cập nhật: 2026-08-26  
Phạm vi: nông trại trồng trọt, farmer, auditor/tổ chức chứng nhận và admin AgReli.

## 1. Mục tiêu nghiệp vụ

Farmer cần nhìn thấy một nguồn sự thật duy nhất cho toàn bộ hành trình:

1. Chuẩn bị hồ sơ và tự đánh giá nội bộ.
2. Đăng ký chứng nhận khi đủ điều kiện.
3. Theo dõi lịch và kết quả đánh giá bên ngoài: hồ sơ, phỏng vấn, hiện trường, lấy mẫu.
4. Lập, sửa, đính kèm bằng chứng và nộp kế hoạch khắc phục điểm không phù hợp.
5. Theo dõi việc cấp giấy, tải giấy lên Hồ sơ nông trại và chờ Admin xác minh trước khi public.
6. Theo dõi hạn, tải biên bản giám sát định kỳ và chuẩn bị đánh giá lại.

Màn hình hỗ trợ chuẩn bị và theo dõi; kết luận chứng nhận vẫn thuộc tổ chức chứng nhận có thẩm quyền.

## 2. Trạng thái chuẩn hóa

| Giai đoạn hiển thị | Trạng thái hệ thống | Chủ thể hành động tiếp theo |
|---|---|---|
| Chuẩn bị | `IN_PROGRESS` | Farmer hoàn thiện checklist/minh chứng |
| Sẵn sàng | `READY_TO_APPLY` | Farmer nộp đơn |
| Đã đăng ký | `APPLIED` | Tổ chức chứng nhận/Admin tiếp nhận |
| Lên lịch | `AUDIT_SCHEDULED` | Auditor chuẩn bị đánh giá |
| Đang đánh giá | `AUDIT_IN_PROGRESS` | Auditor ghi phỏng vấn/lấy mẫu/kết luận |
| Có điểm không phù hợp | `NONCONFORMITY_FOUND` | Farmer lập kế hoạch khắc phục |
| Đã nộp khắc phục | `CORRECTIVE_ACTION_SUBMITTED` | Auditor duyệt bằng chứng |
| Đạt đánh giá | `AUDIT_PASSED` | Auditor/Admin cấp giấy |
| Được cấp giấy | `CERTIFIED` | Farmer tải bản giấy; Admin đối chiếu |
| Đã công khai | `PUBLISHED` | Theo dõi hiệu lực/đợt giám sát |
| Đến hạn định kỳ | `PERIODIC_REVIEW_DUE` | Farmer bổ sung biên bản; Auditor đánh giá lại |
| Kết thúc bất thường | `REJECTED`, `EXPIRED`, `REVOKED` | Xem lý do và lập phương án phù hợp |

## 3. Phần đã triển khai trong đợt này

- Điều kiện đăng ký fail-closed: điểm tuân thủ tối thiểu 80% **và** mọi tiêu chí bắt buộc phải `PASS`.
- Tự động chuyển sang `PERIODIC_REVIEW_DUE` khi tới ngày giám sát; tự chuyển `EXPIRED` khi quá hạn giấy.
- Trung tâm chứng nhận farmer hiển thị timeline 8 giai đoạn, trạng thái tiếng Việt, tỷ lệ tiêu chí bắt buộc, hồ sơ hỗ trợ, audit gần nhất, phỏng vấn, lấy mẫu và số lỗi.
- Trang Admin có hàng đợi hồ sơ `APPLIED`/`PERIODIC_REVIEW_DUE` và có thể tiếp nhận, chọn tổ chức, ngày đánh giá rồi tạo audit `INITIAL` hoặc `PERIODIC`.
- Trang Hồ sơ nông trại nhận deep-link đúng farm/loại giấy; bổ sung loại `PERIODIC_INSPECTION`.
- Sau khi được cấp giấy, farmer có hành động trực tiếp tải `CERTIFICATE`; khi đến hạn có hành động tải `PERIODIC_INSPECTION`.
- Kế hoạch khắc phục có vòng đời đúng: lưu nháp, sửa, chọn mùa vụ bắt đầu áp dụng, upload bằng chứng thật và nộp chính thức.
- Seed có đủ giấy đất, xét nghiệm đất/nước, đánh giá nội bộ, giấy chứng nhận và biên bản giám sát định kỳ để trình diễn xuyên suốt.
- Metadata tiêu chuẩn mặc định được chuyển sang `TCVN 11892-1:2026`; mã cũ vẫn được backend ánh xạ tương thích.

## 4. Quy tắc quyết định “khi nào xin giấy”

Nút đăng ký chỉ khả dụng khi:

- Điểm tuân thủ đạt từ 80% trở lên.
- Không còn tiêu chí bắt buộc ở `PENDING` hoặc `FAIL`.
- Dịch vụ bằng chứng tự động (nhật ký, đất/nước, PHI) trả kết quả xác minh hợp lệ; lỗi dịch vụ không được coi là đạt.

Các tài liệu đất, nước và đánh giá nội bộ được hiển thị thành bộ hồ sơ hỗ trợ với trạng thái `PENDING/VERIFIED/REJECTED`. Việc một tổ chức chứng nhận yêu cầu thêm biểu mẫu hoặc mẫu thử phải được bổ sung theo phạm vi chứng nhận cụ thể.

## 5. Lộ trình hoàn thiện sau báo cáo

### P1 — Cứng hóa quy trình

- Thêm ownership check cho mọi endpoint hồ sơ/audit theo farm.
- Tạo reminder job trước ngày giám sát và ngày hết hạn 90/60/30 ngày.
- Thêm lịch sử chuyển trạng thái bất biến: ai, lúc nào, từ trạng thái nào, lý do gì.
- Tách quyền `AUDITOR` khỏi `ADMIN`; lưu tổ chức chứng nhận và phạm vi công nhận.

### P2 — Hồ sơ và bằng chứng chuẩn hóa

- Version hóa bộ checklist; không thay nội dung checklist của hồ sơ đang đánh giá.
- Ánh xạ từng tiêu chí sang tài liệu/nhật ký nguồn và lưu provenance tại thời điểm chấm.
- Upload nhiều bằng chứng, hash file, phiên bản file, chữ ký số và biên bản lấy mẫu.
- Cổng làm việc riêng cho auditor: yêu cầu bổ sung, hẹn lịch, biên bản, mẫu xét nghiệm và kết luận.

### P3 — Vận hành và cải tiến liên tục

- Dashboard xu hướng điểm theo mùa vụ, nhóm tiêu chí tái phạm và hiệu quả hành động khắc phục.
- Kế hoạch khắc phục liên kết task/mùa vụ sau, deadline, người phụ trách và cảnh báo quá hạn.
- Tự tạo hồ sơ tái chứng nhận từ dữ liệu đã xác minh, nhưng bắt buộc người dùng duyệt trước khi nộp.
- Audit log/observability và regression E2E cho toàn bộ state machine.

## 6. Tiêu chí nghiệm thu end-to-end

- Farmer nhìn thấy đúng phần trăm và số tiêu chí bắt buộc còn thiếu.
- Không thể nộp nếu điểm cao nhưng còn một tiêu chí bắt buộc chưa đạt.
- Auditor có thể lên lịch, bắt đầu, ghi phỏng vấn/lấy mẫu và kết luận.
- Farmer có thể lưu nháp, sửa, upload và nộp khắc phục; Auditor có thể duyệt hoặc từ chối.
- Chỉ tài liệu `CERTIFICATE` được Admin `VERIFIED` mới làm hồ sơ chuyển `PUBLISHED`.
- Đến hạn định kỳ, hồ sơ chuyển đúng trạng thái và farmer có thể tải biên bản kiểm tra.
- Mọi dữ liệu sau reload lấy từ backend/database, không dựa vào state giả ở frontend.

## 7. Cơ sở tiêu chuẩn và giới hạn sử dụng

- Danh mục chính thức của Ủy ban Tiêu chuẩn Đo lường Chất lượng Quốc gia ghi nhận `TCVN 11892-1:2017` đã bị hủy ngày 08/07/2026 và danh mục hiện có `TCVN 11892-1:2026`.
- Quy trình đánh giá sự phù hợp phải tiếp tục tuân thủ quy định pháp luật hiện hành và yêu cầu cụ thể của tổ chức chứng nhận được lựa chọn.
- Checklist trong AgReli là công cụ quản trị mức độ sẵn sàng và bằng chứng số; điểm 80% không thay thế kết luận chuyên môn hoặc quyết định cấp chứng nhận.

Nguồn tham chiếu chính thức:

- [TCVN 11892-1:2017 - trạng thái tiêu chuẩn](https://tieuchuan.vsqi.gov.vn/tieuchuan/view?sohieu=TCVN+11892-1%3A2017)
- [Danh mục tiêu chuẩn lĩnh vực nông nghiệp](https://tieuchuan.vsqi.gov.vn/tim-kiem?ic%5B%5D=65)
- [Nghị định 107/2016/NĐ-CP về điều kiện kinh doanh dịch vụ đánh giá sự phù hợp](https://vanban.chinhphu.vn/default.aspx?docid=166162&pageid=27160)

## 8. Phạm vi chứng nhận theo sản phẩm và vùng sản xuất

`farm_id` chỉ xác định chủ sở hữu hồ sơ trên AgReli; nó **không có nghĩa toàn bộ nông trại đạt VietGAP**. Mỗi hồ sơ phải có ít nhất một phạm vi gồm:

- Mùa vụ và sản phẩm/cây trồng, giống cụ thể.
- Thửa đất/địa điểm sản xuất cụ thể.
- Diện tích đăng ký và sản lượng dự kiến.

Quy tắc hệ thống:

- Farmer chỉ được chọn mùa vụ thuộc thửa đất của chính nông trại và diện tích đăng ký không được vượt diện tích thửa.
- Checklist tự động, nhật ký, xét nghiệm và PHI chỉ được chấm từ các mùa vụ nằm trong phạm vi.
- Không có phạm vi thì hồ sơ không thể `READY_TO_APPLY` hoặc nộp, kể cả điểm lưu trước đó là 100%.
- Sau khi nộp, farmer không được tự sửa phạm vi. Việc bổ sung sản phẩm hoặc thửa đất cần đánh giá bổ sung/tái đánh giá theo tổ chức chứng nhận.
- Marketplace chỉ cho phép claim VietGAP khi `seasonId` của lô sản phẩm khớp đúng một phạm vi trong chứng nhận `PUBLISHED` còn hiệu lực; cùng nông trại nhưng khác mùa vụ vẫn bị chặn.
- Admin nhìn thấy sản phẩm/thửa đất ngay trong hàng đợi trước khi lên lịch đánh giá.

Cơ sở đối chiếu phạm vi:

- [Quy trình chứng nhận VietGAP trồng trọt của QUACERT](https://quacert.gov.vn/dich-vu/vietgap-trong-trot) yêu cầu danh sách địa điểm, diện tích, sơ đồ phân lô và hồ sơ thử nghiệm trong hồ sơ đăng ký.
- [Mẫu giấy chứng nhận đã ký công khai tại Đồng Tháp](https://phuongmyngai.tpcaolanh.dongthap.gov.vn/admin/resource_actices/files/GCN_THT_TRONG_VA_TIEU_THU_XOAI_CAT_HOA_LOC_signed.pdf) thể hiện rõ sản phẩm được chứng nhận, địa chỉ sản xuất và diện tích sản xuất.
- [Sổ tay hướng dẫn VietGAP của cơ quan nhà nước Tuyên Quang](https://apictt.tuyenquang.gov.vn/uploads/attachments/so-tay-tot-hd-qua-nhan-view.pdf) có các trường loại cây trồng, địa chỉ, diện tích và sản lượng trong hồ sơ/tự đánh giá.

Giới hạn MVP hiện tại: một hồ sơ theo `farm + standard` có thể chứa nhiều phạm vi được đánh giá cùng nhau. Để quản lý nhiều giấy chứng nhận độc lập hoặc nhiều đợt mở rộng song song cho cùng một tiêu chuẩn, giai đoạn tiếp theo cần đổi khóa nghiệp vụ sang `certification_record + scope version` thay vì chỉ `farm + standard`.
