# CLAUDE.md — Temple Stuart Accounting

## Project Overview

Temple Stuart is a full-stack personal finance and accounting platform built with Next.js (App Router). It replaces fragmented tools (Mint, QuickBooks, TraderSync, TurboTax) with a single unified system for founder-traders, active options traders, digital nomads, and freelancers.

Core principles: accuracy over convenience, transparency over magic, user control over AI assumptions, double-entry accounting or nothing.

## Tech Stack

- **Framework**: Next.js 15.5.9 (App Router) with React 18.3.1
- **Language**: TypeScript 5 (strict mode)
- **Database**: PostgreSQL via Prisma ORM 6.15
- **Styling**: Tailwind CSS 3.4
- **Auth**: NextAuth 4.24 (Google + GitHub OAuth) + custom cookie-based auth
- **Deployment**: Vercel with cron support
- **Key integrations**: Plaid (banking), Stripe (payments), OpenAI + xAI/Grok (AI), Amadeus (travel), Leaflet (maps)

## Quick Commands

```bash
npm run dev          # Start local dev server (next dev)
npm run build        # Generate Prisma client + production build
npm run start        # Start production server
npm run lint         # Run ESLint (next lint)
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma db push   # Push schema changes to database
npx prisma studio    # Open Prisma Studio GUI
npx tsx <script.ts>  # Run TypeScript scripts directly
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/                # ~48 API route groups (REST endpoints)
│   ├── dashboard/          # Main dashboard views
│   ├── transactions/       # Transaction management
│   ├── trading/            # Trading/investment views
│   ├── trips/              # Trip planning views
│   ├── journal-entries/    # Accounting journal entries
│   ├── ledger/             # General ledger
│   ├── chart-of-accounts/  # COA management
│   ├── hub/                # Central navigation hub
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   └── globals.css         # Global styles (Tailwind)
├── components/             # React components
│   ├── AppFrame.tsx        # Main app shell/frame
│   ├── Header.tsx          # Navigation header
│   ├── Footer.tsx          # Footer
│   ├── LoginBox.tsx        # Auth UI
│   ├── Providers.tsx       # Context providers wrapper
│   ├── UpgradePrompt.tsx   # Tier upgrade CTA
│   ├── dashboard/          # Dashboard-specific components
│   ├── trips/              # Trip-specific components
│   ├── shopping/           # Shopping components
│   ├── sections/           # Landing page sections
│   └── ui/                 # Shared UI primitives
├── lib/                    # Service layer and utilities
│   ├── prisma.ts           # Prisma client singleton
│   ├── auth.ts             # NextAuth configuration
│   ├── auth-helpers.ts     # Auth utility functions
│   ├── tiers.ts            # Tier definitions & feature gating
│   ├── stripe.ts           # Stripe client setup
│   ├── plaid.ts            # Plaid client setup
│   ├── openai.ts           # OpenAI client setup
│   ├── grok.ts / grokAgent.ts  # xAI/Grok integration
│   ├── amadeus.ts          # Amadeus travel API client
│   ├── auto-categorization-service.ts  # Transaction auto-categorization
│   ├── journal-entry-service.ts        # Journal entry business logic
│   ├── investment-ledger-service.ts    # Investment ledger logic
│   ├── position-tracker-service.ts     # Trading position tracking
│   ├── robinhood-parser.ts             # Robinhood history parser
│   └── placesSearch.ts / placesCache.ts  # Google Places integration
└── middleware.ts           # Auth middleware (protects app routes)

prisma/
├── schema.prisma           # Database schema (~50+ models)
├── seed-coa.ts             # Chart of accounts seeder
├── seed-coa-complete.ts    # Complete COA seeder
├── seed-trading-coa.ts     # Trading-specific COA seeder
├── seed-destinations*.ts   # Activity destination data seeders
├── assign-coa-to-user.ts   # User-COA assignment utility
├── check-user.ts           # User lookup utility
└── update-user.ts          # User update utility
```

## Architecture Patterns

### Authentication

Dual auth system — cookie-based (`userEmail` httpOnly cookie) and NextAuth (OAuth). Middleware at `src/middleware.ts` protects all routes except explicitly public paths (`/`, `/pricing`, `/terms`, `/privacy`, `/api/auth/*`, `/api/stripe/webhook`).

Standard pattern in API routes to get the current user:
```typescript
const cookieStore = await cookies();
const userEmail = cookieStore.get('userEmail')?.value;
const user = await prisma.users.findFirst({
  where: { email: { equals: userEmail, mode: 'insensitive' } }
});
```

### Database (Prisma)

- Singleton Prisma client in `src/lib/prisma.ts` — reused globally in dev to prevent connection exhaustion
- Query logging enabled in development mode
- Model names use `lowercase_with_underscores` (Prisma convention)
- Monetary values stored as `BigInt` (cents) in accounting tables, `Float` in Plaid-synced tables
- All IDs are strings (UUIDs)

### API Routes

