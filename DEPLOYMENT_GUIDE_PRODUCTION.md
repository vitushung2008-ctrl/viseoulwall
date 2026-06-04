# Seoul Guestbook Wall — Production Deployment Guide

## 概述

本指南說明如何將首爾匿名留言牆專案部署到生產環境（GitHub + Vercel + Supabase）。

**已完成的遷移：**
- ✅ 移除 Manus OAuth 依賴
- ✅ 實作簡單管理員密碼系統
- ✅ 轉換資料庫從 MySQL 至 PostgreSQL
- ✅ 生成 PostgreSQL 遷移 SQL
- ✅ 建立 Vercel 部署配置

---

## 第 1 步：準備 Supabase 資料庫

### 1.1 建立 Supabase 專案

1. 訪問 [supabase.com](https://supabase.com)
2. 登入或註冊帳號
3. 建立新專案
4. 選擇 PostgreSQL 資料庫
5. 等待資料庫初始化（通常需要 1-2 分鐘）

### 1.2 取得資料庫連線字串

1. 進入 Supabase 專案設定
2. 點擊「Database」
3. 複製「Connection string」（選擇 URI 格式）
4. 格式應為：`postgresql://[user]:[password]@[host]:[port]/[database]`

### 1.3 執行遷移 SQL

1. 在 Supabase 中開啟 SQL Editor
2. 建立新查詢
3. 複製以下 SQL 並執行：

```sql
CREATE TABLE "guestbook_entries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "guestbook_entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"role" varchar(500) NOT NULL,
	"dream" text NOT NULL,
	"location" varchar(500) NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"isHidden" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
```

---

## 第 2 步：準備 GitHub 倉庫

### 2.1 初始化 Git 倉庫

```bash
cd seoul_guestbook_wall_production
git init
git add .
git commit -m "Initial commit: Seoul Guestbook Wall production version"
```

### 2.2 建立 GitHub 倉庫

1. 訪問 [github.com/new](https://github.com/new)
2. 建立新倉庫（例如：`seoul-guestbook-wall`）
3. 不要初始化 README、.gitignore 或 LICENSE
4. 複製倉庫 URL

### 2.3 推送到 GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/seoul-guestbook-wall.git
git branch -M main
git push -u origin main
```

---

## 第 3 步：部署到 Vercel

### 3.1 連結 Vercel 與 GitHub

1. 訪問 [vercel.com](https://vercel.com)
2. 登入或使用 GitHub 帳號註冊
3. 點擊「Import Project」
4. 選擇「Import Git Repository」
5. 授權 Vercel 存取 GitHub
6. 選擇 `seoul-guestbook-wall` 倉庫

### 3.2 配置環境變數

在 Vercel 部署設定中新增以下環境變數：

| 變數名 | 值 | 說明 |
|--------|-----|------|
| `DATABASE_URL` | `postgresql://...` | Supabase 連線字串 |
| `JWT_SECRET` | 隨機字串 | 生成：`openssl rand -base64 32` |
| `ADMIN_PASSWORD` | 自訂密碼 | 管理員登入密碼 |
| `NODE_ENV` | `production` | Node.js 環境 |
| `VITE_APP_TITLE` | `vis.art.projects \| chapter Seoul` | 網站標題 |
| `VITE_LOGO_URL` | `https://...` | Logo 圖片 URL（可選） |

### 3.3 部署

1. 點擊「Deploy」
2. 等待部署完成（通常需要 3-5 分鐘）
3. 部署成功後，Vercel 會提供一個 `.vercel.app` 域名

### 3.4 自訂域名（可選）

1. 在 Vercel 專案設定中進入「Domains」
2. 新增自訂域名
3. 按照指示更新 DNS 記錄

---

## 第 4 步：驗證部署

### 4.1 測試公開功能

1. 訪問部署的 URL
2. 填寫表單並提交留言
3. 驗證留言是否出現在留言牆上
4. 測試按讚功能
5. 測試排序篩選功能

### 4.2 測試管理員功能

1. 訪問 `/admin/dashboard`
2. 輸入管理員密碼登入
3. 驗證統計數據是否正確
4. 測試隱藏/刪除留言功能

---

## 環境變數詳解

### DATABASE_URL

PostgreSQL 連線字串，格式：
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

**Supabase 範例：**
```
postgresql://postgres:YOUR_PASSWORD@db.supabase.co:5432/postgres
```

### JWT_SECRET

用於簽署管理員會話 token 的密鑰。必須是強隨機字串。

**生成方法：**
```bash
openssl rand -base64 32
```

### ADMIN_PASSWORD

管理員登入密碼。用於存取 `/admin/dashboard`。

**建議：** 使用強密碼（至少 12 個字元，包含大小寫字母、數字、特殊字元）

### NODE_ENV

應設為 `production` 以啟用生產最佳化。

### VITE_APP_TITLE

瀏覽器分頁標題和網站名稱。

### VITE_LOGO_URL

標題欄 logo 圖片的 URL。支援任何公開可訪問的圖片 URL。

---

## API 端點

### 公開 API

#### POST /api/trpc/guestbook.submit

提交新留言。

**請求體：**
```json
{
  "role": "학생",
  "dream": "세계 여행",
  "location": "서울 강남역"
}
```

**回應：**
```json
{
  "result": {
    "data": {
      "success": true
    }
  }
}
```

#### GET /api/trpc/guestbook.list

取得所有公開留言（按時間倒序）。

**回應：**
```json
{
  "result": {
    "data": [
      {
        "id": 1,
        "role": "학생",
        "dream": "세계 여행",
        "location": "서울 강남역",
        "likes": 5,
        "isHidden": 0,
        "createdAt": "2026-06-04T12:00:00Z"
      }
    ]
  }
}
```

#### POST /api/trpc/guestbook.toggleLike

為留言按讚。

**請求體：**
```json
{
  "entryId": 1
}
```

### 管理員 API

#### POST /api/admin/login

管理員登入。

**請求體：**
```json
{
  "password": "your-admin-password"
}
```

**回應：**
```json
{
  "success": true
}
```

設定 session cookie 後，可訪問管理員功能。

#### POST /api/admin/logout

管理員登出。

#### GET /api/trpc/guestbook.stats

取得統計數據（需要管理員權限）。

**回應：**
```json
{
  "result": {
    "data": {
      "totalCount": 42,
      "totalLikes": 156,
      "dailyStats": {
        "2026-06-04": 5,
        "2026-06-03": 8
      },
      "topLocations": [
        { "location": "서울 강남역", "count": 12 }
      ],
      "topRoles": [
        { "role": "학생", "count": 28 }
      ]
    }
  }
}
```

#### POST /api/trpc/guestbook.toggleHidden

隱藏/顯示留言（需要管理員權限）。

**請求體：**
```json
{
  "entryId": 1
}
```

#### POST /api/trpc/guestbook.delete

刪除留言（需要管理員權限）。

**請求體：**
```json
{
  "entryId": 1
}
```

---

## 故障排除

### 資料庫連線失敗

**症狀：** 「Database not available」錯誤

**解決方案：**
1. 驗證 `DATABASE_URL` 是否正確
2. 檢查 Supabase 資料庫是否運行
3. 確認防火牆設定允許 Vercel IP 存取

### 管理員登入失敗

**症狀：** 「Invalid password」錯誤

**解決方案：**
1. 驗證 `ADMIN_PASSWORD` 環境變數是否設定
2. 確認密碼是否正確
3. 檢查 `JWT_SECRET` 是否設定

### 留言未出現

**症狀：** 提交留言後未在留言牆上顯示

**解決方案：**
1. 檢查瀏覽器控制台是否有錯誤
2. 驗證資料庫連線是否正常
3. 檢查 `guestbook_entries` 表是否存在
4. 查看 Vercel 日誌以獲取更多詳情

### Vercel 部署失敗

**症狀：** 部署過程中出現錯誤

**解決方案：**
1. 檢查 Vercel 部署日誌
2. 確認所有環境變數已設定
3. 驗證 `package.json` 中的 `build` 命令是否正確
4. 確認 Node.js 版本相容性

---

## 本地開發

### 安裝依賴

```bash
pnpm install
```

### 設定本地環境變數

建立 `.env.local` 檔案：

```bash
cp .env.example .env.local
```

編輯 `.env.local` 並填入本地資料庫連線字串：

```
DATABASE_URL=postgresql://user:password@localhost:5432/guestbook
JWT_SECRET=your-local-secret
ADMIN_PASSWORD=admin123
```

### 執行遷移

```bash
DATABASE_URL=postgresql://... pnpm drizzle-kit push
```

### 啟動開發伺服器

```bash
pnpm dev
```

訪問 `http://localhost:3000`

### 執行測試

```bash
pnpm test
```

---

## 生產最佳實踐

1. **定期備份資料庫** — 使用 Supabase 自動備份功能
2. **監控應用日誌** — 定期檢查 Vercel 日誌以發現問題
3. **更新依賴** — 定期執行 `pnpm update` 以獲取安全更新
4. **更改管理員密碼** — 定期更改 `ADMIN_PASSWORD`
5. **啟用 HTTPS** — Vercel 自動啟用 HTTPS
6. **設定自訂域名** — 提高專業度和可信度

---

## 支援與反饋

如遇到問題，請：

1. 檢查本指南的故障排除部分
2. 查看 Vercel 和 Supabase 文件
3. 檢查應用日誌以獲取錯誤詳情

---

**最後更新：** 2026-06-04
**版本：** 1.0.0 (Production)
