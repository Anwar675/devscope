# DevScope AI

DevScope AI là nền tảng traffic testing và load testing dành cho backend team. Ứng dụng giúp tạo kịch bản tải bằng k6, theo dõi tiến độ realtime, lưu lịch sử chạy test, tổng hợp metrics, phát hiện bottleneck và tạo khuyến nghị tối ưu hiệu năng bằng AI.

## Tính năng chính

- **Dashboard tổng quan**: hiển thị latency, error rate, throughput, trạng thái hệ thống, các scenario gần đây và khuyến nghị ưu tiên.
- **Load testing**: tạo test theo URL, HTTP method, số virtual users, thời lượng và ramp-up; hỗ trợ dừng test, xem log và xem kết quả sau khi chạy.
- **Realtime progress**: backend phát tiến độ load test qua WebSocket tại `/loadtest/events`.
- **Metrics analytics**: phân tích dữ liệu theo khoảng thời gian `1h`, `6h`, `24h`, `3d`, `7d`, `30d`; gồm latency, throughput, error rate, resource/database series và endpoint breakdown.
- **AI analysis**: phân tích các run đã hoàn tất để tìm lỗi nghiêm trọng, spike latency, tail latency, throughput bottleneck và root cause giả định.
- **Architecture recommendation**: dùng OpenAI Responses API khi có key, hoặc fallback rule-based khi chưa cấu hình key.
- **Authentication**: Better Auth hỗ trợ email/password, GitHub OAuth và Google OAuth.
- **PostgreSQL storage**: Drizzle ORM quản lý user/session/account và lịch sử `load_test_run`.

## Công nghệ sử dụng

- **Frontend**: Next.js `16.2.7`, React `19.2.4`, TypeScript, Tailwind CSS 4, shadcn/radix-nova, lucide-react, Recharts.
- **Backend**: Express 5, Node HTTP server, WebSocket `ws`, k6 runner qua child process.
- **Database**: PostgreSQL, Drizzle ORM, Drizzle Kit.
- **Auth**: Better Auth với Drizzle adapter.
- **AI**: OpenAI Responses API qua biến `OPENAI_API_KEY` hoặc `OPENAI_KEY`.
- **Runtime tools**: `tsx` cho backend dev server, Dockerfile riêng cho backend có cài k6.

## Cấu trúc thư mục

```txt
.
├── backend/
│   ├── app.ts                         # Express app, CORS, health check, module routes
│   ├── server.ts                      # HTTP server + WebSocket load-test progress
│   ├── db/
│   │   ├── schema.ts                  # Drizzle schema: auth tables + load_test_run
│   │   └── migrations/                # Migration files
│   └── modules/
│       ├── overview/                  # Dashboard overview service/controller/route
│       ├── metrics/                   # Metrics aggregation service/controller/route
│       ├── aianalysis/                # Derived AI analysis report
│       └── loadtest/                  # k6 runner, history, log, realtime events
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root metadata/layout
│   │   ├── api/auth/[...all]/route.ts # Better Auth Next handler
│   │   ├── sign-in/                   # Sign in page
│   │   ├── sign-up/                   # Sign up page
│   │   └── (home)/
│   │       ├── layout.tsx             # Sidebar layout for authenticated app pages
│   │       ├── page.tsx               # Landing/home page
│   │       ├── overview/              # Overview route
│   │       ├── metrics/               # Metrics route
│   │       ├── aianalysis/            # AI analysis route
│   │       ├── loadtest/              # Load test route
│   │       └── api/                   # Next Route Handlers/proxy APIs
│   ├── components/ui/                 # Shared UI primitives
│   ├── lib/                           # Auth client/server and utilities
│   └── modules/                       # Feature UI modules
├── drizzle.config.ts                  # Drizzle Kit config
├── Dockerfile                         # Backend image with k6 installed
├── next.config.ts                     # Next.js config
└── .env.example                       # Environment variable template
```

## Luồng hoạt động

