// ═══════════════════════════════════════════════════════════════
// PARFUMIX ADCB BRANCH INTELLIGENCE — VERIFIED DATA
// Source: POS Daywise Reports (Oct 2025 – Mar 2026)
//         P&L Account (Sep–Dec 2025)
//         CAPEX Summary Report
// ═══════════════════════════════════════════════════════════════

// ── MONTHLY AGGREGATES (from POS daywise reports) ────────────
export const MONTHS = ['Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26'] as const;
export const MONTHS_FULL = [
  'October 2025', 'November 2025', 'December 2025',
  'January 2026', 'February 2026', 'March 2026'
] as const;

export const GROSS = [31691.01, 40654.33, 43169.76, 50909, 43692, 43813.02];
export const RETURNS = [600, 1120, 1874.76, 1410, 1270, 952];
export const NET = [31091, 39534.32, 41295, 49499, 42422, 42861];
export const CASH = [5766, 8958, 7409, 8215, 7200, 9350];
export const CARD = [25325, 30576.32, 33886, 41284, 35222, 33511];

// ── DAILY DATA (per month, starting day-of-week for calendar alignment) ──
export const DAILY: { startDay: number; values: number[] }[] = [
  { startDay: 3, values: [670,1000,895,2380,1496,1040,710,715,1410,970,1200,2317,1490,500,566,560,618,664,630,1365,730,772,1490,768,1488,1290,695,770,320,310,1382] },
  { startDay: 6, values: [1360,1470,972,1188,1160,1900,880,1330,1840,470,720,980,1020,1220,1990,2360,1435,530,1360,1070,650,1440,2205,230,1714,940,1930,760,1650,2760] },
  { startDay: 1, values: [1840,2030,1100,1880,900,1340,1540,1426,337,500,670,1890,1360,2090,820,830,1340,750,1440,1690,1415,830,675,1095,1006,854,2630,2160,1445,2362,1050] },
  { startDay: 4, values: [3112,1305,2835,1790,2670,1310,1200,1630,1480,2530,1585,890,550,3530,720,1670,2240,2405,1360,500,625,1280,1170,1630,2570,1153,1420,1469,680,1105,1085] },
  { startDay: 0, values: [4340,1415,1010,2260,3510,1240,1270,3940,770,750,375,1440,1347,2805,810,695,1100,1620,790,960,990,1000,460,900,2680,2100,1440,405] },
  { startDay: 0, values: [480,1370,1340,970,270,1140,1920,2095,950,1240,1303,1300,2410,1992,2790,1274,1560,1440,2900,1030,2060,1730,680,2382,760,1020,490,1335,920,880,830] },
];

// ── CAPEX DATA (verified from CAPEX Summary Report) ──────────
export const CAPEX_ITEMS = [
  { name: 'Key Money',                        amount: 190000,  category: 'Lease' },
  { name: 'Furniture & Fixtures',             amount: 96489,   category: 'Fit-out' },
  { name: 'Oils, Accessories, Equipment',     amount: 100000,  category: 'Inventory' },
  { name: 'License Registration',             amount: 25400,   category: 'Legal' },
  { name: 'System & Accessories',             amount: 4000,    category: 'Tech' },
  { name: 'Custom Printer',                   amount: 6500,    category: 'Tech' },
  { name: 'Software License',                 amount: 2500,    category: 'Tech' },
  { name: 'CCTV',                             amount: 1500,    category: 'Tech' },
  { name: 'Branch Mobile',                    amount: 800,     category: 'Tech' },
  { name: '3D Drawing',                       amount: 4500,    category: 'Fit-out' },
  { name: 'DEWA Deposit',                     amount: 2080,    category: 'Deposits' },
  { name: 'Security Deposit',                 amount: 6000,    category: 'Deposits' },
  { name: 'Ejari',                            amount: 300,     category: 'Deposits' },
  { name: 'Immigration & Establishment',      amount: 1030,    category: 'Legal' },
  { name: 'Staff Visit & Training',           amount: 1500,    category: 'People' },
  { name: 'Preliminary Expenses',             amount: 612,     category: 'Other' },
  { name: 'Cargo & Transportation',           amount: 1000,    category: 'Other' },
];

export const OVERHEADS = [
  { name: 'Rent & Lease (3 months)', amount: 33000 },
  { name: 'Marketing Expenses',      amount: 30000 },
  { name: 'Salaries (2 staff)',      amount: 9000 },
  { name: 'Staff Visa x 2',         amount: 16000 },
];

