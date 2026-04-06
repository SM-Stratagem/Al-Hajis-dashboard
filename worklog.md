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
