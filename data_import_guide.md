# Hướng dẫn audit và import seed data AgReli

`import_all_data.py` quản lý bộ dữ liệu demo xuyên suốt 11 database của AgReli. Script mặc định chỉ audit và **không thay đổi dữ liệu**. Việc `TRUNCATE` chỉ xảy ra khi truyền đồng thời cờ reset và chuỗi xác nhận chính xác.

## 1. Phạm vi seed

- Bao phủ 11 schema runtime: admin reporting, crop catalog, delivery, farm, finance, identity, incident, inventory, marketplace, season và sustainability.
- Có dữ liệu cho toàn bộ bảng nghiệp vụ hiện hành và khai báo đầy đủ mọi cột có thể insert theo schema Flyway đang chạy; số bảng được audit được in trực tiếp sau mỗi lần chạy để không bị lỗi thời khi thêm migration.
- Giữ nguyên bốn bảng identity bootstrap: `users`, `roles`, `user_roles`, `user_preferences`, nhằm không làm mất password hash và tài khoản đăng nhập demo.
- Chủ động để trống 16 bảng kỹ thuật như outbox, processed event, token và idempotency. Seed các bảng này có thể làm phát lại event hoặc che mất event thật.
- Audit xác minh contract tài khoản mà dữ liệu liên-service sử dụng: ID 1 ADMIN, ID 2 FARMER, ID 3 EMPLOYEE và ID 4 BUYER.

## 2. Điều kiện chạy

- MySQL đang chạy tại host/port cấu hình, mặc định là `localhost:3307`.
- Flyway đã tạo đủ 11 schema và migration mới nhất đã được áp dụng.
- Identity service đã khởi tạo bốn tài khoản demo nền.
- Python có package `mysql-connector-python`.

Thiết lập môi trường Windows PowerShell nếu chưa có:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install mysql-connector-python
```

Có thể thay cấu hình kết nối bằng các biến môi trường:

```powershell
$env:IMPORT_DB_HOST = "localhost"
$env:IMPORT_DB_PORT = "3307"
$env:IMPORT_DB_USER = "springuser"
$env:IMPORT_DB_PASSWORD = "springpass"
```

Không ghi password thật vào source code hoặc commit lên Git.

## 3. Quy trình khuyến nghị

### Bước 1 — Audit read-only

Lệnh mặc định và `--audit-only` tương đương nhau:

```powershell
.\venv\Scripts\python.exe import_all_data.py
.\venv\Scripts\python.exe import_all_data.py --audit-only
```

Audit đối chiếu trực tiếp seed với `information_schema`: database/table hiện hành, số cột, tên cột, số placeholder, độ dài tuple, dữ liệu identity được giữ lại và các bảng chưa có seed.

### Bước 2 — Kiểm tra SQL trên bảng tạm

```powershell
.\venv\Scripts\python.exe import_all_data.py --validate-inserts
```

Chế độ này tạo temporary table theo schema thật, chạy toàn bộ câu `INSERT`, rồi tự hủy khi đóng connection. Dữ liệu trong base table không đổi. Đây là bước bắt buộc nên chạy trước mỗi lần reset/import.

### Bước 3 — Reset và import có chủ đích

> Cảnh báo: lệnh dưới đây xóa toàn bộ dữ liệu nghiệp vụ hiện tại trong 11 schema. Chỉ chạy trên môi trường local/demo đã được phép reset và đã sao lưu dữ liệu cần giữ.

Để tránh consumer/outbox xử lý dữ liệu giữa lúc import, hãy dừng các application service nhưng giữ MySQL chạy. Sau khi audit và validate đều xanh, chạy:

```powershell
.\venv\Scripts\python.exe import_all_data.py --reset-and-import --confirm-reset RESET_ALL_SERVICE_DATA
```

Script sẽ:

1. Audit lại trước khi xóa dữ liệu.
2. Chỉ reset đúng 11 schema được khai báo, không quét tùy ý mọi database có hậu tố `_db`.
3. Không xóa `flyway_schema_history` và bốn bảng identity bootstrap.
4. Import dữ liệu theo chuỗi nghiệp vụ thống nhất từ mùa vụ đến kho, marketplace, giao hàng, chứng nhận và báo cáo.
5. Xác minh mọi bảng nghiệp vụ có row và mọi bảng kỹ thuật thuộc danh sách loại trừ vẫn trống.

Sau khi import thành công, khởi động lại application service và chạy smoke test theo `RUN_GUIDE.md`.

## 4. Tài khoản và dữ liệu demo chính

| User ID | Email | Role | Mục đích |
|---:|---|---|---|
| 1 | `admin@acm.local` | ADMIN | Duyệt chứng nhận, audit, báo cáo |
| 2 | `farmer@acm.local` | FARMER | Chủ farm, mùa vụ, sản phẩm |
| 3 | `employee@acm.local` | EMPLOYEE | Task, nhật ký, xử lý sự cố |
| 4 | `buyer@acm.local` | BUYER | Giỏ hàng, đơn hàng, đánh giá |

Kịch bản dữ liệu chính là vụ Hè Thu 2026 trồng lúa Đài Thơm 8 đang `ACTIVE`: mọi task đã `DONE`, thu hoạch 34.500/34.500 kg đạt 100%, sản phẩm đã nhập kho và `end_date` vẫn `NULL`. Farmer chỉ còn thao tác **Complete Season** để ghi ngày kết thúc và chuyển trạng thái sang `COMPLETED`. Chứng nhận VietGAP seed chỉ bao phủ đúng mùa vụ này, sản phẩm Lúa Nước/Đài Thơm 8, thửa Lô A1, diện tích 5 ha và sản lượng dự kiến 34.500 kg; nó không chứng nhận chung mọi sản phẩm của nông trại. Seed cũng có vật tư/PHI, sản phẩm marketplace, đơn đã giao và các read-model báo cáo/sustainability tương ứng.

## 5. Khi schema thay đổi

Sau khi thêm Flyway migration:

1. Chạy `--audit-only` để nhận danh sách bảng/cột seed còn thiếu.
2. Bổ sung câu `INSERT` và dữ liệu vào đúng hàm `import_<schema>_db`.
3. Nếu là bảng kỹ thuật buộc phải trống, thêm rõ vào `TECHNICAL_EMPTY_TABLES` và ghi lý do.
4. Chạy `--validate-inserts` để bắt lỗi kiểu dữ liệu, foreign key và unique constraint.
5. Chỉ sau đó mới cân nhắc chạy reset thật.

Không sửa migration Flyway đã phát hành chỉ để làm seed chạy được; seed phải thích nghi với schema hiện hành.

Hướng dẫn nhanh:
Chạy từ thư mục root VietFuture2026.
Trước tiên kiểm tra seed trên bảng tạm, không làm mất dữ liệu:
.\venv\Scripts\python.exe import_all_data.py --validate-inserts
Nếu kết quả thành công, chạy import thật:
.\venv\Scripts\python.exe import_all_data.py --reset-and-import --confirm-reset RESET_ALL_SERVICE_DATA
Lưu ý: lệnh thứ hai sẽ xóa và nhập lại toàn bộ dữ liệu nghiệp vụ demo trong 11 database. Các tài khoản đăng nhập demo được giữ lại.
Nếu chưa có môi trường Python:
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install mysql-connector-python
MySQL phải đang chạy tại localhost:3307. Sau khi import thành công, khởi động lại hệ thống:
docker compose up -d --build --wait --wait-timeout 300
Hướng dẫn đầy đủ nằm trong [data_import_guide.md](C:/Users/thong/Desktop/VietFuture2026/data_import_guide.md).