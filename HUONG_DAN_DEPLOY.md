# HƯỚNG DẪN DEPLOY (CÀI ĐẶT) DANALOG PORTAL

Tài liệu này hướng dẫn cách deploy ứng dụng Danalog Portal phiên bản **Full Stack** (Bao gồm Web Frontend, Backend Server, và Database).

## Kiến trúc hệ thống
Để phần mềm hoạt động đầy đủ và lưu trữ được dữ liệu lâu dài, hệ thống cần chạy 2 thành phần cùng lúc:
1.  **Backend (Server)**: Chạy bằng Node.js, chịu trách nhiệm xử lý logic và lưu dữ liệu vào Database (file `danalog.db`).
2.  **Frontend (Web)**: Giao diện người dùng, chạy trên trình duyệt, kết nối tới Backend để lấy và gửi dữ liệu.

Chúng ta sẽ sử dụng **Docker Compose** để chạy cả 2 thành phần này tự động chỉ với 1 lệnh.

---

## Yêu cầu chuẩn bị
- Server đã cài đặt **Docker** và **Docker Compose**.
  - Nếu cài Docker Desktop (trên Mac/Windows) thì đã có sẵn.
  - Trên Linux, có thể cần cài thêm plugin compose (`sudo apt install docker-compose-plugin`).

## Các bước Deploy

### 1. Tải source code
Upload hoặc git clone toàn bộ source code của dự án lên server.

### 2. Kiểm tra cấu hình
Đảm bảo file `docker-compose.yml` ở thư mục gốc có nội dung tương tự như sau (đặc biệt chú ý phần `volumes` để lưu database):

```yaml
version: '3.8'
services:
  backend:
    volumes:
      - ./data:/app/data # <-- Dòng này QUAN TRỌNG: giúp Database không bị mất khi restart
  # ... (các cấu hình khác)
```

### 3. Chạy hệ thống
Tại thư mục gốc của dự án (nơi có file `docker-compose.yml`), mở Terminal và chạy lệnh:

```bash
docker-compose up -d --build
```
*Giải thích:*
- `up`: Khởi động các container.
- `-d`: Chạy ngầm (Detached mode) để bạn có thể tắt terminal mà web vẫn chạy.
- `--build`: Build lại image mới nhất từ code (nên dùng khi mới cập nhật code).

### 4. Kiểm tra kết quả
- **Web App**: Truy cập vào IP của server (hoặc `http://localhost` nếu chạy dưới máy local).
- **Dữ liệu**: Web sẽ tự động gọi vào Backend để lấy dữ liệu.
- **Database**: File database sẽ được tạo ra tại thư mục `./data/danalog.db` trên máy chủ.
  - **Lưu ý:** Tuyệt đối KHÔNG xóa thư mục `data/` này nếu không muốn mất dữ liệu.

---

## Quản lý vận hành (Dành cho IT/DevOps)

### Xem log (để debug lỗi)
```bash
docker-compose logs -f
```

### Tắt hệ thống
```bash
docker-compose down
```

### Cập nhật code mới
1. Pull code mới về.
2. Chạy lại lệnh deploy:
   ```bash
   docker-compose up -d --build
   ```
   *(Dữ liệu trong thư mục `./data` sẽ VẪN ĐƯỢC GIỮ NGUYÊN)*.
