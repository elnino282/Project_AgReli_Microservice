# 🌾 Hướng dẫn Khởi chạy Hệ thống ACM (Agricultural Crop Management)

Tài liệu hướng dẫn **từng bước** để chạy thành công toàn bộ hệ thống ACM trên các nền tảng (Windows/Linux/macOS), bao gồm kiểm tra môi trường, khởi chạy Backend (Microservices), Frontend (React + Vite), và giải thích cơ chế tự động import dữ liệu.

---

## 📋 Mục lục
1. [Yêu cầu hệ thống tối thiểu](#1-yêu-cầu-hệ-thống-tối-thiểu)
2. [Kiểm tra môi trường (Đặc biệt cho Linux)](#2-kiểm-tra-môi-trường-đặc-biệt-cho-linux)
3. [Chuẩn bị cấu hình (Chung cho Windows & Linux)](#3-chuẩn-bị-cấu-hình)
4. [Khởi chạy Backend bằng Docker Compose](#4-khởi-chạy-backend-bằng-docker-compose)
5. [Xác nhận Backend chạy thành công](#5-xác-nhận-backend-chạy-thành-công)
6. [Khởi chạy Frontend (React + Vite)](#6-khởi-chạy-frontend-react--vite)
7. [Giải thích cơ chế Import dữ liệu (Flyway)](#7-giải-thích-cơ-chế-import-dữ-liệu-flyway)
8. [Tài khoản đăng nhập mẫu](#8-tài-khoản-đăng-nhập-mẫu)
9. [Danh sách cổng dịch vụ](#9-danh-sách-cổng-dịch-vụ)
10. [Xử lý sự cố (Troubleshooting)](#10-xử-lý-sự-cố-troubleshooting)

---

## 1. Yêu cầu hệ thống tối thiểu

| Phần mềm | Phiên bản tối thiểu | Mục đích |
|---|---|---|
| **Docker & Docker Compose** | 20.10+ (v2.0+) | Chạy MySQL, RabbitMQ, MinIO, microservices |
| **Node.js** | v18+ | Chạy Frontend React dev server |
| **npm** | v9+ | Quản lý dependencies Frontend |
| **Git** | 2.x | Clone và đồng bộ mã nguồn |
| **OpenSSL** | 1.1+ | Generate RSA key pair cho JWT |

---

## 2. Kiểm tra môi trường (Đặc biệt cho Linux)

Bạn có thể chạy các lệnh sau trên Linux/macOS để đảm bảo máy đã cài đủ công cụ:

```bash
docker --version
docker compose version
node --version
npm --version
git --version
openssl version
```

**Kiểm tra các cổng không bị chiếm:** Các cổng host 3000, 3001, 3200, 3307, 5672, 8000 (Chroma), 8025, 8080, 9000, 9001, 9090 và 15672 phải trống trước khi chạy. Các port service 8081–8092 chỉ dùng trong mạng Compose và không mở trực tiếp ra host.

---

## 3. Chuẩn bị cấu hình

### 3.1. Chuẩn bị tệp môi trường cho Backend (`.env`)

Sao chép tệp cấu hình mẫu thành `.env` tại thư mục gốc của dự án:

* **Windows (Command Prompt)**:
  ```cmd
  copy .env.example .env
  ```
* **Windows (PowerShell)**:
  ```powershell
  Copy-Item .env.example .env
  ```
* **Linux/macOS**:
  ```bash
  cp .env.example .env
  ```

Mở file `.env` và cập nhật các giá trị cần thiết, quan trọng nhất là API Key của Gemini nếu muốn sử dụng chatbot:
```properties
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3.2. Cấu hình môi trường cho Frontend
Tệp `.env.development` đã được tạo sẵn tại thư mục `agricultural-crop-management-frontend/.env.development` chứa thông tin cấu hình Firebase Chat và Google Maps. Bạn không cần chỉnh sửa thêm trừ khi muốn đổi tài khoản Firebase/Google Maps khác.

### 3.3. Generate RSA Key Pair cho JWT (Bắt buộc)
Hệ thống sử dụng cơ chế chữ ký khóa bất đối xứng RSA (RS256). Các khóa bảo mật đã được đặt trong thư mục `identity-service/src/main/resources/keys/` và tự động load khi khởi động. **File `.pem` bị `.gitignore` nên bạn phải tự generate:**

* **Trên Windows (Sử dụng Git Bash hoặc PowerShell có cài đặt OpenSSL)**:
  Chạy các lệnh OpenSSL tương tự như trên Linux dưới đây.

* **Trên Linux/macOS**:
  ```bash
  mkdir -p identity-service/src/main/resources/keys
  openssl genpkey -algorithm RSA -out identity-service/src/main/resources/keys/rsa-private.pem -pkeyopt rsa_keygen_bits:2048
  openssl rsa -pubout -in identity-service/src/main/resources/keys/rsa-private.pem -out identity-service/src/main/resources/keys/rsa-public.pem
  ```

---

## 4. Khởi chạy Backend bằng Docker Compose

Mở terminal tại thư mục gốc của dự án và chạy:
```bash
docker compose up -d --build --wait --wait-timeout 300
```
*(Lần đầu tiên sẽ mất 5–15 phút để download Docker images và build Maven)*

Lệnh chỉ trả về thành công khi các dependency/service có healthcheck đã ready; không cần đoán thời gian bằng cách sleep cố định.

---

## 5. Xác nhận Backend chạy thành công

Sử dụng các lệnh sau để kiểm tra runtime và API Gateway:

```bash
docker compose ps
curl http://localhost:8080/actuator/health
```

Gateway phải trả HTTP 200 với `"status":"UP"`; các container có healthcheck phải hiển thị `healthy`, không chỉ `Up`.

---

## 6. Khởi chạy Frontend (React + Vite)

Khởi chạy frontend cục bộ trên máy để kết nối trực tiếp đến API Gateway thông qua cấu hình phát triển:

1. Di chuyển vào thư mục frontend: `cd agricultural-crop-management-frontend`
2. Cài đặt đúng dependency lockfile: `npm ci`
3. Khởi chạy: `npm run dev`

Ứng dụng frontend sẽ hoạt động tại địa chỉ: **http://localhost:3000** và proxy `/api` tới API Gateway **http://localhost:8080**.

Trong terminal khác, chạy acceptance nhanh cho bốn tài khoản mẫu và các route demo chính:

```bash
cd agricultural-crop-management-frontend
npm run demo:smoke
```

Kết quả cuối phải là `LOCAL_DEMO_SMOKE=PASS`. Script không in access token; có thể override tài khoản bằng các biến `DEMO_*_EMAIL`/`DEMO_*_PASSWORD` nếu không dùng seed mặc định.

Để chạy acceptance browser thật cho Admin, Buyer và Employee (không mock network, read-only trên volume dev):

```bash
cd agricultural-crop-management-frontend
npx playwright install chromium
npm run test:e2e
```

Suite tự khởi động Vite tại `http://localhost:3000`, kiểm tra reload và role isolation. Các journey có mutation chỉ chạy trên stack audit cô lập; xem `docs/audit/PHASE5_ACCEPTANCE.md`.

---

## 7. Giải thích cơ chế Import dữ liệu (Flyway)

**Flyway** tự động chạy các file SQL migration để tạo schema (tables, indexes, constraints) khi mỗi service khởi động. Tuy nhiên, Flyway CHỈ tạo cấu trúc bảng, KHÔNG tự import dữ liệu mẫu (seed data). Sau khi chạy `docker compose up` thành công, các database hoàn toàn trống.

Để có dữ liệu mẫu trải nghiệm, bạn cần chạy script import thủ công:
* **Trên Windows**: Tham khảo hướng dẫn và chạy script tại `docs/Hướng dẫn luồng thao tác import dữ liệu mới window.md` (nếu có).
* **Trên Linux/macOS**: Tham khảo `docs/Hướng dẫn luồng thao tác import dữ liệu mới linux.md` (nếu có).

*(Ghi chú: Nếu file markdown trên bị thiếu, hãy xem file `docs/data_import_guide.md` để tham khảo chi tiết lệnh Python để seed data.)*

---

## 8. Tài khoản đăng nhập mẫu

Sau khi chạy thành công bước import dữ liệu mẫu, bạn có thể đăng nhập bằng các tài khoản sau (hoặc đăng ký mới trên Frontend nếu không import):

| Quyền hạn (Role) | Email đăng nhập | Mật khẩu |
|---|---|---|
| Admin | admin@acm.local | admin123 |
| Farmer | farmer@acm.local | 12345678 |
| Employee | employee@acm.local | 12345678 |
| Buyer | buyer@acm.local | 12345678 |

---

## 9. Danh sách cổng dịch vụ

* **Frontend (React/Vite)**: 3000
* **API Gateway**: 8080
* **MySQL**: 3307
* **Chroma**: 8000
* **RabbitMQ Console**: 15672 (rabbituser / rabbitpass)
* **MinIO Console**: 9001 (minioadmin / minioadmin)
* **MailHog**: 8025 (Hộp thư test)
* **Grafana**: 3001
* **Prometheus**: 9090
* **Tempo query/readiness**: 3200
* *(12 microservice chạy nội bộ ở port 8081–8092; browser chỉ gọi qua Gateway 8080)*

---

## 10. Xử lý sự cố (Troubleshooting)

1. **Xem log chi tiết**: `docker compose logs -f [tên_service]` (Ví dụ: `identity-service`)
2. **Dừng toàn bộ hệ thống**: `docker compose down`
3. **Dừng nhưng giữ dữ liệu**: `docker compose down`. Chỉ dùng `docker compose down -v` sau khi đã backup và chủ động chấp nhận xóa toàn bộ MySQL/RabbitMQ/MinIO/Tempo.

Lỗi phổ biến:
* **Access denied for user 'springuser'@'%'**: kiểm tra `.env`, `docker compose logs mysql` và credential healthcheck. Không xóa volume như bước xử lý mặc định vì có thể làm mất dữ liệu dev.
* **keys/rsa-private.pem cannot be opened**: Chưa generate RSA keys.
* **Connection refused (RabbitMQ/MySQL)**: Service phụ thuộc chưa sẵn sàng, đợi thêm một lát service sẽ tự retry.
