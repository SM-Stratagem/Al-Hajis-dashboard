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

// ═══════════════════════════════════════════════════════════════
// PRODUCT / SKU SEED DATA (6 months)
// ═══════════════════════════════════════════════════════════════
export const SEED_PRODUCTS = [
  // Oct 2025
  { name: 'Oud Royal Concentrate', sku: 'PFM-OUD-001', category: 'Oud', unitCost: 85, sellingPrice: 250, quantitySold: 18, revenue: 4500, margin: 66.0, month: 10, year: 2025 },
  { name: 'Oud Cambodi Premium', sku: 'PFM-OUD-002', category: 'Oud', unitCost: 120, sellingPrice: 350, quantitySold: 12, revenue: 4200, margin: 65.7, month: 10, year: 2025 },
  { name: 'Rose Taif Eau de Parfum', sku: 'PFM-FLR-001', category: 'Floral', unitCost: 45, sellingPrice: 150, quantitySold: 32, revenue: 4800, margin: 70.0, month: 10, year: 2025 },
  { name: 'Jasmine Noir Spray', sku: 'PFM-FLR-002', category: 'Floral', unitCost: 38, sellingPrice: 120, quantitySold: 28, revenue: 3360, margin: 68.3, month: 10, year: 2025 },
  { name: 'Amber Musk Oriental', sku: 'PFM-ORT-001', category: 'Oriental', unitCost: 52, sellingPrice: 180, quantitySold: 22, revenue: 3960, margin: 71.1, month: 10, year: 2025 },
  { name: 'Sandalwood Classic', sku: 'PFM-ORT-002', category: 'Oriental', unitCost: 48, sellingPrice: 160, quantitySold: 20, revenue: 3200, margin: 70.0, month: 10, year: 2025 },
  { name: 'Ocean Breeze Fresh', sku: 'PFM-FRS-001', category: 'Fresh', unitCost: 30, sellingPrice: 95, quantitySold: 15, revenue: 1425, margin: 68.4, month: 10, year: 2025 },
  { name: 'Bergamot Citrus', sku: 'PFM-FRS-002', category: 'Fresh', unitCost: 28, sellingPrice: 85, quantitySold: 12, revenue: 1020, margin: 67.1, month: 10, year: 2025 },
  { name: 'Oud Burner Set', sku: 'PFM-ACC-001', category: 'Accessories', unitCost: 15, sellingPrice: 55, quantitySold: 25, revenue: 1375, margin: 72.7, month: 10, year: 2025 },
  { name: 'Gift Box Premium', sku: 'PFM-ACC-002', category: 'Accessories', unitCost: 65, sellingPrice: 200, quantitySold: 8, revenue: 1600, margin: 67.5, month: 10, year: 2025 },
  { name: 'Perfume Oil Roll-On', sku: 'PFM-ACC-003', category: 'Accessories', unitCost: 12, sellingPrice: 40, quantitySold: 45, revenue: 1800, margin: 70.0, month: 10, year: 2025 },
  // Nov 2025
  { name: 'Oud Royal Concentrate', sku: 'PFM-OUD-001', category: 'Oud', unitCost: 85, sellingPrice: 250, quantitySold: 24, revenue: 6000, margin: 66.0, month: 11, year: 2025 },
  { name: 'Oud Cambodi Premium', sku: 'PFM-OUD-002', category: 'Oud', unitCost: 120, sellingPrice: 350, quantitySold: 16, revenue: 5600, margin: 65.7, month: 11, year: 2025 },
  { name: 'Rose Taif Eau de Parfum', sku: 'PFM-FLR-001', category: 'Floral', unitCost: 45, sellingPrice: 150, quantitySold: 42, revenue: 6300, margin: 70.0, month: 11, year: 2025 },
  { name: 'Jasmine Noir Spray', sku: 'PFM-FLR-002', category: 'Floral', unitCost: 38, sellingPrice: 120, quantitySold: 35, revenue: 4200, margin: 68.3, month: 11, year: 2025 },
  { name: 'Amber Musk Oriental', sku: 'PFM-ORT-001', category: 'Oriental', unitCost: 52, sellingPrice: 180, quantitySold: 28, revenue: 5040, margin: 71.1, month: 11, year: 2025 },
  { name: 'Sandalwood Classic', sku: 'PFM-ORT-002', category: 'Oriental', unitCost: 48, sellingPrice: 160, quantitySold: 25, revenue: 4000, margin: 70.0, month: 11, year: 2025 },
  { name: 'Ocean Breeze Fresh', sku: 'PFM-FRS-001', category: 'Fresh', unitCost: 30, sellingPrice: 95, quantitySold: 20, revenue: 1900, margin: 68.4, month: 11, year: 2025 },
  { name: 'Bergamot Citrus', sku: 'PFM-FRS-002', category: 'Fresh', unitCost: 28, sellingPrice: 85, quantitySold: 18, revenue: 1530, margin: 67.1, month: 11, year: 2025 },
  { name: 'Oud Burner Set', sku: 'PFM-ACC-001', category: 'Accessories', unitCost: 15, sellingPrice: 55, quantitySold: 35, revenue: 1925, margin: 72.7, month: 11, year: 2025 },
  { name: 'Gift Box Premium', sku: 'PFM-ACC-002', category: 'Accessories', unitCost: 65, sellingPrice: 200, quantitySold: 14, revenue: 2800, margin: 67.5, month: 11, year: 2025 },
  { name: 'Perfume Oil Roll-On', sku: 'PFM-ACC-003', category: 'Accessories', unitCost: 12, sellingPrice: 40, quantitySold: 55, revenue: 2200, margin: 70.0, month: 11, year: 2025 },
  // Dec 2025 (peak season - higher volumes)
  { name: 'Oud Royal Concentrate', sku: 'PFM-OUD-001', category: 'Oud', unitCost: 85, sellingPrice: 250, quantitySold: 32, revenue: 8000, margin: 66.0, month: 12, year: 2025 },
  { name: 'Oud Cambodi Premium', sku: 'PFM-OUD-002', category: 'Oud', unitCost: 120, sellingPrice: 350, quantitySold: 22, revenue: 7700, margin: 65.7, month: 12, year: 2025 },
  { name: 'Rose Taif Eau de Parfum', sku: 'PFM-FLR-001', category: 'Floral', unitCost: 45, sellingPrice: 150, quantitySold: 55, revenue: 8250, margin: 70.0, month: 12, year: 2025 },
  { name: 'Jasmine Noir Spray', sku: 'PFM-FLR-002', category: 'Floral', unitCost: 38, sellingPrice: 120, quantitySold: 45, revenue: 5400, margin: 68.3, month: 12, year: 2025 },
  { name: 'Amber Musk Oriental', sku: 'PFM-ORT-001', category: 'Oriental', unitCost: 52, sellingPrice: 180, quantitySold: 35, revenue: 6300, margin: 71.1, month: 12, year: 2025 },
  { name: 'Sandalwood Classic', sku: 'PFM-ORT-002', category: 'Oriental', unitCost: 48, sellingPrice: 160, quantitySold: 30, revenue: 4800, margin: 70.0, month: 12, year: 2025 },
  { name: 'Ocean Breeze Fresh', sku: 'PFM-FRS-001', category: 'Fresh', unitCost: 30, sellingPrice: 95, quantitySold: 22, revenue: 2090, margin: 68.4, month: 12, year: 2025 },
  { name: 'Bergamot Citrus', sku: 'PFM-FRS-002', category: 'Fresh', unitCost: 28, sellingPrice: 85, quantitySold: 16, revenue: 1360, margin: 67.1, month: 12, year: 2025 },
  { name: 'Oud Burner Set', sku: 'PFM-ACC-001', category: 'Accessories', unitCost: 15, sellingPrice: 55, quantitySold: 50, revenue: 2750, margin: 72.7, month: 12, year: 2025 },
  { name: 'Gift Box Premium', sku: 'PFM-ACC-002', category: 'Accessories', unitCost: 65, sellingPrice: 200, quantitySold: 22, revenue: 4400, margin: 67.5, month: 12, year: 2025 },
  { name: 'Perfume Oil Roll-On', sku: 'PFM-ACC-003', category: 'Accessories', unitCost: 12, sellingPrice: 40, quantitySold: 70, revenue: 2800, margin: 70.0, month: 12, year: 2025 },
  // Jan 2026
  { name: 'Oud Royal Concentrate', sku: 'PFM-OUD-001', category: 'Oud', unitCost: 85, sellingPrice: 250, quantitySold: 38, revenue: 9500, margin: 66.0, month: 1, year: 2026 },
  { name: 'Oud Cambodi Premium', sku: 'PFM-OUD-002', category: 'Oud', unitCost: 120, sellingPrice: 350, quantitySold: 26, revenue: 9100, margin: 65.7, month: 1, year: 2026 },
  { name: 'Rose Taif Eau de Parfum', sku: 'PFM-FLR-001', category: 'Floral', unitCost: 45, sellingPrice: 150, quantitySold: 48, revenue: 7200, margin: 70.0, month: 1, year: 2026 },
  { name: 'Jasmine Noir Spray', sku: 'PFM-FLR-002', category: 'Floral', unitCost: 38, sellingPrice: 120, quantitySold: 40, revenue: 4800, margin: 68.3, month: 1, year: 2026 },
  { name: 'Amber Musk Oriental', sku: 'PFM-ORT-001', category: 'Oriental', unitCost: 52, sellingPrice: 180, quantitySold: 32, revenue: 5760, margin: 71.1, month: 1, year: 2026 },
  { name: 'Sandalwood Classic', sku: 'PFM-ORT-002', category: 'Oriental', unitCost: 48, sellingPrice: 160, quantitySold: 28, revenue: 4480, margin: 70.0, month: 1, year: 2026 },
  { name: 'Ocean Breeze Fresh', sku: 'PFM-FRS-001', category: 'Fresh', unitCost: 30, sellingPrice: 95, quantitySold: 25, revenue: 2375, margin: 68.4, month: 1, year: 2026 },
  { name: 'Bergamot Citrus', sku: 'PFM-FRS-002', category: 'Fresh', unitCost: 28, sellingPrice: 85, quantitySold: 20, revenue: 1700, margin: 67.1, month: 1, year: 2026 },
  { name: 'Oud Burner Set', sku: 'PFM-ACC-001', category: 'Accessories', unitCost: 15, sellingPrice: 55, quantitySold: 42, revenue: 2310, margin: 72.7, month: 1, year: 2026 },
  { name: 'Gift Box Premium', sku: 'PFM-ACC-002', category: 'Accessories', unitCost: 65, sellingPrice: 200, quantitySold: 18, revenue: 3600, margin: 67.5, month: 1, year: 2026 },
  { name: 'Perfume Oil Roll-On', sku: 'PFM-ACC-003', category: 'Accessories', unitCost: 12, sellingPrice: 40, quantitySold: 60, revenue: 2400, margin: 70.0, month: 1, year: 2026 },
  // Feb 2026
  { name: 'Oud Royal Concentrate', sku: 'PFM-OUD-001', category: 'Oud', unitCost: 85, sellingPrice: 250, quantitySold: 28, revenue: 7000, margin: 66.0, month: 2, year: 2026 },
  { name: 'Oud Cambodi Premium', sku: 'PFM-OUD-002', category: 'Oud', unitCost: 120, sellingPrice: 350, quantitySold: 18, revenue: 6300, margin: 65.7, month: 2, year: 2026 },
  { name: 'Rose Taif Eau de Parfum', sku: 'PFM-FLR-001', category: 'Floral', unitCost: 45, sellingPrice: 150, quantitySold: 38, revenue: 5700, margin: 70.0, month: 2, year: 2026 },
  { name: 'Jasmine Noir Spray', sku: 'PFM-FLR-002', category: 'Floral', unitCost: 38, sellingPrice: 120, quantitySold: 32, revenue: 3840, margin: 68.3, month: 2, year: 2026 },
  { name: 'Amber Musk Oriental', sku: 'PFM-ORT-001', category: 'Oriental', unitCost: 52, sellingPrice: 180, quantitySold: 26, revenue: 4680, margin: 71.1, month: 2, year: 2026 },
  { name: 'Sandalwood Classic', sku: 'PFM-ORT-002', category: 'Oriental', unitCost: 48, sellingPrice: 160, quantitySold: 24, revenue: 3840, margin: 70.0, month: 2, year: 2026 },
  { name: 'Ocean Breeze Fresh', sku: 'PFM-FRS-001', category: 'Fresh', unitCost: 30, sellingPrice: 95, quantitySold: 18, revenue: 1710, margin: 68.4, month: 2, year: 2026 },
  { name: 'Bergamot Citrus', sku: 'PFM-FRS-002', category: 'Fresh', unitCost: 28, sellingPrice: 85, quantitySold: 14, revenue: 1190, margin: 67.1, month: 2, year: 2026 },
  { name: 'Oud Burner Set', sku: 'PFM-ACC-001', category: 'Accessories', unitCost: 15, sellingPrice: 55, quantitySold: 30, revenue: 1650, margin: 72.7, month: 2, year: 2026 },
  { name: 'Gift Box Premium', sku: 'PFM-ACC-002', category: 'Accessories', unitCost: 65, sellingPrice: 200, quantitySold: 10, revenue: 2000, margin: 67.5, month: 2, year: 2026 },
  { name: 'Perfume Oil Roll-On', sku: 'PFM-ACC-003', category: 'Accessories', unitCost: 12, sellingPrice: 40, quantitySold: 48, revenue: 1920, margin: 70.0, month: 2, year: 2026 },
  // Mar 2026
  { name: 'Oud Royal Concentrate', sku: 'PFM-OUD-001', category: 'Oud', unitCost: 85, sellingPrice: 250, quantitySold: 30, revenue: 7500, margin: 66.0, month: 3, year: 2026 },
  { name: 'Oud Cambodi Premium', sku: 'PFM-OUD-002', category: 'Oud', unitCost: 120, sellingPrice: 350, quantitySold: 20, revenue: 7000, margin: 65.7, month: 3, year: 2026 },
  { name: 'Rose Taif Eau de Parfum', sku: 'PFM-FLR-001', category: 'Floral', unitCost: 45, sellingPrice: 150, quantitySold: 40, revenue: 6000, margin: 70.0, month: 3, year: 2026 },
  { name: 'Jasmine Noir Spray', sku: 'PFM-FLR-002', category: 'Floral', unitCost: 38, sellingPrice: 120, quantitySold: 34, revenue: 4080, margin: 68.3, month: 3, year: 2026 },
  { name: 'Amber Musk Oriental', sku: 'PFM-ORT-001', category: 'Oriental', unitCost: 52, sellingPrice: 180, quantitySold: 28, revenue: 5040, margin: 71.1, month: 3, year: 2026 },
  { name: 'Sandalwood Classic', sku: 'PFM-ORT-002', category: 'Oriental', unitCost: 48, sellingPrice: 160, quantitySold: 26, revenue: 4160, margin: 70.0, month: 3, year: 2026 },
  { name: 'Ocean Breeze Fresh', sku: 'PFM-FRS-001', category: 'Fresh', unitCost: 30, sellingPrice: 95, quantitySold: 20, revenue: 1900, margin: 68.4, month: 3, year: 2026 },
  { name: 'Bergamot Citrus', sku: 'PFM-FRS-002', category: 'Fresh', unitCost: 28, sellingPrice: 85, quantitySold: 16, revenue: 1360, margin: 67.1, month: 3, year: 2026 },
  { name: 'Oud Burner Set', sku: 'PFM-ACC-001', category: 'Accessories', unitCost: 15, sellingPrice: 55, quantitySold: 35, revenue: 1925, margin: 72.7, month: 3, year: 2026 },
  { name: 'Gift Box Premium', sku: 'PFM-ACC-002', category: 'Accessories', unitCost: 65, sellingPrice: 200, quantitySold: 12, revenue: 2400, margin: 67.5, month: 3, year: 2026 },
  { name: 'Perfume Oil Roll-On', sku: 'PFM-ACC-003', category: 'Accessories', unitCost: 12, sellingPrice: 40, quantitySold: 52, revenue: 2080, margin: 70.0, month: 3, year: 2026 },
];

