# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## VPS signal engine (Binance aggTrade -> Supabase signals)

This repo includes a lightweight long-running worker:

- Script: `scripts/vps_signal_engine.mjs`
- Command: `npm run engine:signals`
- Purpose: listen 24x7 to Binance `aggTrade`, evaluate `signals` entry/exit, update `status/exit_type/exit_price/exit_time/pnl_*`.

### 1) Local dry run

```sh
npm i
set SUPABASE_URL=https://<your-project>.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
npm run engine:signals
```

### 2) VPS deployment with pm2

```sh
npm i -g pm2
npm i
export SUPABASE_URL=https://<your-project>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
pm2 start npm --name signal-engine -- run engine:signals
pm2 save
pm2 startup
```

Or use ecosystem config (recommended):

```sh
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Optional env:

- `ENGINE_HEARTBEAT_MS` (default `30000`)
- `ENGINE_RESYNC_MS` (default `300000`)
- `ENGINE_RECONNECT_BASE_MS` (default `2000`)
- `ENGINE_RECONNECT_MAX_MS` (default `30000`)

## NOWPayments 支付集成（套餐页）

本项目已新增一套基于 Supabase 的支付闭环：

- 前端创建订单：调用 Edge Function `nowpayments-create-payment`
- 支付回调处理：Edge Function `nowpayments-webhook`
- 数据落库：`payment_orders`、`payment_webhook_events`
- 会员发放：数据库函数 `apply_membership_from_paid_order`

### 1) 数据库迁移

已新增迁移文件：

- `supabase/migrations/20260308180000_add_nowpayments_payment_flow.sql`

该迁移会创建：

- 表 `payment_orders`
- 表 `payment_webhook_events`
- 函数 `create_payment_order`
- 函数 `apply_membership_from_paid_order`
- 函数 `get_payment_orders`

### 2) Supabase Secrets

在 Supabase 项目中配置以下 Secrets（不要在前端暴露）：

- `NOWPAYMENTS_API_KEY`
- `NOWPAYMENTS_IPN_SECRET`
- `NOWPAYMENTS_IPN_CALLBACK_URL`（指向 `nowpayments-webhook`）
- `NOWPAYMENTS_SUCCESS_URL`（可选）
- `NOWPAYMENTS_CANCEL_URL`（可选）
- `NOWPAYMENTS_ALLOWED_PAY_CURRENCIES`（可选，逗号分隔，默认 `USDT,BTC,ETH,SOL,BNB,XRP,DOGE`）

### 3) 部署 Edge Functions

```sh
supabase functions deploy nowpayments-create-payment
supabase functions deploy nowpayments-webhook
```

### 4) NOWPayments 后台设置

- 将 IPN/Webhook 地址设置为 `NOWPAYMENTS_IPN_CALLBACK_URL`
- IPN Secret 与 `NOWPAYMENTS_IPN_SECRET` 保持一致

### 5) 前端效果

- 套餐页支持选择支付币种并创建真实支付订单
- 弹窗展示支付链接（若返回）或链上支付地址/金额
- 购买记录页改为读取真实订单（不再使用 mock 数据）

### 6) 状态流

NOWPayments 回调状态会归一化为：

- `pending`
- `confirming`
- `paid`
- `failed`
- `expired`
- `refunded`
- `partially_paid`

当状态进入 `paid` 时，会自动执行会员发放逻辑（规则与兑换码一致：续费顺延、禁止降级、lifetime 永久）。