export const TOTAL_CAPEX = 444211;
export const TOTAL_OVERHEADS = 88000;
export const TOTAL_INVESTMENT = 532211;

// ── P&L DATA (Sep–Dec 2025, verified from P&L Account) ──────
export const PNL = {
  period: 'Sep 2025 – Dec 2025',
  revenue: 125582.34,
  cogsGoods: 28834.82,
  cogsAccessories: 4951.40,
  totalCogs: 33786.22,
  grossProfit: 91796.12,
  grossMargin: 73.10,
  expenses: [
    { name: 'Bank Charges',                    amount: 166.40 },
    { name: 'Bonus & Incentives',              amount: 250.00 },
    { name: 'Commission on Credit Card',        amount: 1882.65 },
    { name: 'Commissions and Fees (Imm/Ejari)', amount: 1330.00 },
    { name: 'Electricity Expense',              amount: 1194.33 },
    { name: 'Fuel Expense',                     amount: 312.13 },
    { name: 'Laundry and Cleaning',             amount: 115.00 },
    { name: 'Legal and Professional',           amount: 700.00 },
    { name: 'Licenses Expense',                 amount: 8466.72 },
    { name: 'Marketing & Advertising',          amount: 3059.97 },
    { name: 'Meals and Entertainment',          amount: 809.58 },
    { name: 'Overtime Expenses',                amount: 1845.00 },
    { name: 'Printing Expense',                 amount: 62.00 },
    { name: 'Rent or Lease Expense',            amount: 45150.00 },
    { name: 'Research & Development',           amount: 175.00 },
    { name: 'Salaries Expense',                 amount: 19838.43 },
    { name: 'Sales Commission',                 amount: 4135.00 },
    { name: 'Sales Promotion',                  amount: 735.50 },
    { name: 'Shop Expense',                     amount: 729.30 },
    { name: 'Staff Accommodation',              amount: 2675.00 },
    { name: 'Stationery Expense',               amount: 48.25 },
    { name: 'Telephone & Internet',             amount: 740.86 },
    { name: 'Travel Expense',                   amount: 2730.50 },
    { name: 'Uniform Expense',                  amount: 140.00 },
    { name: 'Warehouse Expenses',               amount: 2984.00 },
    { name: 'Staff Visa Expenses',              amount: 3960.00 },
  ],
  totalExpenses: 104235.62,
  netProfitLoss: -12439.50,
};

// ── DERIVED METRICS ──────────────────────────────────────────
export const totalGross = GROSS.reduce((a, b) => a + b, 0);
export const totalNet = NET.reduce((a, b) => a + b, 0);
export const totalReturns = RETURNS.reduce((a, b) => a + b, 0);
export const totalCash = CASH.reduce((a, b) => a + b, 0);
export const totalCard = CARD.reduce((a, b) => a + b, 0);
export const avgMonthlyNet = totalNet / 6;
export const capitalRecovered = (totalNet / TOTAL_INVESTMENT) * 100;
export const avgReturnRate = (totalReturns / totalGross) * 100;
export const cardShare = (totalCard / totalNet) * 100;

export const cumulativeNet = NET.reduce((acc: number[], v) => {
  acc.push((acc[acc.length - 1] || 0) + v);
  return acc;
}, []);

export const returnRates = GROSS.map((g, i) => +(RETURNS[i] / g * 100).toFixed(2));

export const momGrowth = NET.map((v, i) =>
  i === 0 ? null : +(((v - NET[i - 1]) / NET[i - 1]) * 100).toFixed(1)
);

export const cardPct = CARD.map((c, i) => +(c / NET[i] * 100).toFixed(1));

// ── FORECAST DATA ────────────────────────────────────────────
export const FORECAST = {
  apr: { base: 44200, bear: 37570, bull: 50830 },
  may: { base: 38800, bear: 32980, bull: 44620 },
  jun: { base: 46500, bear: 39525, bull: 53475 },
};

// ── COST ESTIMATES (for P&L model) ──────────────────────────
export const EST_MONTHLY_COSTS = {
  rent: 11000,
  salaries: 3000,
  software: 208,
  utilities: 800,
  marketing: 10000,
  misc: 2000,
  total: 27008,
};
