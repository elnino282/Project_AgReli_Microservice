# Frontend working memory

File này áp dụng cho toàn bộ `agricultural-crop-management-frontend/`. Đọc thêm `../AGENTS.md` cho kiến trúc hệ thống và các finding cross-service; không lặp lại chúng tại đây.

## Quy ước code

- Stack: React 18, TypeScript strict, Vite 6/SWC, Tailwind CSS 4, Radix UI, React Router 6, TanStack Query 5, Axios, React Hook Form + Zod, Vitest/Testing Library và Playwright.
- Kiến trúc đích là Feature-Sliced Design theo chiều phụ thuộc `app -> pages -> widgets -> features -> entities -> shared`. Layer thấp không import layer cao; slice export public API qua `index.ts`, tránh deep import. Alias chuẩn: `@app`, `@pages`, `@widgets`, `@features`, `@entities`, `@shared`, `@generated`, `@`.
- `src/services/`, `src/components/`, `src/hooks/` là boundary legacy đã dọn về 0. Không tạo lại các thư mục/import này; dùng đúng FSD slice và giữ `npm run check:legacy:baseline` xanh.
- Component/route dùng PascalCase (`*Page.tsx`, `*Route.tsx`, `*Dialog.tsx`); hook dùng `use*`; API/query key/schema/type đặt trong slice `api/` hoặc `model/`; test đặt cạnh code với `*.test.ts(x)`, E2E ở `tests/e2e/`.
- Server state dùng TanStack Query. Mutation thành công phải invalidate/update đúng query keys của entity; không tạo cache song song trong feature nếu entity đã có hooks.
- HTTP tập trung ở `src/shared/api/http.ts`: base URL là `VITE_API_BASE_URL` hoặc cùng origin, request interceptor gắn Bearer token và `Accept-Language`, response interceptor serialize refresh token. Feature không tạo Axios instance riêng và không gọi thẳng port microservice.
- Auth state canonical dùng key `acm_auth` trong localStorage hoặc sessionStorage; route UI dùng `ProtectedRoute`, nhưng mọi authorization thực sự vẫn phải được backend enforce.
- Client/schema Orval nằm trong `src/entities/*/api/generated/`; không sửa tay. Sửa OpenAPI backend rồi chạy `npm run generate:api`. Adapter/hook handwritten nằm ngoài `generated/` và chuẩn hóa envelope `ApiResponse` tại boundary.
- UI ưu tiên component dùng lại trong `shared/ui`/slice UI, Tailwind tokens/class hiện có và i18n thay vì hard-code text mới. Giữ accessibility state/loading/error cho async UI.
- Trước khi hoàn tất: chạy tối thiểu `npm run typecheck`, `npm run lint`, test liên quan (`npm run test -- --run <path>`), và `npm run build` nếu đổi route/build/config. Với contract FDN có script `npm run test:fdn`.

## Known issues / Audit findings

Các finding marketplace/public-trace/delivery xuyên tầng đã được tóm tắt ở `../AGENTS.md` và theo dõi chi tiết trong `../docs/audit/AUDIT_BACKLOG.md`; không mở lại fallback certification/PHI giả hoặc farmer publish bypass đã có regression test.

1. **[FIXED 2026-08-21, AUD-S3-004] Architecture gates hoạt động.** `check:fsd` khóa 28 exception đã review và không cho thêm vi phạm; `check:legacy*` giữ baseline root legacy 0/0.
2. **[FIXED 2026-08-14, AUD-S0-010] Auth refresh giữ contract và provenance.** `http.ts` parse `ApiResponse.result`, giữ user, ghi lại đúng local/session, loại record malformed, single-flight và không recurse khi refresh trả 401. Auth regression 12/12, typecheck/lint/build xanh.
3. **[FIXED 2026-08-20, AUD-S3-005] Orval đã liệt kê `delivery-service` (8092).** Snapshot/client generated tồn tại; handwritten adapter chỉ giữ ở boundary tương thích, không sửa generated client bằng tay.
4. **[FIXED 2026-08-21, AUD-S3-006] Root legacy boundary đã dọn xong.** 76 import dùng shared canonical, 56 file dưới root components/hooks được xóa; `src/components|hooks|services` và legacy import đều bằng 0. FSD còn 28 cross-layer exception cũ đã khóa baseline, không được tăng nếu chưa review.
5. **[FIXED 2026-08-21, AUD-S2-007] AI chat giữ provenance xuyên tầng.** Contract generated có `sources`; farmer/buyer hook giữ metadata backend thay vì tạo `[]`, fallback không bịa nguồn và hook regression 3/3 xanh.
6. **[FIXED 2026-08-21, AUD-S1-001/AUD-S1-003/AUD-S1-005] Các route S1 dùng contract thật.** Admin audit không fallback mock và action theo state machine backend; checkout giao provisioning cho consumer; export dossier tải `FarmDocumentResponse.fileUrl` và không tạo ZIP giả từ JSON.
7. **[FIXED 2026-08-21, AUD-S2-001/AUD-S2-008] Hai route farmer không còn báo thành công trên dữ liệu giả/local-only.** AI harvest dùng ngày/log season persisted; self-assessment chỉ sửa item MANUAL qua API và fetch lại server truth trước khi hiện kết quả.
8. **[FIXED 2026-08-21, AUD-S3-001/002/003/007] Route và local demo S3 đã đóng.** Dashboard dùng FDN API thật; ba tab nutrient/water/soil đã wire và đọc seed snapshot qua outbox backfill; duplicate SeasonsPage đã xóa; `npm run demo:smoke` pass đủ bốn persona qua localhost:3000.
9. **[FIXED 2026-08-27, AUD-S3-009/010] Browser acceptance đã khóa local port và Employee task context.** `.env.development` dùng port 3000; `TaskSchema` giữ `plotName`, `plotArea`, `estimatedCompletionDate`. Playwright thật, không mock network, pass 8/8 cho Admin/Buyer/Employee, reload và role isolation. Journey mutation vẫn chạy riêng trên stack audit.
10. **[FIXED 2026-08-27, AUD-S2-009] Employee evidence không còn upload giả.** File input gán cứng `dummyimage.com` đã bị gỡ. Vì backend chỉ nhận `evidenceUrl`, route sống yêu cầu URL HTTP(S) persisted và validate trước mutation; không toast thành công nếu chưa có nguồn thật.

Khi fix hoặc audit thêm finding frontend, cập nhật danh sách này ngay; finding cross-service/security chung thuộc `../AGENTS.md`.
