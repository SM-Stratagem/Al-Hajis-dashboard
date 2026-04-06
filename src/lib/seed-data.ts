// ═══════════════════════════════════════════════════════════════
// SEED DATA — initial data from POS & P&L reports
// ═══════════════════════════════════════════════════════════════

export const SEED_MONTHLY_SALES = [
  { month: 10, year: 2025, gross: 31691.01, returns: 600, net: 31091, cash: 5766, card: 25325 },
  { month: 11, year: 2025, gross: 40654.33, returns: 1120, net: 39534.32, cash: 8958, card: 30576.32 },
  { month: 12, year: 2025, gross: 43169.76, returns: 1874.76, net: 41295, cash: 7409, card: 33886 },
  { month: 1, year: 2026, gross: 50909, returns: 1410, net: 49499, cash: 8215, card: 41284 },
  { month: 2, year: 2026, gross: 43692, returns: 1270, net: 42422, cash: 7200, card: 35222 },
  { month: 3, year: 2026, gross: 43813.02, returns: 952, net: 42861, cash: 9350, card: 33511 },
];

export const SEED_DAILY_SALES = {
  '2025-10': { startDay: 3, values: [670,1000,895,2380,1496,1040,710,715,1410,970,1200,2317,1490,500,566,560,618,664,630,1365,730,772,1490,768,1488,1290,695,770,320,310,1382] },
  '2025-11': { startDay: 6, values: [1360,1470,972,1188,1160,1900,880,1330,1840,470,720,980,1020,1220,1990,2360,1435,530,1360,1070,650,1440,2205,230,1714,940,1930,760,1650,2760] },
  '2025-12': { startDay: 1, values: [1840,2030,1100,1880,900,1340,1540,1426,337,500,670,1890,1360,2090,820,830,1340,750,1440,1690,1415,830,675,1095,1006,854,2630,2160,1445,2362,1050] },
  '2026-01': { startDay: 4, values: [3112,1305,2835,1790,2670,1310,1200,1630,1480,2530,1585,890,550,3530,720,1670,2240,2405,1360,500,625,1280,1170,1630,2570,1153,1420,1469,680,1105,1085] },
  '2026-02': { startDay: 0, values: [4340,1415,1010,2260,3510,1240,1270,3940,770,750,375,1440,1347,2805,810,695,1100,1620,790,960,990,1000,460,900,2680,2100,1440,405] },
  '2026-03': { startDay: 0, values: [480,1370,1340,970,270,1140,1920,2095,950,1240,1303,1300,2410,1992,2790,1274,1560,1440,2900,1030,2060,1730,680,2382,760,1020,490,1335,920,880,830] },
};

export const SEED_CAPEX = [
  { name: 'Key Money', amount: 190000, category: 'Lease' },
  { name: 'Furniture & Fixtures', amount: 96489, category: 'Fit-out' },
  { name: 'Oils, Accessories, Equipment', amount: 100000, category: 'Inventory' },
  { name: 'License Registration', amount: 25400, category: 'Legal' },
  { name: 'System & Accessories', amount: 4000, category: 'Tech' },
  { name: 'Custom Printer', amount: 6500, category: 'Tech' },
  { name: 'Software License', amount: 2500, category: 'Tech' },
  { name: 'CCTV', amount: 1500, category: 'Tech' },
  { name: 'Branch Mobile', amount: 800, category: 'Tech' },
  { name: '3D Drawing', amount: 4500, category: 'Fit-out' },
  { name: 'DEWA Deposit', amount: 2080, category: 'Deposits' },
  { name: 'Security Deposit', amount: 6000, category: 'Deposits' },
  { name: 'Ejari', amount: 300, category: 'Deposits' },
  { name: 'Immigration & Establishment', amount: 1030, category: 'Legal' },
  { name: 'Staff Visit & Training', amount: 1500, category: 'People' },
  { name: 'Preliminary Expenses', amount: 612, category: 'Other' },
  { name: 'Cargo & Transportation', amount: 1000, category: 'Other' },
];

export const SEED_OVERHEADS = [
  { name: 'Rent & Lease (3 months)', amount: 33000 },
  { name: 'Marketing Expenses', amount: 30000 },
  { name: 'Salaries (2 staff)', amount: 9000 },
  { name: 'Staff Visa x 2', amount: 16000 },
];

export const SEED_PNL = {
  period: 'Sep 2025 – Dec 2025',
  revenue: 125582.34,
  cogsGoods: 28834.82,
  cogsAccessories: 4951.40,
  totalCogs: 33786.22,
  grossProfit: 91796.12,
  grossMargin: 73.10,
  totalExpenses: 104235.62,
  netProfitLoss: -12439.50,
  expenses: [
    { name: 'Bank Charges', amount: 166.40 },
    { name: 'Bonus & Incentives', amount: 250.00 },
    { name: 'Commission on Credit Card', amount: 1882.65 },
    { name: 'Commissions and Fees (Imm/Ejari)', amount: 1330.00 },
    { name: 'Electricity Expense', amount: 1194.33 },
    { name: 'Fuel Expense', amount: 312.13 },
    { name: 'Laundry and Cleaning', amount: 115.00 },
    { name: 'Legal and Professional', amount: 700.00 },
    { name: 'Licenses Expense', amount: 8466.72 },
    { name: 'Marketing & Advertising', amount: 3059.97 },
    { name: 'Meals and Entertainment', amount: 809.58 },
    { name: 'Overtime Expenses', amount: 1845.00 },
    { name: 'Printing Expense', amount: 62.00 },
    { name: 'Rent or Lease Expense', amount: 45150.00 },
    { name: 'Research & Development', amount: 175.00 },
    { name: 'Salaries Expense', amount: 19838.43 },
    { name: 'Sales Commission', amount: 4135.00 },
    { name: 'Sales Promotion', amount: 735.50 },
    { name: 'Shop Expense', amount: 729.30 },
    { name: 'Staff Accommodation', amount: 2675.00 },
    { name: 'Stationery Expense', amount: 48.25 },
    { name: 'Telephone & Internet', amount: 740.86 },
    { name: 'Travel Expense', amount: 2730.50 },
    { name: 'Uniform Expense', amount: 140.00 },
    { name: 'Warehouse Expenses', amount: 2984.00 },
    { name: 'Staff Visa Expenses', amount: 3960.00 },
  ],
};
