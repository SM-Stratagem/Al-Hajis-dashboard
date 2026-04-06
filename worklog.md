---
Task ID: 1
Agent: main
Task: Add multi-branch support with country/city/branch hierarchy and aggregate views

Work Log:
- Read and analyzed entire existing codebase (page.tsx ~1500 lines, all API routes, Prisma schema, seed data)
- Updated Prisma schema: added slug/city/country/flag/currency/sortOrder fields to Branch model, added branchId FK to MonthlySale, DailySale (via MonthlySale), CapexItem, Overhead, PnlPeriod, ProductSale, DataUpload
- Created /src/lib/branches.ts with 20 branch definitions across UAE (12 Dubai + 4 Abu Dhabi), Oman (1 Muscat), Bahrain (2 Manama + 1 Busaiteen), with COUNTRIES hierarchy
- Created /api/branches/route.ts — auto-upserts all branches, returns enriched list with hasData + dataCounts per branch
- Updated ALL 9 data API routes to accept branchSlug query param: monthly-sales, daily-sales, capex, overheads, pnl, products, staff-costs, marketing, transactions
- Updated upload, status, reset API routes for branch-scoped operations
- Updated seed route to accept branchSlug param, seeds ADCB branch by default
- Updated page.tsx: added BranchSelectorBar component at top of page, useStoreData accepts branchSlug, localStorage persistence, view modes (all/country/city/branch), NoDataPage for branches without data, sidebar shows dynamic branch label
- Seeded ADCB branch with 6 months sales, 182 daily records, 17 CAPEX items, 4 overheads, 26 P&L expense lines

Stage Summary:
- Multi-branch architecture fully implemented
- 20 branches registered in database
- ADCB branch seeded with complete real data
- Branch selector bar appears at top of page with hierarchy dropdown
- Views: All Branches (aggregate), UAE All, Dubai All, Abu Dhabi All, Oman All, Bahrain All, individual branches
- All API routes properly filter by branch
- NoDataPage shows for branches without data
- Selection persists in localStorage

---
Task ID: 2
Agent: main
Task: Implement working aggregate views (all/country/city) with real data aggregation and branch comparison

Work Log:
- Created /api/data/aggregate/route.ts — aggregates monthly sales, daily sales, CAPEX, overheads, P&L across multiple branches by viewType (all/country/city)
- Aggregate API includes per-branch revenue breakdown (branchComparison array) for comparison charts
- Refactored useStoreData hook: now accepts full ViewMode instead of branchSlug, detects aggregate views and calls /api/data/aggregate endpoint
- Moved ViewMode type and isAggregateView() before useStoreData to fix TypeScript ordering
- Removed getBranchSlugForView() (no longer needed)
- Updated NoDataPage to remove "Coming Soon" for aggregate views — now shows actionable message
- Updated Home component: showNoData only triggers when hasData is false (aggregate views now work)
- Added currency-aware formatting: fmtCurrency/fmtCurrencyK with AED/OMR/BHD support, money()/moneyK() aliases
- Updated DashboardPage: uses money()/moneyK() with data.currency, shows aggregate info banner, branch comparison bar chart with real per-branch revenue data
- Updated DataCenterPage: accepts StoreData props, shows warning in aggregate view, seed handler includes branchSlug
- Updated seed API to use branch info from BRANCHES array (correct city/country/flag/currency)
- Added branchComparison to StoreData interface and aggregate data pipeline

Stage Summary:
- Aggregate views (All Branches, UAE, Dubai, Abu Dhabi, Oman, Bahrain) now display real aggregated data
- Branch comparison chart shows per-branch revenue breakdown in aggregate views
- Currency formatting supports AED (UAE), OMR (Oman), BHD (Bahrain)
- Data Center blocks data operations in aggregate view with clear warning
- Seed route correctly creates branches with proper metadata from BRANCHES array
- Currently only ADCB branch has data; other branches can be seeded via Data Center
