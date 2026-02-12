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

