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

---
Task ID: 3
Agent: main
Task: Add Product Analytics, Staff Productivity, and Marketing ROI sections

Work Log:
- Added SEED_PRODUCTS (66 records across 11 SKUs in 5 categories: Oud, Floral, Oriental, Fresh, Accessories) for 6 months
- Added SEED_STAFF_COSTS (6 monthly records with salary, commission, visa, accommodation, overtime breakdown)
- Added SEED_MARKETING (17 records across 4 channels: Instagram, In-Mall, Influencer, Samples) for 6 months
- Added SEED_TRANSACTIONS (6 monthly records with receipt counts and revenue for ticket size calculation)
- Updated seed API route to create Products, StaffCosts, MarketingSpends, TransactionSummaries
- Added 3 new page sections to page.tsx:
  - ProductsPage: revenue by category pie chart, top 8 products list, stacked bar chart for monthly category revenue, KPIs (total revenue, units, avg margin, top product)
  - StaffPage: cost breakdown pie, monthly staff cost stacked bar, revenue per staff hour line, detail table with all cost components
  - MarketingPage: channel spend pie chart, channel breakdown with progress bars, composed chart (revenue bar + marketing spend line), KPIs (ROI, CAC, spend/revenue ratio)
- Added "Analytics" section to sidebar navigation between Operations and Strategy
- Added Megaphone icon import, updated PageId type and pageComponents record
- Reseeded ADCB branch: 66 products, 6 staff costs, 17 marketing records, 6 transaction summaries
- All API endpoints verified returning data (200 status)
- Lint passes cleanly

Stage Summary:
- 3 new dashboard sections live: Product Analytics, Staff Productivity, Marketing ROI
- Full seed data for all 3 sections (ADCB branch, Oct 2025 - Mar 2026)
- Analytics nav group added to sidebar with 3 entries
- Total dashboard sections: 18 (was 15)
- Each section independently fetches its own data from the API
- Graceful empty states shown when no data is available

---
Task ID: 4
Agent: main
Task: Fix hydration mismatch error in BranchSelectorBar component

Work Log:
- Diagnosed hydration mismatch: loadViewMode() returned different values on server (default branch) vs client (localStorage-persisted "all" view)
- Root cause: useState(loadViewMode) lazy initializer runs on both SSR and client hydration, reading different values from localStorage
- Initial attempt with useEffect+setState blocked by `react-hooks/set-state-in-effect` lint rule
- Second attempt with ref during render blocked by `react-hooks/refs` lint rule
- Final fix: implemented `useHydratedViewMode()` hook using `useSyncExternalStore` with separate `getServerSnapshot` that always returns the default branch
- Added `useSyncExternalStore` to React imports
- Hydration-safe: server always renders default branch, client re-renders with persisted view after mount via storage event subscription

Stage Summary:
- Hydration mismatch resolved using React's recommended `useSyncExternalStore` pattern
- Lint passes cleanly (0 errors, 0 warnings)
- No compilation errors
- Verified all 3 Analytics sections (Product Analytics, Staff Productivity, Marketing ROI) are already fully implemented from previous session

---
## Task ID: 5 - predictive-engine
### Work Task
Create a predictive analytics engine module at `/home/z/my-project/src/lib/predictive.ts` providing real statistical forecasting capabilities — pure math, no hardcoded values, no dependencies.

### Work Summary
Created `/home/z/my-project/src/lib/predictive.ts` with 8 pure utility functions implementing real statistical algorithms:

1. **linearRegression** — Ordinary least-squares regression with slope, intercept, R² goodness-of-fit, and forecast function. Uses closed-form formulas: slope = (nΣxy − ΣxΣy) / (nΣx² − (Σx)²), R² = 1 − SS_res/SS_tot.

2. **exponentialSmoothing** — Simple exponential smoothing (S_t = α·Y_t + (1−α)·S_{t−1}) with configurable alpha (default 0.3). Returns next-period forecast and full smoothed series.

3. **movingAverageForecast** — Simple moving average over configurable window (default 3). Computes forecast, trend direction (up/down/stable via 2% threshold), and overall average.

4. **seasonalIndices** — Multiplicative seasonal decomposition using centered moving average for detrending, period-averaged ratios, and normalization to mean=1. Returns indices array and a forecast function combining linear trend × seasonal factor.

5. **detectAnomalies** — Z-score based anomaly detection with configurable threshold (default 1.5). Returns anomalies array with index, value, z-score, and type (spike/dip).