1. Người dùng đăng nhập qua Better Auth.
2. Frontend gọi các Route Handlers trong `src/app/(home)/api`.
3. Với load test, Next proxy request sang Express backend qua `NEXT_PUBLIC_API_URL`.
4. Backend tạo record trong PostgreSQL, sinh script k6 tạm thời và chạy `k6 run`.
5. Trong lúc test chạy, backend cập nhật DB và phát progress qua WebSocket.
6. Khi test kết thúc, backend lưu summary/log/realtime series, tạo AI insight nếu có OpenAI key.
7. Các trang Overview, Metrics và AI Analysis tổng hợp dữ liệu từ `load_test_run`.

## Yêu cầu môi trường

- Node.js 22 hoặc phiên bản tương thích với dependencies hiện tại.
- npm.
- PostgreSQL database, ví dụ Neon, Supabase, Railway Postgres hoặc local Postgres.
- k6 trong `PATH` nếu chạy backend trực tiếp trên máy local.
- OpenAI API key nếu muốn dùng AI analysis/recommendation thật.

> Dockerfile backend đã cài sẵn k6. Nếu chạy không dùng Docker, cần cài k6 riêng trên máy.

## Cài đặt local

1. Cài dependencies:

```bash
npm install
```

2. Tạo file `.env` từ mẫu:

```bash
cp .env.example .env
```

3. Điền các biến bắt buộc trong `.env`:

```env
DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/DB?sslmode=require"
BETTER_AUTH_SECRET="your-random-secret"
BETTER_AUTH_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_LOADTEST_WS_URL="http://localhost:3001"
```

4. Đồng bộ schema database:

```bash
npm run db:push
```

5. Chạy backend ở terminal thứ nhất:

```bash
npm run server:dev
```

Backend mặc định chạy tại `http://localhost:3001`.

6. Chạy Next.js frontend ở terminal thứ hai:

```bash
npm run dev
```

Frontend mặc định chạy tại `http://localhost:3000`.

## Scripts

| Lệnh | Mô tả |
| --- | --- |
| `npm run dev` | Chạy Next.js development server |
| `npm run build` | Build production cho Next.js |
| `npm run start` | Chạy Next.js production server sau khi build |
| `npm run server` | Chạy Express backend bằng `tsx` |
| `npm run server:dev` | Chạy Express backend ở watch mode |
| `npm run lint` | Chạy ESLint |
| `npm run db:push` | Push Drizzle schema lên database |
| `npm run db:pull` | Pull database schema |
| `npm run db:generate` | Generate migration |
| `npm run db:reset` | Reset migration state qua Drizzle Kit |
| `npm run db:studio` | Mở Drizzle Studio |

## Biến môi trường

| Biến | Bắt buộc | Mục đích |
| --- | --- | --- |
| `DATABASE_URL` | Có | PostgreSQL connection string cho Drizzle và Better Auth |
| `BETTER_AUTH_SECRET` | Có | Secret ký session/cookie |
| `BETTER_AUTH_URL` | Có | Public URL của frontend Better Auth |
| `PORT` | Không | Port backend trên production platform |
| `BACKEND_PORT` | Không | Port fallback cho backend local |
| `FRONTEND_URL` | Có | Origin frontend được backend CORS cho phép |
| `NEXT_PUBLIC_API_URL` | Có | URL backend để Next API proxy gọi sang Express |
| `NEXT_PUBLIC_LOADTEST_WS_URL` | Có | URL backend cho WebSocket load-test progress |
| `OPENAI_API_KEY` | Không | OpenAI key cho AI insight và architecture recommendation |
| `OPENAI_KEY` | Không | Alias cũ, dùng khi `OPENAI_API_KEY` không có |
| `OPENAI_MODEL` | Không | Model OpenAI, mặc định `gpt-4.1-mini` |
| `GITHUB_CLIENT_ID` | Không | GitHub OAuth client id |
| `GITHUB_CLIENT_SECRET` | Không | GitHub OAuth client secret |
| `GOOGLE_CLIENT_ID` | Không | Google OAuth client id |
| `GOOGLE_CLIENT_SECRET` | Không | Google OAuth client secret |
| `LOADTEST_AGENT_TOKEN` | Không | Bearer token cho endpoint nhận infrastructure metrics |