// ═══════════════════════════════════════════════════════════════
// STAFF COSTS SEED DATA (6 months, 2 staff)
// ═══════════════════════════════════════════════════════════════
export const SEED_STAFF_COSTS = [
  { month: 10, year: 2025, salary: 5500, commission: 1200, visa: 667, accommodation: 1500, overtime: 400, other: 150 },
  { month: 11, year: 2025, salary: 5500, commission: 1800, visa: 667, accommodation: 1500, overtime: 600, other: 180 },
  { month: 12, year: 2025, salary: 5500, commission: 2500, visa: 667, accommodation: 1500, overtime: 900, other: 220 },
  { month: 1, year: 2026, salary: 5500, commission: 2200, visa: 667, accommodation: 1500, overtime: 750, other: 200 },
  { month: 2, year: 2026, salary: 5500, commission: 1600, visa: 667, accommodation: 1500, overtime: 500, other: 170 },
  { month: 3, year: 2026, salary: 5500, commission: 1900, visa: 667, accommodation: 1500, overtime: 550, other: 160 },
];

// ═══════════════════════════════════════════════════════════════
// MARKETING SPEND SEED DATA (6 months, multiple channels)
// ═══════════════════════════════════════════════════════════════
export const SEED_MARKETING = [
  { month: 10, year: 2025, channel: 'Instagram', amount: 1200, notes: 'Launch campaign' },
  { month: 10, year: 2025, channel: 'In-Mall', amount: 2500, notes: 'Kiosk signage' },
  { month: 10, year: 2025, channel: 'Samples', amount: 800, notes: 'Product samples' },
  { month: 11, year: 2025, channel: 'Instagram', amount: 1500, notes: 'Festival campaign' },
  { month: 11, year: 2025, channel: 'In-Mall', amount: 2000, notes: 'Mall promotions' },
  { month: 11, year: 2025, channel: 'Influencer', amount: 1800, notes: 'Local influencers x3' },
  { month: 12, year: 2025, channel: 'Instagram', amount: 2200, notes: 'Holiday campaign' },
  { month: 12, year: 2025, channel: 'In-Mall', amount: 3500, notes: 'Festival of Lights' },
  { month: 12, year: 2025, channel: 'Influencer', amount: 2500, notes: 'Gift season reviews' },
  { month: 12, year: 2025, channel: 'Samples', amount: 1200, notes: 'Holiday samples' },
  { month: 1, year: 2026, channel: 'Instagram', amount: 1800, notes: 'New year campaign' },
  { month: 1, year: 2026, channel: 'In-Mall', amount: 2000, notes: 'Winter sale support' },
  { month: 2, year: 2026, channel: 'Instagram', amount: 1200, notes: 'Valentine campaign' },
  { month: 2, year: 2026, channel: 'In-Mall', amount: 1500, notes: 'Mall events' },
  { month: 3, year: 2026, channel: 'Instagram', amount: 1400, notes: 'Spring campaign' },
  { month: 3, year: 2026, channel: 'Influencer', amount: 1500, notes: 'Ramadan collection review' },
  { month: 3, year: 2026, channel: 'In-Mall', amount: 2000, notes: 'Ramadan decorations' },
];

// ═══════════════════════════════════════════════════════════════
// TRANSACTION SUMMARY SEED DATA (6 months)
// ═══════════════════════════════════════════════════════════════
export const SEED_TRANSACTIONS = [
  { month: 10, year: 2025, receiptCount: 185, totalRevenue: 31091 },
  { month: 11, year: 2025, receiptCount: 248, totalRevenue: 39534 },
  { month: 12, year: 2025, receiptCount: 312, totalRevenue: 41295 },
  { month: 1, year: 2026, receiptCount: 295, totalRevenue: 49499 },
  { month: 2, year: 2026, receiptCount: 238, totalRevenue: 42422 },
  { month: 3, year: 2026, receiptCount: 245, totalRevenue: 42861 },
];
