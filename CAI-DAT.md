# Cài Gettimebot trên máy của bạn

Gettimebot chạy hoàn toàn trên máy bạn: web ở `http://127.0.0.1:5173`, dữ liệu (tài khoản, bot, lịch sử chat) nằm trong Postgres chạy bằng Docker trên máy bạn. Mỗi người cài một bản riêng, không dùng chung tài khoản với ai.

## Cần có trước

- **Git** và quyền truy cập repo `thekp3/gettimebot` (repo private, nhờ admin org thêm bạn vào).
- **Node.js 24** (hoặc 22.22.2 trở lên trong dòng 22). Không dùng Node 23 hay 25.
- **pnpm 9**: chạy `corepack enable` một lần. Nếu báo thiếu quyền thì dùng `npm install -g pnpm@9`.
- **Docker Desktop**, mở sẵn và đang chạy.

## Cài lần đầu

```bash
git clone https://github.com/thekp3/gettimebot.git
cd gettimebot
pnpm setup:local
pnpm install
pnpm sandbox:build
pnpm dev
```

- `pnpm setup:local` tạo file `.env` với mật khẩu và khoá bí mật ngẫu nhiên cho riêng máy bạn. Nếu đã có `.env` thì lệnh không đụng vào.
- `pnpm install` có thể in lỗi `gyp ERR!` của `ssh2` trên Windows. Đó là phần tuỳ chọn, bỏ qua được.
- `pnpm sandbox:build` dựng image máy tính cho bot (khoảng 2,3 GB). Chỉ cần chạy lần đầu, lâu vài phút.
- `pnpm dev` tự bật Postgres trong Docker, chạy migration rồi mở toàn bộ dịch vụ. Chờ dòng `Open http://127.0.0.1:5173`.

Mở **http://127.0.0.1:5173**, tạo tài khoản, rồi kết nối model:

- Nhập API key của nhà cung cấp, hoặc đăng nhập ChatGPT Plus/Pro, GitHub Copilot, SuperGrok trong phần onboarding.
- Hoặc điền `OPENROUTER_API_KEY=...` vào `.env` rồi chạy lại `pnpm dev`.

Bot chưa trả lời được cho tới khi có model.

## Những lần sau

Mở Docker Desktop, vào thư mục `gettimebot`, chạy `pnpm dev`. Tắt terminal là tắt app.

Cập nhật bản mới:

```bash
git pull
pnpm install
pnpm dev
```

## Dùng như app trên Windows

Trong Chrome hoặc Edge, mở `http://127.0.0.1:5173`, chọn **⋮ → Cast, save and share → Install page as app**. App vẫn cần `pnpm dev` đang chạy.

## Gặp lỗi

- **Port 5173 bị chiếm**: `pnpm dev` tự chuyển sang dãy port trống kế tiếp và in ra địa chỉ mới.
- **Lỗi kết nối Docker**: mở Docker Desktop và chờ nó báo running rồi chạy lại.
- **Icon app vẫn là hình cũ**: gỡ app (⋮ → Uninstall) rồi cài lại. Chrome giữ icon từ lúc cài.

## Lưu ý

- **Không commit hay gửi file `.env` cho ai.** File này chứa khoá mã hoá API key của bạn và đã nằm trong `.gitignore`.
- Remote `upstream` (nếu bạn thêm) là repo gốc Rakazo, chỉ dùng để kéo cập nhật. Commit thì đẩy lên `origin` (`thekp3/gettimebot`).