## API chính

### Next.js Route Handlers

- `GET /api/overview?range=3d`
- `GET /api/metrics?range=24h`
- `GET /api/aianalysis`
- `GET /api/loadtest`
- `POST /api/loadtest`
- `GET /api/loadtest/:id`
- `DELETE /api/loadtest/:id`
- `POST /api/loadtest/:id/stop`
- `GET /api/loadtest/:id/log`
- `GET /api/loadtest/health`
- `POST /api/loadtest/:id/infrastructure`
- `POST /api/loadtest/architecture-recommendation`
- `GET|POST /api/auth/*`

### Express backend

- `GET /health`
- `GET /overview`
- `GET /metrics`
- `GET /aianalysis`
- `GET /loadtest`
- `POST /loadtest`
- `GET /loadtest/:id`
- `DELETE /loadtest/:id`
- `POST /loadtest/:id/stop`
- `GET /loadtest/:id/log`
- `GET /loadtest/health`
- WebSocket upgrade: `/loadtest/events?id=<runId>`

## Load test và k6

Backend tạo script k6 tạm trong thư mục temp của hệ điều hành, chạy bằng:

```bash
k6 run --log-format raw <generated-script>
```

Các giới hạn chính hiện tại:

- HTTP methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- Tối đa `100000` users.
- Tối đa `3600` giây cho duration.
- Realtime series được giới hạn số điểm để tránh lưu quá nhiều dữ liệu.
- Log có TTL logic trong record và được dùng để xem lại lỗi/chẩn đoán sau khi test.

## Infrastructure metrics

Endpoint `POST /api/loadtest/:id/infrastructure` nhận payload CPU, RAM, pod và container metrics để bổ sung bằng chứng cho khuyến nghị kiến trúc.

Request có thể xác thực bằng một trong hai cách:

- Session cookie của người dùng đang đăng nhập.
- Bearer token trùng với `LOADTEST_AGENT_TOKEN`.

Ví dụ payload tối giản:

```json
{
  "infrastructure": {
    "cpu": { "status": "sampled", "percent": 72 },
    "ram": { "status": "sampled", "percent": 64, "rssMb": 512 },
    "pods": { "status": "not_collected" },
    "containers": { "status": "not_collected" },
    "collectedAt": "2026-06-24T00:00:00.000Z"
  }
}
```

## Docker backend

Dockerfile hiện tại build image cho backend và cài k6 sẵn:

```bash
docker build -t devscope-backend .
docker run --env-file .env -p 3001:3001 devscope-backend
```

Image này chạy:

```bash
npm run server
```

Frontend Next.js nên được deploy riêng bằng flow Next/Vercel hoặc một container riêng phù hợp.

## Database

Schema chính nằm ở `backend/db/schema.ts`, gồm:

- `user`, `session`, `account`, `verification`: bảng Better Auth.
- `load_test_run`: lịch sử load test, trạng thái, progress, metrics, realtime series, summary, log và error message.

Migration nằm trong `backend/db/migrations`.

## Ghi chú phát triển

- Project dùng Next.js App Router và route group `(home)`, nên `(home)` chỉ là nhóm tổ chức, không xuất hiện trong URL.
- Các Route Handlers dùng Web `Request`/`Response` API; dynamic route params là promise theo convention của Next.js hiện tại.
- `src/modules/*/ui` chứa UI theo từng feature, còn `backend/modules/*` chứa service/controller/route tương ứng.
- Khi thay đổi schema, chạy `npm run db:generate` hoặc `npm run db:push` tùy workflow.
- Không commit `.env` thật vì chứa database URL, auth secret và API keys.