All in `src/app/api/`. Follow Next.js App Router conventions with named exports:
```typescript
export async function GET(request: NextRequest) { ... }
export async function POST(request: NextRequest) { ... }
```

Return `NextResponse.json()` with appropriate HTTP status codes. Error responses use structured JSON: `{ error: "message" }`.

### Service Layer

Business logic lives in `src/lib/` as service classes (e.g., `AutoCategorizationService`, `JournalEntryService`, `InvestmentLedgerService`, `PositionTrackerService`). These are instantiated as singletons and imported by API routes.

### Tier System

Three tiers defined in `src/lib/tiers.ts`: `free`, `pro`, `pro_plus`. Feature gating uses `canAccess(tier, feature)` and `getTierConfig(tier)`. Key feature gates:
- **free**: Manual entry only, basic trip planning
- **pro**: Plaid sync, trading analytics, up to 10 linked accounts
- **pro+**: All Pro features + AI insights, trip AI, up to 25 accounts

### Component Patterns

- `AppFrame.tsx` wraps authenticated pages with header/sidebar
- `Providers.tsx` wraps the app with context providers (NextAuth SessionProvider, etc.)
- Components use Tailwind CSS utility classes for styling
- Icons from `lucide-react`

## Key Domain Models

### Financial Core
- `accounts` — Bank/investment accounts (Plaid-synced or manual)
- `transactions` — Bank transactions with categorization
- `chart_of_accounts` — Double-entry COA with code, type, balance_type
- `journal_transactions` / `ledger_entries` — Double-entry journal and ledger
- `bank_reconciliations` — Reconciliation workflow
- `merchant_coa_mappings` / `category_coa_defaults` — Auto-mapping rules

### Investment/Trading
- `investment_transactions` — Investment activity from Plaid/Robinhood
- `trading_positions` — IRS-compliant position tracking
- `stock_lots` — Cost basis lot tracking
- `corporate_actions` — Stock splits, dividends, etc.
- `securities` — Security master data

### Trips
- `trips` / `trip_participants` / `trip_expenses` / `expense_splits` — Trip planning with expense splitting
- `trip_itinerary` / `trip_destinations` — Itinerary management
- Activity destinations: `surf_spots`, `golf_courses`, `cycling_destinations`, `race_destinations`, etc.

## Naming Conventions

- **Variables/functions**: `camelCase`
- **Classes/types/components**: `PascalCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Database models**: `lowercase_with_underscores`
- **Files**: `kebab-case` for routes, `PascalCase.tsx` for components, `camelCase.ts` for libs
- **Path alias**: `@/*` maps to `./src/*`

## Configuration Notes

- **ESLint**: Uses `next/core-web-vitals` + `next/typescript` presets. ESLint is ignored during builds (`eslintIgnoreDuringBuilds: true` in next.config.ts).
- **TypeScript**: Strict mode, target ES2017, bundler module resolution.
- **Peer deps**: `.npmrc` has `legacy-peer-deps=true` — do not remove.
- **Webpack externals**: `pdf-parse`, `@napi-rs/canvas`, `pdfjs-dist` are externalized on the server side.
- **CSP headers**: Configured in `next.config.ts` — allow Plaid CDN for link widget.
- **Cron**: Vercel cron runs `/api/cron/auto-categorize` daily at 2 AM UTC.

## Environment Variables

Required (set in `.env` or Vercel dashboard):
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` / `NEXTAUTH_SECRET` — Auth secrets
- `NEXTAUTH_URL` — App URL for NextAuth
- `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` — Plaid API
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` — Stripe
- `OPENAI_API_KEY` — OpenAI API
- `XAI_API_KEY` — xAI/Grok API
- `GOOGLE_MAPS_API_KEY` — Google Places
- `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET` — Amadeus travel API
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth
- `GITHUB_ID`, `GITHUB_SECRET` — GitHub OAuth

## Testing

No formal test framework is configured. Manual/ad-hoc testing via `npx tsx` scripts. When adding tests, consider Vitest or Jest with the Next.js integration.

## Common Tasks

### Adding a new API route
1. Create directory under `src/app/api/<route-name>/`
2. Add `route.ts` with exported `GET`/`POST`/`PUT`/`DELETE` handlers
3. Authenticate using the cookie pattern shown above
4. Return `NextResponse.json()` with proper status codes

### Adding a new page
1. Create directory under `src/app/<page-name>/`
2. Add `page.tsx` (and optionally `layout.tsx`)
3. Wrap content in `<AppFrame>` for authenticated pages
4. Add route to middleware `PUBLIC_PATHS` if it should be public

### Modifying the database schema
1. Edit `prisma/schema.prisma`
2. Run `npx prisma db push` to sync to database
3. Run `npx prisma generate` to regenerate the client
4. The `postinstall` script auto-runs `prisma generate` on `npm install`

### Running seed scripts
```bash
npx tsx prisma/seed-coa.ts
npx tsx prisma/seed-trading-coa.ts
npx tsx prisma/seed-destinations.ts
```

## License

AGPL v3 with commercial licensing option.
