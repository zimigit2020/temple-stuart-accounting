# CLAUDE.md - AI Assistant Guide for Temple Stuart Accounting

**Last Updated**: 2025-11-18
**Project Version**: 0.1.0
**Target Audience**: AI coding assistants (Claude, GPT, etc.)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Directory Structure](#directory-structure)
4. [Core Concepts & Patterns](#core-concepts--patterns)
5. [Database Schema](#database-schema)
6. [API Routes](#api-routes)
7. [Development Workflows](#development-workflows)
8. [Common Tasks](#common-tasks)
9. [Critical Areas & Gotchas](#critical-areas--gotchas)
10. [Code Style & Conventions](#code-style--conventions)
11. [Testing & Debugging](#testing--debugging)

---

## Project Overview

### What This Is

Temple Stuart Accounting is a **Plaid-powered double-entry accounting system** that replaces multiple financial applications (Mint, QuickBooks, Tradervue, TurboTax) with a unified platform. Built for founders who trade and need IRS-compliant books.

**Key Features**:
- Entity-aware accounting (Personal, Business, Trading)
- Hidden double-entry bookkeeping (journal entries + ledger)
- Real-time Plaid sync
- Options trading tracking with IRS-compliant position management
- AI-powered spending insights via GPT-4
- 12-step accounting pipeline UI

**Business Model**: Free for personal use, commercial license required for business use (BUSL-1.1 license).

### Current Status

**Production-Ready Components**:
- ✅ Plaid integration (Wells Fargo, Robinhood, Relay, Tasty Trade tested)
- ✅ Complete double-entry accounting engine
- ✅ 12-step accounting pipeline
- ✅ Robinhood trading parser (42.2% automatic transaction mapping)
- ✅ IRS-compliant position tracking (FIFO)
- ✅ AI spending insights
- ✅ Financial statements (P&L, Balance Sheet, Cash Flow)

**High-Priority TODOs**:
- Auto-categorization pipeline improvements
- NextAuth / JWT authentication enhancement
- Prisma connection pooling optimization
- Complete reconciliation workflows

---

## Architecture & Tech Stack

### Core Technologies

**Frontend**:
- Next.js 15.5.2 (App Router)
- React 18.3.1
- TypeScript 5
- Tailwind CSS 3.4.18
- Lucide React (icons)

**Backend**:
- Next.js API Routes (serverless)
- Prisma 6.15.0 (ORM)
- PostgreSQL (Azure)

**External APIs**:
- Plaid (production environment) - Financial data
- OpenAI GPT-4o - AI insights

**Hosting**: Vercel with cron jobs

### Architectural Patterns

1. **Entity Separation Pattern**: Every record tagged with entity type (P-XXXX, B-XXXX, T-XXXX)
2. **Service Layer Pattern**: Complex logic in dedicated service classes
3. **Transaction State Machine**: pending_review → ready_to_commit → approved
4. **Double-Entry Engine**: All financial changes create balanced journal entries
5. **Multi-Phase Matching**: Robinhood parser matches trades in 2 phases (opens, then closes)

---

## Directory Structure

```
temple-stuart-accounting/
├── prisma/
│   ├── schema.prisma              # PostgreSQL schema (15 tables)
│   ├── migrations/                # Migration history
│   └── seed-*.ts                  # COA setup scripts
├── public/                        # Static assets
├── src/
│   ├── app/                       # Next.js 15 App Router
│   │   ├── api/                   # 56 API endpoints
│   │   │   ├── auth/             # Login, signup, logout
│   │   │   ├── plaid/            # Plaid integration
│   │   │   ├── transactions/     # Transaction management
│   │   │   ├── investment-transactions/  # Trading transactions
│   │   │   ├── robinhood/        # Robinhood parser
│   │   │   ├── trading-positions/  # Position tracking
│   │   │   ├── trading-journal/  # Trading analytics
│   │   │   ├── ai/               # GPT-4 insights
│   │   │   ├── cron/             # Scheduled jobs
│   │   │   └── [others]/         # Statements, COA, journal, ledger, etc.
│   │   ├── dashboard/            # Main app (12-step pipeline)
│   │   ├── login/                # Auth page
│   │   ├── transactions/         # Transaction browser
│   │   ├── [other pages]/        # Accounts, COA, journal, ledger, etc.
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Landing page
│   │   └── globals.css           # Global styles + CSS variables
│   ├── components/
│   │   ├── dashboard/            # 20+ dashboard tab components
│   │   ├── sections/             # Landing page sections
│   │   ├── Header.tsx            # Site navigation
│   │   └── Footer.tsx            # Footer
│   └── lib/                      # Utilities & services
│       ├── prisma.ts             # Prisma singleton
│       ├── auth.ts               # JWT auth
│       ├── plaid.ts              # Plaid client
│       ├── journal-entry-service.ts  # Accounting engine
│       ├── position-tracker-service.ts  # Trading positions
│       ├── robinhood-parser.ts   # Trade parser (v11.0)
│       ├── auto-categorization-service.ts  # ML categorization
│       └── [others]/             # Investment ledger, debug tools
├── Configuration files (root)
│   ├── package.json              # Dependencies
│   ├── next.config.ts            # CSP headers, externals
│   ├── tsconfig.json             # Path aliases (@/*)
│   ├── tailwind.config.ts        # Tailwind config
│   ├── vercel.json               # Cron job (daily 2 AM)
│   └── eslint.config.mjs         # Linting rules
└── Utility scripts (root)
    ├── fix-*.sh/js               # Database repair scripts
    ├── query-*.ts                # Debug queries
    └── verify-*.ts/js            # Data integrity checks
```

---

## Core Concepts & Patterns

### 1. Entity Separation

**Every financial record is tagged with an entity type**:
- **Personal (P-XXXX)**: Personal expenses, income
- **Business (B-XXXX)**: Business revenue, expenses
- **Trading (T-XXXX)**: Investment gains, losses, positions

**Why**: Enables clean tax reporting, prevents cross-contamination, supports Trader Tax Status (TTS) accounting.

**Implementation**:
- Chart of Accounts: `code` field (e.g., "P-5010", "B-4000", "T-1200")
- Transactions: Assigned `coa_code` determines entity
- Users: `personal_account_code`, `business_account_code`, `trading_account_code`

### 2. Double-Entry Accounting Engine

**All financial changes create balanced journal entries** (debits = credits):

```typescript
// Example: $50 coffee purchase on personal credit card
{
  debits: [
    { account: "P-5010" (Food & Dining), amount: 5000 }  // $50.00 in cents
  ],
  credits: [
    { account: "P-2200" (Credit Card), amount: 5000 }
  ]
}
```

**Flow**:
1. Transaction imported from Plaid
2. User assigns COA code (or auto-categorized)
3. `journal-entry-service.ts` validates balance (DR = CR)
4. Creates `journal_transactions` record
5. Creates 2+ `ledger_entries` (debit + credit)
6. Updates `chart_of_accounts` balances atomically
7. Uses Prisma transactions for atomicity

**Files**:
- `src/lib/journal-entry-service.ts` - Core accounting logic
- `src/api/transactions/commit-to-ledger/route.ts` - Commit endpoint

### 3. Transaction State Machine

```
pending_review (imported from Plaid)
    ↓
assigned COA code (user or auto-categorization)
    ↓
ready_to_commit
    ↓
commit-to-ledger API call
    ↓
approved (has journal_entry_id)
```

**Fields**:
- `predicted_coa_code`: Auto-categorization suggestion
- `confidence_score`: 0.0-1.0 confidence level
- `coa_code`: Final assigned code (user confirmed)
- `manually_overridden`: User changed auto-categorization
- `journal_entry_id`: Set when committed to ledger

### 4. Investment Position Tracking (IRS-Compliant)

**FIFO position management** for options trading:

**Opening a Trade**:
```typescript
// User sells-to-open a put spread
position_tracker_service.commitOptionsTrade({
  transaction_type: "sell_to_open",
  option_type: "put_spread",
  quantity: 1,
  premium: 75.00  // Received $75 credit
})

// Creates journal entry:
DR T-1010 (Cash)              $75.00
CR T-1200 (Short Put Spread)  $75.00

// Creates trading_positions record (status: open)
```

**Closing a Trade**:
```typescript
// User buys-to-close the put spread for $25
position_tracker_service.commitOptionsTrade({
  transaction_type: "buy_to_close",
  option_type: "put_spread",
  quantity: 1,
  premium: 25.00  // Paid $25 debit
})

// Matches to open position (FIFO)
// Realized P&L: $75 - $25 = $50 profit

// Creates journal entry:
DR T-1200 (Short Put Spread)  $75.00  // Close position
CR T-1010 (Cash)              $25.00  // Pay to close
CR T-4100 (Trading Gains)     $50.00  // Profit

// Updates trading_positions record (status: closed, realized_pl: 5000)
```

**Files**:
- `src/lib/position-tracker-service.ts` - Position logic
- `src/lib/robinhood-parser.ts` - Trade matching
- `src/api/investment-transactions/commit-to-ledger/route.ts` - Commit endpoint

### 5. Robinhood Parser (Multi-Phase Matching)

**Parses Robinhood history text** to match trades to Plaid transactions:

**Phase 1 - Assign Trade Numbers to Opens**:
```
Opens processed chronologically:
  2024-01-15: Sell-to-open put spread → Trade #1
  2024-01-20: Sell-to-open call spread → Trade #2
```

**Phase 2 - Match Closes to Opens**:
```
Closes matched to earliest open of same type:
  2024-01-25: Buy-to-close put spread → Matches Trade #1
  2024-02-01: Buy-to-close call spread → Matches Trade #2
```

**Current Performance**: 42.2% automatic transaction mapping

**Files**:
- `src/lib/robinhood-parser.ts` (v11.0) - Phase 1+2 parser
- `src/api/robinhood/append-history/route.ts` - Upload endpoint

### 6. Auto-Categorization with Merchant Learning

**ML-based transaction categorization**:

1. **Merchant Mapping Lookup**: Check `merchant_coa_mappings` table
   - If match found with `usage_count >= 3`, use that COA code
   - Set `confidence_score` based on historical accuracy

2. **Category Fallback**: If no merchant match, use `category_coa_defaults`
   - Plaid category (e.g., "FOOD_AND_DRINK_RESTAURANTS") → COA code (e.g., "P-5010")

3. **Review Queue**: If `confidence_score < 0.7`, add to review queue

4. **Learning**: When user assigns COA:
   - Create/update `merchant_coa_mappings` entry
   - Increment `usage_count`
   - Recalculate `confidence_score`
   - Future transactions auto-categorize

**Files**:
- `src/lib/auto-categorization-service.ts` - Categorization logic
- `src/api/transactions/auto-categorize/route.ts` - Endpoint
- `src/api/cron/auto-categorize/route.ts` - Daily job (2 AM)

### 7. Service Layer Pattern

**Complex operations encapsulated in service classes**:

| Service | Responsibility |
|---------|---------------|
| `JournalEntryService` | Create balanced journal entries, update ledger |
| `PositionTrackerService` | FIFO position tracking, P&L calculation |
| `AutoCategorizationService` | ML categorization, merchant learning |
| `RobinhoodParser` | Parse history text, match trades |
| `InvestmentLedgerService` | Investment accounting workflows |

**Pattern**: Import service, call methods with validated data, handle errors.

### 8. API Route Conventions

**Standard Pattern**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate
    const user = await verifyToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Extract query params
    const { searchParams } = new URL(req.url);
    const entity = searchParams.get('entity');

    // 3. Query database
    const data = await prisma.transactions.findMany({
      where: { user_id: user.userId, entity_type: entity },
      orderBy: { date: 'desc' }
    });

    // 4. Transform data (BigInt → Number for JSON)
    const formatted = data.map(t => ({
      ...t,
      amount: Number(t.amount)
    }));

    // 5. Return response
    return NextResponse.json({ transactions: formatted });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Key Points**:
- Always authenticate with `verifyToken(req)`
- Use Prisma for all database access
- Convert BigInt to Number for JSON serialization
- Return NextResponse.json() with proper status codes
- Handle errors with try/catch

---

## Database Schema

### Core Tables (15 total)

#### User & Authentication
```prisma
model users {
  id                     String    @id @default(uuid())
  email                  String    @unique
  password_hash          String
  personal_account_code  String    // e.g., "P-1010"
  business_account_code  String    // e.g., "B-1010"
  trading_account_code   String    // e.g., "T-1010"
  created_at             DateTime  @default(now())
}
```

#### Plaid Integration
```prisma
model plaid_items {
  id           String    @id @default(uuid())
  user_id      String
  access_token String    // Encrypted Plaid access token
  item_id      String    @unique
  institution  String
  created_at   DateTime  @default(now())
}

model accounts {
  id            String    @id @default(uuid())
  plaid_item_id String
  account_id    String    @unique  // Plaid account ID
  name          String               // e.g., "Wells Fargo Checking"
  type          String               // e.g., "depository"
  subtype       String?              // e.g., "checking"
  entity_type   String               // "Personal", "Business", "Trading"
  current_balance BigInt?            // In cents
}

model transactions {
  id                   String    @id @default(uuid())
  user_id              String
  account_id           String
  transaction_id       String    @unique  // Plaid transaction ID
  date                 DateTime
  amount               BigInt             // In cents (negative = expense)
  merchant_name        String?
  description          String
  category             String[]           // Plaid categories (array)
  pending              Boolean   @default(false)

  // Categorization
  predicted_coa_code   String?            // Auto-categorization suggestion
  confidence_score     Float?             // 0.0-1.0
  coa_code             String?            // Final assigned code
  manually_overridden  Boolean   @default(false)

  // Ledger commitment
  journal_entry_id     String?   @unique  // Set when committed
  committed_at         DateTime?

  created_at           DateTime  @default(now())

  @@index([user_id, date])
  @@index([merchant_name])
}
```

#### Investments & Trading
```prisma
model securities {
  id              String    @id @default(uuid())
  symbol          String    @unique
  name            String
  security_type   String             // "equity", "option", "derivative"
  is_cash_equiv   Boolean   @default(false)
  created_at      DateTime  @default(now())
}

model investment_transactions {
  id                  String    @id @default(uuid())
  user_id             String
  account_id          String
  transaction_id      String    @unique  // Plaid investment transaction ID
  date                DateTime
  security_id         String?
  type                String             // "buy", "sell", "option", etc.
  subtype             String?
  quantity            Float?
  price               Float?
  fees                BigInt?            // In cents
  amount              BigInt             // In cents

  // Trading metadata
  trade_number        String?            // Assigned by parser
  open_or_close       String?            // "open", "close"
  strategy            String?            // "put_spread", "call_spread", etc.
  strike_prices       String?            // JSON array
  expiration_date     DateTime?

  // Robinhood reconciliation
  rh_quantity         Float?
  rh_price            Float?
  rh_principal        Float?
  rh_matched          Boolean   @default(false)

  // Ledger commitment
  coa_code            String?
  journal_entry_id    String?   @unique
  committed_at        DateTime?

  created_at          DateTime  @default(now())

  @@index([user_id, date])
  @@index([trade_number])
}

model trading_positions {
  id                  String    @id @default(uuid())
  user_id             String
  trade_number        String
  security_id         String?
  position_type       String             // "short_put_spread", etc.
  quantity            Int
  avg_open_price      BigInt             // In cents
  current_price       BigInt?            // Mark-to-market
  unrealized_pl       BigInt?            // Unrealized P&L
  realized_pl         BigInt?            // Realized P&L (when closed)
  status              String             // "open", "closed", "assigned"
  opened_at           DateTime
  closed_at           DateTime?

  // FIFO tracking
  remaining_quantity  Int
  version             Int       @default(1)  // Optimistic locking

  created_at          DateTime  @default(now())
  updated_at          DateTime  @updatedAt

  @@index([user_id, status])
  @@index([trade_number])
}
```

#### Double-Entry Accounting
```prisma
model chart_of_accounts {
  id              String    @id @default(uuid())
  code            String    @unique  // e.g., "P-1010", "B-4000", "T-1200"
  name            String               // e.g., "Cash - Checking"
  account_type    String               // "asset", "liability", "equity", "revenue", "expense"
  entity_type     String               // "Personal", "Business", "Trading"
  parent_code     String?              // For subcategories
  is_active       Boolean   @default(true)

  // Balance tracking
  balance         BigInt    @default(0)  // Current balance in cents
  version         Int       @default(1)  // Optimistic locking

  // IRS mapping
  irs_form        String?              // e.g., "Schedule C", "Schedule D"
  irs_line        String?              // e.g., "Line 4"

  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  @@index([entity_type, account_type])
}

model journal_transactions {
  id                  String    @id @default(uuid())
  user_id             String
  entry_date          DateTime
  description         String
  reference_type      String?            // "transaction", "investment", "adjustment"
  reference_id        String?            // Link to source transaction

  // Metadata
  entity_type         String
  is_adjustment       Boolean   @default(false)
  is_closing_entry    Boolean   @default(false)

  created_at          DateTime  @default(now())

  @@index([user_id, entry_date])
}

model ledger_entries {
  id                   String    @id @default(uuid())
  journal_entry_id     String
  account_code         String             // COA code
  debit                BigInt?            // In cents
  credit               BigInt?            // In cents
  description          String?

  created_at           DateTime  @default(now())

  @@index([journal_entry_id])
  @@index([account_code])
}

model closing_periods {
  id                   String    @id @default(uuid())
  user_id              String
  entity_type          String
  period_start         DateTime
  period_end           DateTime
  retained_earnings    BigInt             // Net income transferred
  closed_at            DateTime
  closed_by            String

  @@index([user_id, entity_type, period_end])
}
```

#### Categorization & Mapping
```prisma
model merchant_coa_mappings {
  id                   String    @id @default(uuid())
  user_id              String
  merchant_name        String
  coa_code             String
  confidence_score     Float              // 0.0-1.0
  usage_count          Int       @default(1)
  last_used            DateTime  @default(now())

  @@unique([user_id, merchant_name])
  @@index([merchant_name])
}

model category_coa_defaults {
  id                   String    @id @default(uuid())
  plaid_category       String    @unique  // e.g., "FOOD_AND_DRINK_RESTAURANTS"
  default_coa_code     String
  entity_type          String
  confidence_score     Float     @default(0.5)
}
```

#### Business Development
```prisma
model prospects {
  id          String    @id @default(uuid())
  name        String
  email       String
  company     String?
  status      String    // "new", "contacted", "qualified", "converted"
  notes       String?
  created_at  DateTime  @default(now())
}

model RFP {
  id                String    @id @default(uuid())
  company_name      String
  contact_email     String
  project_type      String
  budget_range      String?
  timeline          String?
  requirements      String
  created_at        DateTime  @default(now())
}
```

### Key Schema Patterns

1. **BigInt for Money**: All amounts stored in cents to avoid floating-point errors
2. **UUID Primary Keys**: For audit trail and distributed systems
3. **Optimistic Locking**: `version` field on `chart_of_accounts` and `trading_positions`
4. **Comprehensive Indexing**: `user_id`, `date`, `transaction_id`, `trade_number`, etc.
5. **Soft Deletes**: Use `is_active` flags instead of deleting
6. **Timestamps**: `created_at` (and `updated_at` where needed) on all tables

---

## API Routes

### Authentication (`/api/auth/`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/login` | POST | User login → JWT token |
| `/signup` | POST | Create account |
| `/logout` | POST | Clear auth cookie |
| `/me` | GET | Get current user |
| `/users` | GET | List all users (admin) |
| `/dev-login` | POST | Development bypass login |

**Auth Flow**:
1. User submits email + password → `/api/auth/login`
2. Verify `bcryptjs.compare(password, users.password_hash)`
3. Generate JWT: `jwt.sign({ userId, email }, SECRET, { expiresIn: '7d' })`
4. Set HttpOnly cookie: `auth-token`
5. Return user data

**Files**: `src/lib/auth.ts`, `src/app/api/auth/*/route.ts`

### Plaid Integration (`/api/plaid/`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/link-token` | POST | Generate Plaid Link token |
| `/exchange-token` | POST | Exchange public token → access token |
| `/sync` | POST | Sync transactions from Plaid |
| `/items` | GET | List connected institutions |
| `/test-categories` | GET | Test category enrichment |

**Sync Flow**:
1. User clicks "Sync" → `/api/plaid/sync`
2. For each `plaid_items` record:
   - Call `plaidClient.transactionsSync({ access_token })`
   - Upsert transactions to `transactions` table
   - Store `cursor` for incremental sync
3. Return count of added/modified/removed

**Files**: `src/lib/plaid.ts`, `src/app/api/plaid/*/route.ts`

### Transactions (`/api/transactions/`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Fetch all transactions |
| `/assign-coa` | POST | Assign COA code to transaction(s) |
| `/commit-to-ledger` | POST | Create journal entries |
| `/auto-categorize` | POST | ML categorization |
| `/review-queue` | GET | Pending transactions |
| `/sync`, `/sync-full`, `/sync-complete` | POST | Various sync workflows |
| `/resync-with-rich-data` | POST | Re-pull Plaid enriched data |
| `/fix-categories` | POST | Batch category corrections |

**Commit Flow** (`/commit-to-ledger`):
```typescript
// 1. Fetch transactions to commit
const txns = await prisma.transactions.findMany({
  where: { coa_code: { not: null }, journal_entry_id: null }
});

// 2. For each transaction, create journal entry
for (const txn of txns) {
  const journalEntry = await journalEntryService.createJournalEntry({
    user_id: txn.user_id,
    date: txn.date,
    description: txn.description,
    entity_type: getEntityType(txn.coa_code),
    entries: [
      { account_code: txn.coa_code, debit: txn.amount > 0 ? txn.amount : null },
      { account_code: getCashAccount(user), credit: txn.amount > 0 ? txn.amount : null }
    ]
  });

  // 3. Link transaction to journal entry
  await prisma.transactions.update({
    where: { id: txn.id },
    data: { journal_entry_id: journalEntry.id, committed_at: new Date() }
  });
}
```

**Files**: `src/app/api/transactions/*/route.ts`, `src/lib/journal-entry-service.ts`

### Investment Transactions (`/api/investment-transactions/`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Fetch investment transactions |
| `/assign-coa` | POST | Assign COA code to trades |
| `/commit-to-ledger` | POST | Commit trades to ledger + position tracker |
| `/uncommit` | POST | Reverse ledger commitment |
| `/upload-pdfs` | POST | Parse PDF brokerage statements |

**Commit Flow** (Options Trading):
```typescript
// Fetch uncommitted investment transactions
const trades = await prisma.investment_transactions.findMany({
  where: { coa_code: { not: null }, journal_entry_id: null }
});

for (const trade of trades) {
  // Use position tracker service (handles FIFO, P&L calculation)
  await positionTrackerService.commitOptionsTrade({
    user_id: trade.user_id,
    trade_id: trade.id,
    transaction_type: trade.type,  // "sell_to_open", "buy_to_close", etc.
    option_type: trade.strategy,    // "put_spread", "call_spread", etc.
    quantity: trade.quantity,
    premium: Number(trade.amount) / 100,  // Convert cents to dollars
    strike_prices: JSON.parse(trade.strike_prices),
    expiration_date: trade.expiration_date,
    trade_date: trade.date,
    trade_number: trade.trade_number
  });
}
```

**Files**: `src/app/api/investment-transactions/*/route.ts`, `src/lib/position-tracker-service.ts`

### Robinhood Integration (`/api/robinhood/`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/get-history` | GET | Retrieve stored history text |
| `/append-history` | POST | Add history text, run parser |

**Parser Flow**:
```typescript
// User pastes Robinhood history text
const history = await req.text();

// Run parser
const { mappings, stats } = robinhoodParser.parseHistory(history);

// Update investment_transactions with trade numbers, open/close, etc.
for (const mapping of mappings) {
  await prisma.investment_transactions.updateMany({
    where: { transaction_id: mapping.plaid_id },
    data: {
      trade_number: mapping.trade_number,
      open_or_close: mapping.open_or_close,
      strategy: mapping.strategy,
      rh_matched: true
    }
  });
}

return { message: `Matched ${stats.matched}/${stats.total} transactions` };
```

**Files**: `src/app/api/robinhood/*/route.ts`, `src/lib/robinhood-parser.ts`

### Financial Analysis (`/api/`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/statements` | POST | Generate P&L, Balance Sheet, Cash Flow |
| `/statements/analysis` | POST | 3-statement analysis (ratios, metrics) |
| `/metrics` | POST | KPIs, projections, burn rate |

**Statement Generation**:
```typescript
// Query ledger grouped by account type
const ledgerData = await prisma.ledger_entries.findMany({
  where: {
    journal_entry: { user_id: userId, entry_date: { gte: startDate, lte: endDate } }
  },
  include: { journal_entry: true }
});

// Group by COA account
const byAccount = groupBy(ledgerData, 'account_code');

// Calculate P&L
const revenue = sumCredits(filterByType(byAccount, 'revenue'));
const expenses = sumDebits(filterByType(byAccount, 'expense'));
const netIncome = revenue - expenses;

// Calculate Balance Sheet
const assets = sumDebits(filterByType(byAccount, 'asset'));
const liabilities = sumCredits(filterByType(byAccount, 'liability'));
const equity = sumCredits(filterByType(byAccount, 'equity')) + netIncome;

// Return formatted statements
return { income_statement, balance_sheet, cash_flow_statement };
```

**Files**: `src/app/api/statements/route.ts`, `src/app/api/statements/analysis/route.ts`

### AI Features (`/api/ai/`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/spending-insights` | POST | GPT-4 spending analysis |

**AI Insights Flow**:
```typescript
// 1. Fetch user's spending data
const transactions = await prisma.transactions.findMany({
  where: { user_id, date: { gte: last30Days } }
});

// 2. Aggregate by category
const byCategory = groupBy(transactions, 'coa_code');
const spending = Object.entries(byCategory).map(([code, txns]) => ({
  category: code,
  amount: sum(txns, 'amount'),
  count: txns.length
}));

// 3. Call OpenAI GPT-4
const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'You are a financial advisor...' },
    { role: 'user', content: `Analyze this spending data: ${JSON.stringify(spending)}` }
  ]
});

// 4. Return insights
return { insights: completion.choices[0].message.content };
```

**Files**: `src/app/api/ai/spending-insights/route.ts`

### Automation (`/api/cron/`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auto-categorize` | GET | Daily categorization job (runs 2 AM) |

**Cron Configuration** (`vercel.json`):
```json
{
  "crons": [{
    "path": "/api/cron/auto-categorize",
    "schedule": "0 2 * * *"
  }]
}
```

---

## Development Workflows

### Local Development Setup

```bash
# 1. Clone repo
git clone https://github.com/your-username/temple-stuart-accounting.git
cd temple-stuart-accounting

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local

# Add to .env.local:
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
PLAID_CLIENT_ID="your_plaid_client_id"
PLAID_SECRET="your_plaid_secret"
PLAID_ENV="sandbox"  # or "development", "production"
OPENAI_API_KEY="sk-..."
NEXTAUTH_SECRET="generate_random_secret"

# 4. Run Prisma migrations
npx prisma migrate dev

# 5. (Optional) Seed Chart of Accounts
npx tsx prisma/seed-chart-of-accounts.ts

# 6. Start dev server
npm run dev
# Visit http://localhost:3000
```

### Database Migrations

```bash
# Create new migration
npx prisma migrate dev --name add_new_field

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Generate Prisma client (after schema changes)
npx prisma generate

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Common Development Commands

```bash
# Development
npm run dev          # Start Next.js dev server (localhost:3000)

# Build
npm run build        # Build for production
npm run start        # Start production server

# Linting
npm run lint         # Run ESLint

# Prisma
npx prisma studio    # Open database GUI
npx prisma format    # Format schema file
npx prisma validate  # Validate schema

# Vercel deployment
vercel               # Deploy to preview
vercel --prod        # Deploy to production
```

### Git Workflow

```bash
# Feature branch
git checkout -b feature/add-new-report
# Make changes
git add .
git commit -m "feat: Add monthly spending report"
git push origin feature/add-new-report

# Create PR on GitHub
# After approval, merge to main
```

---

## Common Tasks

### Task 1: Add a New COA Account

**Example**: Add "P-5050" for "Subscriptions"

```typescript
// Option 1: Use Prisma Studio
// 1. Run `npx prisma studio`
// 2. Open chart_of_accounts table
// 3. Add new record:
{
  code: "P-5050",
  name: "Subscriptions",
  account_type: "expense",
  entity_type: "Personal",
  is_active: true
}

// Option 2: Use API
// POST /api/chart-of-accounts
{
  "code": "P-5050",
  "name": "Subscriptions",
  "account_type": "expense",
  "entity_type": "Personal"
}

// Option 3: Database script
// Create file: add-subscription-account.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

await prisma.chart_of_accounts.create({
  data: {
    code: "P-5050",
    name: "Subscriptions",
    account_type: "expense",
    entity_type: "Personal",
    balance: 0
  }
});

// Run: npx tsx add-subscription-account.ts
```

### Task 2: Add Auto-Categorization Rule

**Example**: Auto-categorize "Netflix" → "P-5050"

```typescript
// POST /api/merchant-mappings
{
  "user_id": "user-uuid",
  "merchant_name": "Netflix",
  "coa_code": "P-5050",
  "confidence_score": 0.95
}

// Or update existing transaction to learn mapping:
// 1. User assigns COA code to transaction
// POST /api/transactions/assign-coa
{
  "transaction_ids": ["txn-uuid"],
  "coa_code": "P-5050"
}

// 2. System auto-creates merchant_coa_mappings entry
// 3. Future Netflix transactions auto-categorize to P-5050
```

### Task 3: Create Manual Journal Entry

**Example**: Record $500 depreciation

```typescript
// POST /api/journal-entries
{
  "user_id": "user-uuid",
  "entry_date": "2024-01-31",
  "description": "Monthly depreciation - Equipment",
  "entity_type": "Business",
  "is_adjustment": true,
  "entries": [
    {
      "account_code": "B-6200",  // Depreciation Expense
      "debit": 50000  // $500.00 in cents
    },
    {
      "account_code": "B-1400",  // Accumulated Depreciation
      "credit": 50000
    }
  ]
}

// System validates:
// - Debits = Credits (50000 = 50000) ✓
// - Both accounts exist ✓
// - Both accounts are Business entity ✓

// Creates:
// - 1 journal_transactions record
// - 2 ledger_entries records
// - Updates chart_of_accounts balances (B-6200 +500, B-1400 -500)
```

### Task 4: Add New Dashboard Tab

**Example**: Add "Budgets" tab

```typescript
// 1. Create component: src/components/dashboard/BudgetsTab.tsx
'use client';
import { useState, useEffect } from 'react';

export default function BudgetsTab() {
  const [budgets, setBudgets] = useState([]);

  useEffect(() => {
    fetch('/api/budgets')
      .then(res => res.json())
      .then(data => setBudgets(data.budgets));
  }, []);

  return (
    <div>
      <h2>Budgets</h2>
      {/* Budget UI */}
    </div>
  );
}

// 2. Add API route: src/app/api/budgets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const user = await verifyToken(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch budgets (add budgets table to schema first)
  const budgets = await prisma.budgets.findMany({
    where: { user_id: user.userId }
  });

  return NextResponse.json({ budgets });
}

// 3. Update dashboard: src/app/dashboard/page.tsx
import BudgetsTab from '@/components/dashboard/BudgetsTab';

// Add to tabs array:
const tabs = [
  // ... existing tabs
  { id: 'budgets', label: 'Budgets', component: BudgetsTab }
];
```

### Task 5: Generate Financial Statements

**Example**: Get Q1 2024 P&L for Business entity

```typescript
// POST /api/statements
{
  "entity_type": "Business",
  "start_date": "2024-01-01",
  "end_date": "2024-03-31",
  "statement_types": ["income_statement"]
}

// Response:
{
  "income_statement": {
    "period": "Q1 2024",
    "entity": "Business",
    "revenue": [
      { "account": "B-4000 Revenue", "amount": 125000 }
    ],
    "total_revenue": 125000,
    "expenses": [
      { "account": "B-5000 Cost of Goods Sold", "amount": 50000 },
      { "account": "B-6000 Operating Expenses", "amount": 30000 }
    ],
    "total_expenses": 80000,
    "net_income": 45000
  }
}
```

### Task 6: Debug Transaction Not Appearing

**Common causes**:

1. **Not synced from Plaid**:
   ```bash
   # Check Plaid sync status
   curl http://localhost:3000/api/plaid/items
   # Trigger manual sync
   curl -X POST http://localhost:3000/api/plaid/sync
   ```

2. **Filtered by date/entity**:
   ```typescript
   // Check filters in UI component
   const [filters, setFilters] = useState({
     entity: 'Personal',  // Check if correct entity
     startDate: '2024-01-01',  // Check date range
     endDate: '2024-12-31'
   });
   ```

3. **Wrong account**:
   ```sql
   -- Check which account transaction is under
   SELECT t.*, a.name, a.entity_type
   FROM transactions t
   JOIN accounts a ON t.account_id = a.id
   WHERE t.transaction_id = 'plaid-txn-id';
   ```

4. **Pending transaction**:
   ```sql
   SELECT * FROM transactions WHERE pending = true;
   ```

### Task 7: Fix Balance Mismatch

**Example**: COA balance doesn't match ledger

```typescript
// Script: fix-balance-sync.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixBalances() {
  const accounts = await prisma.chart_of_accounts.findMany();

  for (const account of accounts) {
    // Calculate actual balance from ledger
    const ledgerEntries = await prisma.ledger_entries.findMany({
      where: { account_code: account.code }
    });

    const totalDebits = ledgerEntries.reduce((sum, e) => sum + (e.debit || 0n), 0n);
    const totalCredits = ledgerEntries.reduce((sum, e) => sum + (e.credit || 0n), 0n);

    let actualBalance;
    if (['asset', 'expense'].includes(account.account_type)) {
      actualBalance = totalDebits - totalCredits;  // Debit normal
    } else {
      actualBalance = totalCredits - totalDebits;  // Credit normal
    }

    // Update if mismatch
    if (actualBalance !== account.balance) {
      console.log(`Fixing ${account.code}: ${account.balance} → ${actualBalance}`);
      await prisma.chart_of_accounts.update({
        where: { id: account.id },
        data: { balance: actualBalance }
      });
    }
  }
}

fixBalances();
```

---

## Critical Areas & Gotchas

### 1. BigInt Serialization

**Problem**: Prisma returns BigInt, but JSON.stringify() doesn't support BigInt.

**Solution**: Convert to Number before returning in API routes:

```typescript
// ❌ BAD - Will throw error
const transactions = await prisma.transactions.findMany();
return NextResponse.json({ transactions });  // ERROR: BigInt can't be serialized

// ✅ GOOD - Convert BigInt to Number
const transactions = await prisma.transactions.findMany();
const formatted = transactions.map(t => ({
  ...t,
  amount: Number(t.amount)
}));
return NextResponse.json({ transactions: formatted });
```

**Where this matters**:
- All API routes returning monetary amounts
- Chart of Accounts balances
- Transaction amounts
- Ledger entries

### 2. Prisma Connection Pooling

**Problem**: Serverless functions create new Prisma clients on each invocation, leading to connection exhaustion.

**Solution**: Use singleton pattern:

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Always import from `@/lib/prisma`**, not `@prisma/client`:

```typescript
// ❌ BAD
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ✅ GOOD
import { prisma } from '@/lib/prisma';
```

### 3. Optimistic Locking on Balances

**Problem**: Race conditions when updating account balances concurrently.

**Solution**: Use `version` field:

```typescript
// ❌ BAD - Race condition
const account = await prisma.chart_of_accounts.findUnique({
  where: { code: 'P-1010' }
});

await prisma.chart_of_accounts.update({
  where: { code: 'P-1010' },
  data: { balance: account.balance + 1000n }
});

// ✅ GOOD - Optimistic locking
const account = await prisma.chart_of_accounts.findUnique({
  where: { code: 'P-1010' }
});

const updated = await prisma.chart_of_accounts.updateMany({
  where: { code: 'P-1010', version: account.version },
  data: {
    balance: account.balance + 1000n,
    version: { increment: 1 }
  }
});

if (updated.count === 0) {
  throw new Error('Concurrent modification detected, retry');
}
```

### 4. FIFO Position Matching

**Problem**: Incorrectly matching closing trades to opening positions breaks tax reporting.

**Critical**: Always match closes to earliest open of same type (FIFO):

```typescript
// ❌ BAD - Random matching
const openPosition = await prisma.trading_positions.findFirst({
  where: { status: 'open', position_type: 'short_put_spread' }
});

// ✅ GOOD - FIFO matching
const openPosition = await prisma.trading_positions.findFirst({
  where: { status: 'open', position_type: 'short_put_spread' },
  orderBy: { opened_at: 'asc' }  // Earliest first = FIFO
});
```

**Files to review**: `src/lib/position-tracker-service.ts`

### 5. Entity Type Consistency

**Problem**: Mixing entity types in journal entries breaks financial statements.

**Critical**: All entries in a journal transaction must use same entity prefix:

```typescript
// ❌ BAD - Mixing Personal and Business
{
  debits: [{ account: "P-5010", amount: 5000 }],  // Personal
  credits: [{ account: "B-1010", amount: 5000 }]  // Business ← WRONG
}

// ✅ GOOD - All Personal
{
  debits: [{ account: "P-5010", amount: 5000 }],
  credits: [{ account: "P-1010", amount: 5000 }]
}
```

**Validation** in `journal-entry-service.ts`:
```typescript
const entityTypes = entries.map(e => e.account_code.charAt(0));
if (new Set(entityTypes).size > 1) {
  throw new Error('All entries must be same entity type');
}
```

### 6. Plaid Transaction Deduplication

**Problem**: Plaid can return duplicate transactions during sync.

**Solution**: Use `transaction_id` unique constraint + upsert:

```typescript
// ✅ GOOD - Upsert prevents duplicates
for (const plaidTxn of plaidTransactions) {
  await prisma.transactions.upsert({
    where: { transaction_id: plaidTxn.transaction_id },
    update: {
      amount: plaidTxn.amount,
      merchant_name: plaidTxn.merchant_name,
      pending: plaidTxn.pending
    },
    create: {
      transaction_id: plaidTxn.transaction_id,
      user_id: userId,
      account_id: accountId,
      // ... full data
    }
  });
}
```

### 7. Date Handling (Timezones)

**Problem**: Plaid returns dates in UTC, but users expect local timezone.

**Solution**: Store dates as UTC DateTime in database, convert in UI:

```typescript
// API: Store as-is (UTC)
const transaction = await prisma.transactions.create({
  data: {
    date: new Date(plaidTxn.date)  // UTC
  }
});

// UI: Display in local timezone
{new Date(transaction.date).toLocaleDateString('en-US', {
  timeZone: 'America/New_York'
})}
```

### 8. Secure Plaid Tokens

**Problem**: Plaid access tokens are sensitive and permanent.

**Critical**:
- Never log access tokens
- Never commit to git (.env files in .gitignore)
- Encrypt in database (TODO: implement encryption)
- Rotate if compromised

```typescript
// ✅ GOOD - Safe logging
console.log('Syncing transactions for item:', plaid_item.item_id);

// ❌ BAD - Leaks token
console.log('Access token:', plaid_item.access_token);
```

### 9. Balanced Journal Entries

**Problem**: Unbalanced journal entries corrupt financial statements.

**Critical**: Always validate debits = credits:

```typescript
// In journal-entry-service.ts
const totalDebits = entries.reduce((sum, e) => sum + (e.debit || 0n), 0n);
const totalCredits = entries.reduce((sum, e) => sum + (e.credit || 0n), 0n);

if (totalDebits !== totalCredits) {
  throw new Error(`Unbalanced entry: DR ${totalDebits}, CR ${totalCredits}`);
}
```

### 10. Prisma Transaction Atomicity

**Problem**: Balance updates must be atomic (all-or-nothing).

**Solution**: Wrap in `prisma.$transaction()`:

```typescript
// ✅ GOOD - Atomic
await prisma.$transaction(async (tx) => {
  // Create journal entry
  const journal = await tx.journal_transactions.create({ data: ... });

  // Create ledger entries
  await tx.ledger_entries.createMany({ data: ledgerEntries });

  // Update account balances
  await tx.chart_of_accounts.update({
    where: { code: 'P-1010' },
    data: { balance: { decrement: 5000n } }
  });
  await tx.chart_of_accounts.update({
    where: { code: 'P-5010' },
    data: { balance: { increment: 5000n } }
  });
});

// If any step fails, entire transaction rolls back
```

---

## Code Style & Conventions

### TypeScript Conventions

1. **Use TypeScript for all files** (`.ts`, `.tsx`)
2. **Define interfaces for data structures**:
   ```typescript
   interface Transaction {
     id: string;
     date: Date;
     amount: number;  // In cents
     merchant_name: string | null;
   }
   ```
3. **Use type-safe Prisma models**:
   ```typescript
   import { transactions } from '@prisma/client';

   function processTransaction(txn: transactions) {
     // TypeScript knows all fields
   }
   ```
4. **Avoid `any`** - use `unknown` or specific types

### API Route Conventions

1. **Export async functions** named after HTTP method:
   ```typescript
   export async function GET(req: NextRequest) { }
   export async function POST(req: NextRequest) { }
   ```
2. **Always authenticate**:
   ```typescript
   const user = await verifyToken(req);
   if (!user) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }
   ```
3. **Use try/catch** for error handling:
   ```typescript
   try {
     // API logic
   } catch (error) {
     console.error('Error in /api/endpoint:', error);
     return NextResponse.json(
       { error: 'Internal server error' },
       { status: 500 }
     );
   }
   ```
4. **Return consistent error format**:
   ```typescript
   return NextResponse.json({ error: 'Error message' }, { status: 4xx });
   ```

### Component Conventions

1. **Use functional components** with hooks:
   ```typescript
   'use client';
   import { useState, useEffect } from 'react';

   export default function MyComponent() {
     const [data, setData] = useState([]);
     useEffect(() => { /* fetch data */ }, []);
     return <div>...</div>;
   }
   ```
2. **Add 'use client' directive** for client components
3. **Use Tailwind CSS** for styling:
   ```typescript
   <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
   ```
4. **Lucide React for icons**:
   ```typescript
   import { DollarSign, TrendingUp } from 'lucide-react';
   <DollarSign className="w-5 h-5 text-green-600" />
   ```

### Database Conventions

1. **Use BigInt for money**:
   ```prisma
   model transactions {
     amount BigInt  // In cents
   }
   ```
2. **Use UUID for primary keys**:
   ```prisma
   id String @id @default(uuid())
   ```
3. **Add timestamps**:
   ```prisma
   created_at DateTime @default(now())
   updated_at DateTime @updatedAt
   ```
4. **Index frequently queried fields**:
   ```prisma
   @@index([user_id, date])
   ```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `journal-entry-service.ts` |
| Components | PascalCase | `SpendingDashboard.tsx` |
| Functions | camelCase | `createJournalEntry()` |
| Variables | camelCase | `totalDebits` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_ENTITY_TYPE` |
| Database tables | snake_case | `journal_transactions` |
| COA codes | Entity-Number | `P-1010`, `B-4000` |
| API routes | kebab-case | `/api/chart-of-accounts` |

### Import Order

```typescript
// 1. React/Next.js
import { useState } from 'react';
import { NextRequest, NextResponse } from 'next/server';

// 2. External libraries
import { PrismaClient } from '@prisma/client';
import { Configuration, PlaidApi } from 'plaid';

// 3. Internal utilities (@ alias)
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// 4. Components
import Header from '@/components/Header';

// 5. Types
import type { Transaction } from '@/types';
```

---

## Testing & Debugging

### Manual Testing Checklist

When adding new features, test:

1. **Authentication**:
   - [ ] Unauthenticated requests return 401
   - [ ] Valid token allows access
   - [ ] Token expiry is enforced

2. **Transaction Flow**:
   - [ ] Plaid sync imports transactions
   - [ ] Auto-categorization assigns COA codes
   - [ ] Manual COA assignment works
   - [ ] Commit to ledger creates journal entries
   - [ ] Account balances update correctly

3. **Investment Flow**:
   - [ ] Investment transactions import from Plaid
   - [ ] Robinhood parser matches trades
   - [ ] Position tracker opens positions
   - [ ] Position tracker closes positions (FIFO)
   - [ ] Realized P&L calculates correctly

4. **Financial Statements**:
   - [ ] P&L shows correct revenue/expenses
   - [ ] Balance Sheet balances (Assets = Liabilities + Equity)
   - [ ] Cash Flow categorizes correctly
   - [ ] Entity filtering works

5. **UI/UX**:
   - [ ] Dashboard tabs switch correctly
   - [ ] Data loads without errors
   - [ ] Forms validate inputs
   - [ ] Success/error messages display

### Debugging Tools

1. **Prisma Studio** (Database GUI):
   ```bash
   npx prisma studio
   # Opens http://localhost:5555
   # Browse/edit all tables visually
   ```

2. **Browser DevTools**:
   - **Network tab**: Inspect API requests/responses
   - **Console**: Check for client-side errors
   - **React DevTools**: Inspect component state

3. **Server Logs**:
   ```bash
   npm run dev
   # Watch terminal for console.log() and errors
   ```

4. **Database Queries** (Direct SQL):
   ```bash
   psql $DATABASE_URL

   -- Check transaction counts
   SELECT entity_type, COUNT(*) FROM transactions GROUP BY entity_type;

   -- Find unbalanced journal entries
   SELECT journal_entry_id, SUM(debit) - SUM(credit) AS imbalance
   FROM ledger_entries
   GROUP BY journal_entry_id
   HAVING SUM(debit) != SUM(credit);

   -- Check account balances vs ledger
   SELECT c.code, c.balance,
          SUM(l.debit) - SUM(l.credit) AS ledger_balance
   FROM chart_of_accounts c
   LEFT JOIN ledger_entries l ON l.account_code = c.code
   GROUP BY c.code, c.balance
   HAVING c.balance != COALESCE(SUM(l.debit) - SUM(l.credit), 0);
   ```

5. **Debug Scripts** (Root directory):
   - `query-*.ts`: Debug queries for AMD, Plaid data
   - `verify-*.ts/js`: Data integrity checks
   - `fix-*.sh/js`: Repair scripts

### Common Debug Scenarios

**Scenario 1: "Transactions not syncing"**

```typescript
// 1. Check Plaid item status
GET /api/plaid/items
// Look for "item_id", "access_token" exists

// 2. Manually trigger sync
POST /api/plaid/sync

// 3. Check database
SELECT * FROM plaid_items WHERE user_id = 'user-uuid';
SELECT * FROM accounts WHERE plaid_item_id = 'item-id';
SELECT * FROM transactions WHERE account_id = 'account-id' ORDER BY date DESC LIMIT 10;

// 4. Check Plaid API directly
// Use src/lib/plaid.ts to call Plaid API
import { plaidClient } from '@/lib/plaid';
const txns = await plaidClient.transactionsSync({ access_token });
console.log(txns);
```

**Scenario 2: "Balance mismatch"**

```bash
# Run balance verification
npx tsx verify-clean-investments.js

# Or use SQL query
SELECT c.code, c.name, c.balance,
       SUM(COALESCE(l.debit, 0)) - SUM(COALESCE(l.credit, 0)) AS ledger_balance
FROM chart_of_accounts c
LEFT JOIN ledger_entries l ON l.account_code = c.code
GROUP BY c.code, c.name, c.balance
HAVING c.balance != COALESCE(SUM(l.debit) - SUM(l.credit), 0);

# Fix with script
npx tsx fix-balance-sync.patch
```

**Scenario 3: "Journal entry unbalanced"**

```typescript
// API should reject, but check database:
SELECT j.id, j.description,
       SUM(l.debit) AS total_debits,
       SUM(l.credit) AS total_credits,
       SUM(l.debit) - SUM(l.credit) AS imbalance
FROM journal_transactions j
JOIN ledger_entries l ON l.journal_entry_id = j.id
GROUP BY j.id, j.description
HAVING SUM(l.debit) != SUM(l.credit);

// Delete corrupted entries:
DELETE FROM ledger_entries WHERE journal_entry_id = 'corrupted-id';
DELETE FROM journal_transactions WHERE id = 'corrupted-id';
```

**Scenario 4: "AI insights not working"**

```typescript
// 1. Check OpenAI API key
console.log('OpenAI key:', process.env.OPENAI_API_KEY?.slice(0, 10));

// 2. Test API directly
POST /api/ai/spending-insights
// Check browser console and server logs

// 3. Test OpenAI client
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Test' }]
});
console.log(completion);
```

### Error Handling Patterns

**API Routes**:
```typescript
export async function POST(req: NextRequest) {
  try {
    // Business logic
    const data = await processData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in /api/endpoint:', error);

    // Distinguish error types
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate entry' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Services**:
```typescript
export class JournalEntryService {
  async createJournalEntry(data: JournalEntryData) {
    // Validate inputs
    if (!data.entries || data.entries.length === 0) {
      throw new Error('Journal entry must have at least one entry');
    }

    // Validate balance
    const debits = data.entries.reduce((sum, e) => sum + (e.debit || 0n), 0n);
    const credits = data.entries.reduce((sum, e) => sum + (e.credit || 0n), 0n);
    if (debits !== credits) {
      throw new Error(`Unbalanced entry: DR ${debits}, CR ${credits}`);
    }

    // Create entry in transaction
    try {
      return await prisma.$transaction(async (tx) => {
        // ... create logic
      });
    } catch (error) {
      throw new Error(`Failed to create journal entry: ${error.message}`);
    }
  }
}
```

---

## Additional Resources

### Key Files to Read First

1. **`README.md`** - Project overview, features, tech stack
2. **`prisma/schema.prisma`** - Complete data model
3. **`src/lib/journal-entry-service.ts`** - Accounting engine
4. **`src/lib/position-tracker-service.ts`** - Trading logic
5. **`src/app/dashboard/page.tsx`** - Main UI structure

### External Documentation

- **Next.js 15**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **Plaid API**: https://plaid.com/docs
- **OpenAI API**: https://platform.openai.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

### License

**Business Source License 1.1** (BUSL-1.1):
- Free for personal use
- Commercial/hosted use requires paid license
- Converts to Apache 2.0 on 2028-01-01

**When modifying code**:
- Personal projects: OK
- Commercial SaaS: Need license
- Contributing back: Becomes part of Licensed Work

---

## Quick Reference

### Common COA Codes

| Code | Name | Type | Entity |
|------|------|------|--------|
| P-1010 | Cash - Checking | Asset | Personal |
| P-2200 | Credit Card | Liability | Personal |
| P-5010 | Food & Dining | Expense | Personal |
| B-1010 | Business Checking | Asset | Business |
| B-4000 | Revenue | Revenue | Business |
| B-5000 | Cost of Goods Sold | Expense | Business |
| T-1010 | Trading Cash | Asset | Trading |
| T-1200 | Short Put Spread | Asset | Trading |
| T-4100 | Trading Gains | Revenue | Trading |
| T-5100 | Trading Losses | Expense | Trading |

### Common API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/login` | User login |
| `POST /api/plaid/sync` | Sync transactions |
| `POST /api/transactions/commit-to-ledger` | Create journal entries |
| `POST /api/investment-transactions/commit-to-ledger` | Commit trades |
| `POST /api/robinhood/append-history` | Parse Robinhood history |
| `POST /api/statements` | Generate financial statements |
| `POST /api/ai/spending-insights` | Get AI analysis |

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Plaid (get from https://dashboard.plaid.com)
PLAID_CLIENT_ID="your_client_id"
PLAID_SECRET="your_secret"
PLAID_ENV="production"  # or "development", "sandbox"

# OpenAI (get from https://platform.openai.com)
OPENAI_API_KEY="sk-..."

# Auth
NEXTAUTH_SECRET="generate_random_string"
NEXTAUTH_URL="http://localhost:3000"
```

---

## Questions & Support

**For AI Assistants**: If you encounter patterns not covered in this guide:
1. Check recent git commits for similar changes
2. Review existing code in similar API routes/components
3. Test changes thoroughly before committing
4. Add new patterns to this document

**For Human Developers**:
- **Email**: astuart@templestuart.com
- **Issues**: https://github.com/your-username/temple-stuart-accounting/issues
- **License Questions**: https://templestuart.com

---

**End of CLAUDE.md** | Last Updated: 2025-11-18
