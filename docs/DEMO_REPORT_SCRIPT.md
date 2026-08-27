# AgReli — Demo script báo cáo 10–15 phút

## Chuẩn bị trước khi trình bày

- Chạy stack theo `RUN_GUIDE.md`, xác minh gateway `UP` và 12 application service healthy.
- Chạy frontend tại `http://localhost:3000` và `npm run demo:smoke`.
- Dùng đúng seed đã rehearsal; mở sẵn bốn tài khoản Farmer, Employee, Buyer và Admin ở các browser profile riêng.
- Không mở hoặc claim các action được đánh dấu `HIDDEN_FROM_RELEASE`/`ROADMAP_ONLY` trong route truth matrix.

## Kịch bản 12 phút

| Thời lượng | Người dùng/route | Thao tác và thông điệp |
|---:|---|---|
| 0:00–1:00 | Mở đầu | Nêu bài toán: quản lý mùa vụ, VietGAP evidence, traceability và thương mại cùng một chuỗi server truth. Không tuyên bố mức 5/5. |
| 1:00–3:30 | Farmer — farm/season workspace | Mở farm, mùa vụ, task và field log. Cho thấy ownership và PHI gate; dữ liệu tải lại từ backend. |
| 3:30–5:00 | Employee → Farmer approval | Employee cập nhật progress; Farmer approve/reject. Reload trang, chỉ task `DONE` sau approval mới phản ánh vào payroll. |
| 5:00–7:30 | Farmer/Admin certification | Mở self-assessment và certification. Giải thích training coverage 100%, evidence còn hạn và diary fail-explicit. Admin mở cert audit/CAPA/certificate persisted. |
| 7:30–9:00 | Harvest/lot/public trace | Đi từ harvest/product lot tới `/trace/:slug`; nhấn mạnh public claim lấy snapshot backend, route legacy chỉ redirect. |
| 9:00–11:00 | Buyer | Product → cart → checkout một lần → shipping quote authoritative → order; delivery được provision bởi event, không do browser tự tạo. |
| 11:00–12:00 | Kết luận | Mở evidence và route truth matrix; phân biệt current capability, phần đã tối giản và roadmap G3–G5. |

## Slide “Tối giản có chủ đích”

| Đã ẩn/redirect | Lý do | Khi nào mở lại |
|---|---|---|
| Trace page legacy dựng claim | Tránh hai nguồn sự thật | Không mở lại; dùng canonical public trace |
| Admin farm-document mock | Không có persistence đáng tin cậy | Chỉ mở route mới khi dùng document/cert read-model thật |
| Giao hàng tuần/tháng | Chưa có recurrence contract/scheduler | Có schedule persist, pause/cancel, idempotency và E2E |
| Prototype settings/monitoring và action local-only | Ngoài canonical outcome | Chỉ mở sau acceptance và server persistence |
| Diary partial response v2 | Tránh lan contract trong deadline | Có completeness status, missing sources, generatedAt và UI warning |

## Câu kết luận an toàn

“AgReli đã chứng minh core flow ở mức integrated/controlled và đã harden tính trung thực của UI, approval/payroll, training compliance và production dossier. G4/G5 vẫn cần drill vận hành, pilot người dùng và đối tác thật; đây là roadmap có gate đo lường, không phải claim từ code.”

## Checklist rehearsal

- [ ] Lần 1: ghi thời gian, aggregate IDs, lỗi và cách xử lý.
- [ ] Reset về seed/rehearsal state đã xác định mà không xóa volume ngoài phạm vi.
- [ ] Lần 2: chạy cùng thứ tự, không dùng dữ liệu hard-code hoặc thao tác DB để cứu demo.
- [ ] Chụp màn hình server truth sau reload cho bốn journey.
