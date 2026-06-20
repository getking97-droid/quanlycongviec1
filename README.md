# ⏰ Phần Mềm Nhắc Việc (Smart Reminder Web App)

Một ứng dụng nhắc việc thông minh, tối ưu hiệu năng và được thiết kế theo phong cách giao diện hiện đại (glassmorphism, micro-animations, đa chủ đề). Ứng dụng hoạt động trực tiếp trên trình duyệt, lưu trữ dữ liệu cục bộ (`localStorage`) và tự động kích hoạt thông báo kèm âm thanh chất lượng cao bằng Web Audio API.

![Giao diện dự án](https://raw.githubusercontent.com/getking97-droid/phan-mem-nhac-viec/master/preview.png) *(Hình ảnh minh họa giao diện)*

---

## ✨ Tính Năng Nổi Bật

1. **Bảng Điều Khiển Tổng Quan (Dashboard)**
   - Thống kê tỷ lệ hoàn thành công việc trực quan bằng vòng tiến trình động.
   - Hiển thị danh sách nhắc nhở khẩn cấp, nhắc nhở trong ngày và tiến độ từng danh mục.
   - Biểu mẫu thêm nhanh công việc.

2. **Quản Lý Công Việc Chi Tiết (Tasks Manager)**
   - Bộ lọc nâng cao theo: trạng thái, mức độ ưu tiên (Cao, Trung bình, Thấp), và danh mục (Công việc, Cá nhân, Học tập...).
   - Tìm kiếm công việc theo từ khóa theo thời gian thực.
   - Thao tác nhanh: đánh dấu hoàn thành, sửa đổi chi tiết, xóa nhắc việc.

3. **Lịch Biểu Trực Quan (Interactive Calendar)**
   - Lịch tháng hiển thị tất cả đầu việc trực tiếp trên ngày đến hạn kèm nhãn màu sắc ưu tiên.
   - Click nhanh vào ngày trên lịch để khởi tạo tác vụ mới cho ngày đó.

4. **Bảng Trạng Thái Kanban (Kanban Board)**
   - Quản lý luồng công việc theo ba cột: *Chưa thực hiện*, *Đang thực hiện*, và *Đã hoàn thành*.
   - Hỗ trợ thao tác kéo thả (Drag & Drop) mượt mà trên desktop.
   - Có nút chuyển đổi nhanh trạng thái hỗ trợ tối đa cho thiết bị di động.

5. **Hệ Thống Nhắc Nhở Chủ Động (Alarms & Notifications)**
   - Tự động kiểm tra công việc đến hạn liên tục ở chế độ nền.
   - **Âm thanh tổng hợp (Audio Synthesizer):** Sử dụng Web Audio API để phát âm thanh báo thức (Soft Bell, Digital Beep, Siren) mà không cần tải file âm thanh ngoài.
   - **Thông báo trình duyệt (Browser Push Notification):** Đưa thông báo đẩy hiển thị trên màn hình hệ điều hành ngay cả khi tab ứng dụng đang ẩn.
   - Hỗ trợ **Hoàn thành nhanh** hoặc **Hoãn giờ báo (Snooze)** 5 phút trực tiếp trên màn hình báo động.
   - Hỗ trợ **Công việc lặp lại (Recurrence):** Hàng ngày, hàng tuần, hàng tháng.

6. **Tùy Biến Đa Giao Diện (Theme Settings)**
   - 3 chủ đề thiết kế cao cấp: **Tối Huyền Bí (Dark)**, **Sáng Sang Trọng (Light)**, và **Cyberpunk Neon**.
   - Phát thử chuông báo thức trực tiếp trong cài đặt.

---

## 🛠️ Công Nghệ Sử Dụng

- **HTML5:** Cấu trúc tài liệu ngữ nghĩa (Semantic HTML).
- **Vanilla CSS:** Biến CSS (Custom Variables), Flexbox, Grid, hiệu ứng làm mờ kính (`backdrop-filter`), hiệu ứng chuyển động mượt mà.
- **JavaScript (ES6):** Xử lý trạng thái, định vị thời gian thực, lập lịch kiểm tra nền, lập trình giao diện động.
- **Web Audio API:** Tạo dao động âm thanh (Oscillator) trực tiếp để phát chuông cảnh báo.
- **Web Notification API:** Tích hợp cơ chế thông báo hệ thống của trình duyệt.

---

## 🚀 Hướng Dẫn Chạy Dự Án

### Cách 1: Chạy trực tiếp (Không cần cài đặt)
Mở tệp `index.html` trực tiếp trên bất kỳ trình duyệt nào hỗ trợ HTML5 (Chrome, Edge, Firefox, Safari...).

### Cách 2: Chạy qua Local HTTP Server (Khuyên dùng)
Để các tính năng nâng cao như Web Notifications hoạt động ổn định nhất, nên chạy ứng dụng qua một local web server:

1. **Sử dụng Python (sẵn có trên Windows/macOS):**
   ```bash
   python -m http.server 8080
   ```
   Sau đó truy cập địa chỉ `http://localhost:8080` trên trình duyệt.

2. **Sử dụng Node.js (npx serve):**
   ```bash
   npx serve
   ```

---

## 📂 Cấu Trúc Thư Mục Dự Án

```text
├── index.html          # File giao diện chính
├── css/
│   └── style.css       # File định kiểu giao diện chính & các chủ đề
└── js/
    ├── app.js          # Core xử lý logic ứng dụng và trạng thái
    ├── calendar.js     # Logic vẽ lịch biểu và sự kiện lịch
    ├── kanban.js       # Logic kéo thả và hiển thị bảng Kanban
    └── notifications.js# Bộ tổng hợp âm thanh Web Audio và thông báo nền
```

---
*Chúc bạn luôn làm việc khoa học và không bao giờ bỏ lỡ các cuộc hẹn quan trọng!*
