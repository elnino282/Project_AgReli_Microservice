# Baseline tái hiện — 2026-08-14

Baseline này được chạy trên working tree audit hiện tại. Kết quả runtime chỉ được ghi là runtime evidence khi có stack Compose cô lập; suy luận từ source/test được ghi riêng.

## Môi trường

- Windows/PowerShell, Java 23, Maven 3.9.16.
- Node.js 24, npm 11.
- Docker Engine 29.6.1, Docker Compose 5.2.
- Stack audit dùng project `vietfuture_audit`, gateway `127.0.0.1:18080`, MySQL `127.0.0.1:13307`, container/volume tách khỏi stack dev.
- Stack dev đang chạy song song; không container/volume dev nào bị dừng hoặc xóa.

## Kết quả backend sạch

`mvn clean test` đã chạy riêng từng Maven project để tránh kết quả `target/` cũ:

| Module | Kết quả |
|---|---|
| identity, crop-catalog, ai, farm, season, inventory | Xanh |
| finance, incident, sustainability, marketplace, delivery, api-gateway | Xanh |
| admin-reporting | 5 suite unit/controller/listener: 19 test xanh; 2 suite Testcontainers (smoke + Flyway) chưa chạy lại vì daemon quá tải |

Regression sau patch S0:

- marketplace-service: 35 test xanh.
- season-service: 12 test xanh.
- delivery-service: 9 test xanh.

CI matrix đã được bổ sung `admin-reporting-service` và `delivery-service`; việc CI thực sự chạy xanh cần pipeline từ remote hoặc runner có Docker/MySQL.

## Kết quả frontend

- `npm run typecheck`: xanh.
- `npm run lint`: xanh, còn warning có sẵn.
- `npm run build`: xanh.
- `npm run test -- --run`: 266/268 test xanh; hai test AI hook baseline đỏ ở `useAiChatSession` và `useBuyerAiChatSession`.
- Regression marketplace transition/public trace: xanh.

Hai test AI hook được giữ trong backlog/baseline, không gộp vào patch S0 vì chưa chứng minh ảnh hưởng security/data integrity.

## Compose/static acceptance

- Base Compose và base + audit overlay đều qua `docker compose config`.
- `scripts/verify-compose-boundary.ps1` xác nhận service 8081–8092 không publish host port và gateway vẫn là ingress.
- Image build từ source hiện tại xanh cho đủ 12 service và gateway. Một lỗi Docker Hub TLS/token tạm thời được tái hiện hai lần; pull trực tiếp base image thành công rồi toàn bộ build hoàn tất.
- MySQL audit healthy với application credential + đủ 11 schema; identity kết nối `identity_db` và Flyway áp dụng v1–v2 trên volume mới.
- Cold-start đầu tiên không pass do Chroma healthcheck cũ gọi `curl` vắng trong image. Sau patch probe Bash TCP `/api/v2/healthcheck`, `docker compose up -d --build` và `up -d --wait --wait-timeout 300` đều exit 0; Chroma/dependency health xanh và gateway trả HTTP 200.
- Diagnostic start bỏ dependency gate đưa đủ 12 process lên, nhưng chạy đồng thời hai full stack vượt tài nguyên Docker Desktop (~11.7 GiB) trước khi thu đủ health state; vì vậy không service nào ngoài evidence đã ghi được coi là runtime-accepted.
- Giai đoạn 3 chạy lại audit stack từ volume mới: MySQL/RabbitMQ/Chroma healthy trước lớp service đầu và log Flyway xác nhận migrate schema trống. Docker Desktop API sau đó trả HTTP 500/không phản hồi khi hai full stack JVM cùng chạy; audit gateway chưa start, nên lần này không đủ điều kiện đóng readiness.
- Direct host TCP matrix Giai đoạn 3 xác nhận `127.0.0.1:8081..8092` đều không accept connection. Boundary script xanh và gateway config không có route internal; `AUD-S0-002` được đóng trong phạm vi single-host Compose.
- Compose còn xác nhận service `tempo` dùng nhầm image MailHog.

## Lệnh tiếp tục sau khi có cửa sổ tài nguyên riêng

```powershell
powershell -ExecutionPolicy Bypass -File scripts/audit-stack.ps1 -Action config
powershell -ExecutionPolicy Bypass -File scripts/audit-stack.ps1 -Action up
powershell -ExecutionPolicy Bypass -File scripts/audit-stack.ps1 -Action status
powershell -ExecutionPolicy Bypass -File scripts/verify-compose-boundary.ps1
```

Không chạy hai full stack đồng thời trong giới hạn RAM hiện tại. Với acceptance còn mở, dùng cửa sổ audit riêng để thu log đã loại secrets, kiểm tra Flyway/health đủ 12 service, smoke gateway `:18080` và xác nhận direct host ports 8081–8092 không kết nối.

Trước lần tiếp theo, xác nhận project `vietfuture_audit` của lần Docker API 500 đã được dọn. Chỉ dùng `down --volumes` với đúng project audit; không đụng volume dev.
