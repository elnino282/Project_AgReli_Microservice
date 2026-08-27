# AgReli — Bằng chứng triển khai kế hoạch hoàn thiện ba ngày

**Thời điểm chốt kỹ thuật:** 2026-08-25 (Asia/Bangkok)  
**Git baseline:** `20f2df1c`  
**Phạm vi:** WP1–WP8 của `THREE_DAY_PROJECT_COMPLETION_PLAN.md`

## 1. Kết quả theo work package

| WP | Trạng thái | Bằng chứng chính |
|---|---|---|
| WP1 — Public trace trung thực | Hoàn tất | Route legacy redirect về `/trace/:slug`; component test xác minh redirect, không còn dựng timeline/claim mẫu tại route sống. |
| WP2 — Gỡ admin document giả | Hoàn tất | Bỏ menu/page mock; key legacy redirect về `/admin/cert-audits`; config regression test bảo vệ navigation. |
| WP3 — Nghiệm thu task thật | Hoàn tất | Approve/reject dùng mutation backend, reject bắt buộc lý do, cache progress/task/payroll được invalidated; payroll chỉ tính lại sau khi task chuyển `DONE`. |
| WP4 — Ẩn recurring giả | Hoàn tất | Checkout chỉ còn giao một lần; đã bỏ state/control weekly/monthly chưa có contract. |
| WP5 — Training compliance | Hoàn tất theo scope 100% | Tính trên toàn bộ thành viên và mọi chương trình bắt buộc; record phải hoàn tất, còn hạn và có evidence. Empty/partial/expired đều không PASS; outage fail-closed. Migration V21 seed hai chương trình bắt buộc theo cách idempotent. |
| WP6 — Diary/dossier fail-explicit | Hoàn tất theo scope release | Sustainability source lỗi/null trả typed 503; dossier không persist document khi diary không xác minh được. Response completeness v2 vẫn là roadmap. |
| WP7 — Route truth audit | Hoàn tất trong demo scope | `DEMO_RELEASE_ROUTE_TRUTH_MATRIX.md` phân loại `VERIFIED_REAL`, `HIDDEN_FROM_RELEASE`, `ROADMAP_ONLY`. Không tuyên bố đã audit toàn bộ prototype ngoài demo. |
| WP8 — Verification | Hoàn tất phần tự động/runtime | Full suites, frontend quality gates, stack health và demo smoke đều xanh. Bốn journey có screenshot/aggregate ID và hai lần rehearsal liên tiếp vẫn là gate thủ công. |

## 2. Kết quả kiểm thử có thể lặp lại

| Phạm vi | Lệnh/gate | Kết quả 2026-08-25 |
|---|---|---|
| Frontend targeted | Vitest cho task approval, public trace, navigation và certification | 12/12 PASS |
| Frontend full | `npm run test -- --run` | 85 files, 297 tests PASS |
| Frontend types | `npm run typecheck` | PASS |
| Frontend lint | `npm run lint` | Exit 0; chỉ còn warning debt có trước, không có error |
| Frontend build | `npm run build` | PASS, Vite build hoàn tất trong 15,93 giây |
| Farm targeted | Scoring + dossier export | 10/10 PASS |
| Farm full | `mvn test` | 32 tests, 0 failure/error |
| Season targeted | Approval + training compliance + diary failure | 8/8 PASS |
| Season full sau V21 | `mvn test` | 29 tests, 0 failure/error |
| Contract | OpenAPI generator tests | Season snapshot có endpoint training-compliance; contract đã generate/test |
| Runtime | `docker compose up -d --build ...`, health probes | 12 business services healthy; gateway `UP` |
| Runtime migration | Query `/api/v1/internal/seasons/2/training-compliance` | `requiredCategories=[SAFETY, OPERATIONS]`, 0/2 compliant, `compliant=false` |
| Demo smoke canonical | Frontend `127.0.0.1:3000`, `npm run demo:smoke` | `LOCAL_DEMO_SMOKE=PASS` cho Farmer, Employee, Buyer, Admin và public marketplace |

