# Cài Gettimebot

## Cần có

- Git
- Node.js 24 (hoặc 22.22.2+; không dùng 23, 25)
- pnpm 9 (`corepack enable`)
- Docker đang chạy

## Cài

```bash
git clone https://github.com/thekp3/gettimebot.git
cd gettimebot
pnpm setup:local
pnpm install
pnpm sandbox:build
pnpm dev
```

`pnpm setup:local` tạo `.env` với secret ngẫu nhiên cho máy của bạn. Không commit hay chia sẻ file này.

Mở http://127.0.0.1:5173, tạo tài khoản và kết nối model.

## Chạy lại

```bash
pnpm dev
```
