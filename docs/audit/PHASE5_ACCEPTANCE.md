# Giai đoạn 5 — Acceptance xuyên tầng

Cập nhật gần nhất: 2026-08-27.

## Phạm vi đã xác minh trên localhost

Bộ test `agricultural-crop-management-frontend/tests/e2e/portal-readiness.spec.ts` chạy Chromium thật, không mock network và gọi frontend `http://localhost:3000` qua API Gateway `http://localhost:8080`.

| Persona | Journey đã pass | Bằng chứng |
|---|---|---|
| Employee | Đăng nhập → task có tên lô/diện tích → progress → payroll → reload | Response thật từ `/api/v1/employee/tasks`, `/progress`, `/payroll`; không có 5xx; dữ liệu seed vẫn hiển thị sau reload |
| Admin | Đăng nhập → dashboard → certification audits → marketplace products/orders → reload | Dashboard, farm audit, product và order read model thật; không có 5xx |
| Buyer | Đăng nhập → danh sách đơn → chi tiết đơn → reload | Order thuộc đúng `buyerUserId`; danh sách/chi tiết persisted vẫn hiển thị sau reload |
| Security | Anonymous và sai role vào route/API của persona khác | UI redirect về sign-in/default portal; backend trả HTTP 403 |

Lệnh xác minh:

```bash
cd agricultural-crop-management-frontend
npx playwright install chromium
npm run test:e2e
```

Kết quả ngày 2026-08-27: `8 passed`; schema regression Employee: `1 passed`; `npm run typecheck` xanh.

## Finding phát hiện trong acceptance

- `AUD-S3-009` — `.env.development` vẫn dùng port 5173 dù RUN_GUIDE/smoke dùng 3000. Đã sửa về 3000 và khóa bằng Playwright web server URL.
- `AUD-S3-010` — `TaskSchema` loại bỏ `plotName`, `plotArea` và `estimatedCompletionDate`, khiến Employee UI mất context lô dù backend trả đúng. Đã giữ các field tại entity boundary và thêm unit + browser regression.
- `AUD-S2-009` — Employee file input gán cứng `dummyimage.com` và báo upload thành công dù không gửi file. Backend hiện chỉ có `evidenceUrl`; UI đã đổi sang URL HTTP(S) persisted, validate và fail rõ. Upload file trực tiếp cần một contract riêng, không được giả lập ở frontend.

## Phạm vi chưa được coi là hoàn tất

Suite hiện tại cố ý read-only để không làm bẩn volume dev. Giai đoạn 5 chỉ được đóng toàn phần sau khi các journey mutation dưới đây pass trên project Compose `vietfuture_audit` với seed riêng:

1. Employee nhận task → báo 1–99% → báo 100% kèm evidence thật → Farmer approve/reject → payroll recalculation → reload.
2. Admin start/complete certification audit, issue certificate và thay đổi trạng thái marketplace/delivery; xác nhận DB/read model và quyền sai role.
3. Buyer cart → shipping quote → checkout idempotent → RabbitMQ tạo đúng một delivery → reload; thêm downstream-failure scenario.
4. Cross-persona Farmer submit listing → Admin publish → Buyer mua → Employee/farmer fulfillment, kiểm tra state machine xuyên service.

Không chạy mutation acceptance trên volume dev hiện tại. Dùng `scripts/audit-stack.ps1` và không chạy đồng thời hai full stack nếu Docker Desktop thiếu tài nguyên.