## 3. Before/after theo maturity gate

| Gate | Trước triển khai | Sau triển khai | Giới hạn tuyên bố |
|---|---|---|---|
| G0 — Truthful UI | Còn trace/admin document/recurring và task approval gây claim hoặc success không phản ánh server truth | Đã đóng các finding T-01..T-04 trong demo scope | Chưa coi T-05 là hoàn tất vì chưa audit mọi route prototype trong toàn repo |
| G1 — Security & integrity | Core ownership/fail-closed đã mạnh; task approval/payroll còn thiếu liên kết server | Giữ nguyên boundary, bổ sung approval thật và chỉ tính payroll sau `DONE` | Chưa bổ sung idempotency/audit log tổng quát cho mọi mutation |
| G2 — End-to-end core | Core flow đã tích hợp | Không làm suy giảm; smoke bốn persona PASS | Smoke không thay thế bốn journey thủ công xuyên tầng |
| G3 — Evidence & provenance | Training có thể PASS sai; diary có thể im lặng thiếu nguồn | Training 100% fail-closed; diary/dossier fail-explicit | Chưa có completeness response v2, manifest/checksum và decision rule version đầy đủ |
| G4 — Operability | Health/metrics/tracing và CI đã có | Full regression và runtime health được tái xác minh | Backup/restore drill, DLQ/replay/SLO evidence vẫn cần lộ trình riêng |
| G5 — Adoption & ecosystem | Chưa có pilot/đối tác thật được đo | Không thay đổi | Không dùng code/demo nội bộ để tuyên bố mức 4,7–5,0 |

## 4. Gate thủ công còn lại trước buổi báo cáo

- Chạy đủ bốn journey canonical và lưu screenshot, request/response, aggregate ID cùng server truth sau reload.
- Chạy demo script hai lần liên tiếp trên đúng seed; chỉ sửa P0 regression sau code freeze.
- Chuẩn bị slide 10–15 phút từ route truth matrix; không đưa các mục `HIDDEN_FROM_RELEASE` hoặc `ROADMAP_ONLY` vào claim.
- Nếu một journey không tạo đủ evidence, hạ claim của route tương ứng thay vì suy diễn từ unit test hoặc source code.

## 5. Quyết định release

Release demo hiện đủ điều kiện kỹ thuật tự động để bước vào rehearsal. Mức trưởng thành được cải thiện rõ ở G0 và một phần G3, nhưng kết luận cuối cùng vẫn phải chờ evidence thủ công. Các năng lực G4/G5 dài hạn tiếp tục theo roadmap, không mở lại trong ba ngày trừ lỗi P0.

## 6. Rollback note cho thay đổi rủi ro

| Thay đổi | Dấu hiệu cần rollback/hạ scope | Cách xử lý an toàn |
|---|---|---|
| Task approval/payroll | Approve không persist hoặc payroll sai sau reload | Ẩn action khỏi demo, giữ endpoint cũ; không sửa DB trực tiếp. |
| Training compliance + V21 | Seed mandatory program xung đột policy nghiệp vụ | Tạo migration additive tiếp theo để điều chỉnh/deactivate policy; không sửa hoặc xóa V21 đã áp dụng. |
| Diary/dossier fail-explicit | Client chưa xử lý typed 503 ổn định | Hạ route export khỏi demo; không khôi phục silent fallback hoặc tạo document thiếu nguồn. |
| Trace/admin/recurring UI | Redirect gây route regression | Giữ canonical route thật và hạ link lỗi khỏi navigation; không khôi phục mock/local success. |

Mọi rollback release ưu tiên ẩn hoặc hạ claim. Không dùng `docker compose down -v`, không sửa migration đã phát hành và không khôi phục fallback tạo dữ liệu giả.