6. **confidenceInterval** — Prediction interval using regression residuals standard error, widened by √periods and distance from mean x. Includes z-value lookup table with linear interpolation for arbitrary confidence levels.

7. **revenueTrendAnalysis** — Composite analysis combining linear regression slope + exponential smoothing for next-month estimate. Computes CAGR, coefficient of variation (volatility), momentum (last 3 vs first 3 avg change), trend classification (5 levels), and 90% confidence range.

8. **productDemandScore** — Demand scorecard analyzing sales velocity (fast/moderate/slow by absolute thresholds), trend (accelerating/stable/declining via half-split comparison + regression slope), stockout risk (composite of velocity + trend + spike detection), and reorder point (exponential smoothing forecast + 1.5σ safety stock).

All functions handle edge cases (empty arrays, single values, zero values). Outputs rounded to appropriate precision. Zero external dependencies — pure TypeScript. ESLint passes with 0 errors. TypeScript compiles cleanly.

---
Task ID: 5
Agent: main
Task: Fix infinite loop in useHydratedViewMode + upgrade dashboard with real predictive analytics

Work Log:
- Fixed `getSnapshot` infinite loop: the function was returning new object references each call (JSON.parse creates new objects). React's useSyncExternalStore requires stable references when data hasn't changed.
- Solution: cached the raw string + parsed object in a ref; returns the same reference when localStorage string hasn't changed.
- Added custom `parfumix:view-change` event dispatch in `saveViewMode()` so same-tab updates trigger the external store listener.
- Created `/src/lib/predictive.ts` with 8 statistical functions (delegated to sub-agent)
- Upgraded Forecast page: replaced hardcoded FORECAST data with real linear regression + exponential smoothing blended forecasts; confidence intervals computed from regression residual SE (not arbitrary ±15%); added trend badge, R² display, CAGR, volatility
- Upgraded Alerts page: replaced 2 hardcoded alert texts with dynamic anomaly detection (z-score based on NET and RETURNS); added trend-based alert using revenueTrendAnalysis(); added "PREDICTED" badge for dynamically computed alerts; alert count now reflects actual data
- Upgraded Products page: added productDemandScore per product (velocity, trend direction, stockout risk, reorder point); product list now shows velocity tags (fast/moderate/slow), acceleration indicators, stockout risk warnings, and suggested reorder quantities; KPI card shows demand signals instead of static "Top Product"

Stage Summary:
- Infinite loop fixed via snapshot caching in useSyncExternalStore
- 3 pages upgraded with real predictive analytics (Forecast, Alerts, Products)
- All predictions computed from actual data using statistical algorithms
- No hardcoded forecast values remain (FORECAST import retained for backward compat but not used for display)
- Lint: 0 errors, Compilation: ✓ success

---
Task ID: 6
Agent: main
Task: Make predictions dynamic — recalculate when new data is uploaded via Data Center

Work Log:
- Diagnosed root cause: predictions were NOT updating after data upload because all data-fetching hooks only ran on mount or view change
  - `useStoreData` deps: `[view, currency]` — no trigger on data mutation
  - `ProductsPage` useEffect deps: `[]` — only runs on mount
  - `StaffPage` useEffect deps: `[]` — only runs on mount
  - `MarketingPage` useEffect deps: `[]` — only runs on mount
  - Data Center seed/upload/reset only called `fetchStatus()` — no global data refresh
- Added `dataVersion: number` field to `StoreData` interface
- Modified `useStoreData(view, dataVersion)` to accept dataVersion as second param and include in useEffect dependency array
- Added `dataVersion` state in `Home` component, initialized to 0
- Added event listener in `Home` for `parfumix:data-changed` custom event → increments `dataVersion`
- Updated `ProductsPage`, `StaffPage`, `MarketingPage` to use `data.dataVersion` in their useEffect deps (with loading state reset)
- Updated `DataCenterPage` to dispatch `parfumix:data-changed` event after:
  - Successful seed (handleSeed)
  - Successful upload (handleUpload)
  - Successful reset (handleReset)
  - Successful manual save (handleManualSave)

Stage Summary:
- Predictions now automatically recalculate when data is uploaded, seeded, or reset via Data Center
- All 6 data mutation points in Data Center trigger global data refresh
- Forecast, Alerts, Products, Staff, Marketing pages all re-fetch and re-compute predictions with fresh data
- Lint: 0 errors, Compilation: ✓ success
