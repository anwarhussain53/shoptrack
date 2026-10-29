# ShopTrack

ShopTrack is a web app for small auto repair shops. It keeps customers, vehicles, repair orders and invoices in one place, and can text customers when their car's status changes.

> Status: in active development.

## Features

- **Accounts** – email/password sign up, login, logout and password reset (Supabase Auth)
- **Dashboard** – overview of active repair orders, customers and invoices for your shop
- **Customers** – add, search and manage customer records
- **Vehicles** – track each customer's vehicles
- **Repair orders** – create orders, move them through statuses and keep a status history
- **SMS updates** – send customers status messages through Twilio (`/api/sms`)
- **Invoices** – build invoices with line items linked to a repair order
- **Settings** – shop information and account management

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend & data | Supabase (Postgres + Auth) via `@supabase/ssr` |
| Messaging | Twilio SMS |
| Tooling | ESLint |

## Data model

Main Supabase tables: `shops`, `customers`, `vehicles`, `repair_orders`, `status_history`, `messages`, `invoices`, `invoice_items`.

## Project structure

```
app/
  api/sms/route.ts   # Twilio SMS endpoint
  dashboard/         # shop overview
  customers/         # customer management
  vehicles/          # vehicle records
  orders/            # repair orders + status history
  invoices/          # invoices and line items
  settings/          # shop + account settings
  login/             # auth pages and server actions
lib/supabase.ts      # Supabase client
```

## Getting started

1. Clone and install:

   ```bash
   git clone https://github.com/anwarhussain53/shoptrack.git
   cd shoptrack
   npm install
   ```

2. Create `.env.local` in the project root:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | Lint with ESLint |

## Roadmap

- [ ] Search and filters on orders and customers
- [ ] Tests for core flows
- [ ] Responsive layout polish
- [ ] Deploy to Vercel and add a live demo link

## Author

**Anwaar Hussain Mohammed** – [GitHub](https://github.com/anwarhussain53) · [LinkedIn](https://www.linkedin.com/in/anwaar-hussain-mohammed-892579204)
