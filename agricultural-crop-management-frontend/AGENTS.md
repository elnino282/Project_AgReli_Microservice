# Frontend working memory

File này áp dụng cho toàn bộ `agricultural-crop-management-frontend/`. Đọc thêm `../AGENTS.md` cho kiến trúc hệ thống và các finding cross-service; không lặp lại chúng tại đây.

## Quy ước code

- Stack: React 18, TypeScript strict, Vite 6/SWC, Tailwind CSS 4, Radix UI, React Router 6, TanStack Query 5, Axios, React Hook Form + Zod, Vitest/Testing Library và Playwright.
- Kiến trúc đích là Feature-Sliced Design theo chiều phụ thuộc `app -> pages -> widgets -> features -> entities -> shared`. Layer thấp không import layer cao; slice export public API qua `index.ts`, tránh deep import. Alias chuẩn: `@app`, `@pages`, `@widgets`, `@features`, `@entities`, `@shared`, `@generated`, `@`.
- `src/services/`, `src/components/`, `src/hooks/` là legacy đang được migrate. Không thêm import mới vào đó nếu chức năng có thể đặt đúng FSD slice.
- Component/route dùng PascalCase (`*Page.tsx`, `*Route.tsx`, `*Dialog.tsx`); hook dùng `use*`; API/query key/schema/type đặt trong slice `api/` hoặc `model/`; test đặt cạnh code với `*.test.ts(x)`, E2E ở `tests/e2e/`.
- Server state dùng TanStack Query. Mutation thành công phải invalidate/update đúng query keys của entity; không tạo cache song song trong feature nếu entity đã có hooks.
- HTTP tập trung ở `src/shared/api/http.ts`: base URL là `VITE_API_BASE_URL` hoặc cùng origin, request interceptor gắn Bearer token và `Accept-Language`, response interceptor serialize refresh token. Feature không tạo Axios instance riêng và không gọi thẳng port microservice.
- Auth state canonical dùng key `acm_auth` trong localStorage hoặc sessionStorage; route UI dùng `ProtectedRoute`, nhưng mọi authorization thực sự vẫn phải được backend enforce.
- Client/schema Orval nằm trong `src/entities/*/api/generated/`; không sửa tay. Sửa OpenAPI backend rồi chạy `npm run generate:api`. Adapter/hook handwritten nằm ngoài `generated/` và chuẩn hóa envelope `ApiResponse` tại boundary.
- UI ưu tiên component dùng lại trong `shared/ui`/slice UI, Tailwind tokens/class hiện có và i18n thay vì hard-code text mới. Giữ accessibility state/loading/error cho async UI.
- Trước khi hoàn tất: chạy tối thiểu `npm run typecheck`, `npm run lint`, test liên quan (`npm run test -- --run <path>`), và `npm run build` nếu đổi route/build/config. Với contract FDN có script `npm run test:fdn`.

## Known issues / Audit findings

Các finding marketplace/public-trace/delivery xuyên tầng đã được tóm tắt ở `../AGENTS.md` và theo dõi chi tiết trong `../docs/audit/AUDIT_BACKLOG.md`; không mở lại fallback certification/PHI giả hoặc farmer publish bypass đã có regression test.

1. **[OPEN - LOW, AUD-S3-004] Hai architecture script trong `package.json` không tồn tại.** `check:fsd` và `check:legacy*` trỏ tới hai file vắng mặt. ESLint vẫn enforce một phần FSD, nhưng không báo các gate này đã chạy.
2. **[FIXED 2026-08-14, AUD-S0-010] Auth refresh giữ contract và provenance.** `http.ts` parse `ApiResponse.result`, giữ user, ghi lại đúng local/session, loại record malformed, single-flight và không recurse khi refresh trả 401. Auth regression 12/12, typecheck/lint/build xanh.
3. **[OPEN - LOW, AUD-S3-005] Orval config chưa liệt kê `delivery-service` (8092).** Delivery hiện dùng handwritten `src/shared/api/deliveryApi.ts`; không tạo generated client song song âm thầm.
4. **[ONGOING, AUD-S3-006] FSD migration chưa hoàn tất.** Khi chuyển file, cập nhật public exports/imports và không tăng số legacy import; chỉ cập nhật baseline khi review xác nhận.
5. **[OPEN - MEDIUM, AUD-S2-007] AI chat hook làm mất provenance và test contract đã drift.** Farmer/buyer hook dùng `aiApi.chat/buyerChat` nhưng luôn gắn sources `[]`; hai test vẫn mock API cũ và baseline đỏ. Phải chốt contract mới trước khi sửa test hoặc UI.

Khi fix hoặc audit thêm finding frontend, cập nhật danh sách này ngay; finding cross-service/security chung thuộc `../AGENTS.md`.
