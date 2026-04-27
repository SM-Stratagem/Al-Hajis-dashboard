'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, useSyncExternalStore } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  LayoutDashboard, AlertTriangle, DollarSign, PieChartIcon, TrendingUp,
  CalendarDays, RotateCcw, CreditCard, BarChart3, Database, ChevronRight, ChevronDown,
  Activity, Target, Zap, Eye, Clock, ShoppingCart, ArrowUpRight, ArrowDownRight,
  CheckCircle2, XCircle, AlertCircle, Users, Package, BarChart2, Receipt,
  Store, Calculator, ClipboardList, ArrowRight, Upload, FileSpreadsheet, RefreshCw, Download,
  Megaphone, Gauge, Wallet, UserCheck, BadgeDollarSign, Timer, TrendingDown, Coins,
  Plug, Unplug, Radio, Cable, Settings, Info, Copy, Trash2, Plus, ToggleLeft, ToggleRight,
  BookOpen, ChevronLeft,
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════════
// BRANCH IMPORTS
// ══════════════════════════════════════════════════════════════════
import { BRANCHES, COUNTRIES, type BranchDef, type CountryDef, DEFAULT_BRANCH_SLUG, getBranchBySlug } from '@/lib/branches';

// ══════════════════════════════════════════════════════════════════
// DATA IMPORTS — all from @/lib/data, DO NOT recreate
// ══════════════════════════════════════════════════════════════════
import {
  MONTHS, MONTHS_FULL, GROSS, RETURNS, NET, CASH, CARD,
  DAILY, CAPEX_ITEMS, OVERHEADS,
  TOTAL_CAPEX, TOTAL_OVERHEADS, TOTAL_INVESTMENT,
  PNL, EST_MONTHLY_COSTS, FORECAST,
  totalGross, totalNet, totalReturns, totalCash, totalCard,
  avgMonthlyNet, capitalRecovered, avgReturnRate, cardShare,
  cumulativeNet, returnRates, momGrowth, cardPct,
} from '@/lib/data';

import {
  linearRegression, exponentialSmoothing, movingAverageForecast,
  seasonalIndices, detectAnomalies, confidenceInterval,
  revenueTrendAnalysis, productDemandScore,
} from '@/lib/predictive';

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════
const CURRENCY_SYMBOLS: Record<string, string> = {
  AED: 'AED',
  OMR: 'OMR',
  BHD: 'BHD',
};

const fmtCurrency = (n: number, currency: string = 'AED') => {
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  return `${sym} ${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const fmtCurrencyK = (n: number, currency: string = 'AED') => {
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  return `${sym} ${(n / 1000).toFixed(0)}K`;
};

// Backward-compatible aliases (used by existing components)
const aed = (n: number) => fmtCurrency(n, 'AED');
const aedK = (n: number) => fmtCurrencyK(n, 'AED');
// Currency-aware versions
const money = (n: number, cur: string = 'AED') => fmtCurrency(n, cur);
const moneyK = (n: number, cur: string = 'AED') => fmtCurrencyK(n, cur);
const pct = (n: number) => `${n.toFixed(1)}%`;
const serif = { fontFamily: 'Georgia, "Times New Roman", serif' };

const GOLD = '#c9a55a';
const GOLD_DIM = 'rgba(201,165,90,0.25)';
const ROSE = '#bf5f59';
const SAGE = '#58987a';
const AMBER = '#c4905a';
const STEEL = '#5578bf';
const BG = '#07070a';
const CARD_BG = '#0e0e13';
const BORDER = 'rgba(255,255,255,0.055)';
const T1 = '#ece8e1';
const T2 = '#8c8780';
const T3 = '#504d49';

// Tooltip style
const ttStyle = {
  backgroundColor: '#16161c',
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: '10px 14px',
  color: T1,
  fontSize: 11,
};

const AEDTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={ttStyle}>
      <div style={{ color: T2, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, fontWeight: 500 }}>
          {p.name}: {aed(p.value)}
        </div>
      ))}
    </div>
  );
};

const PctTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={ttStyle}>
      <div style={{ color: T2, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, fontWeight: 500 }}>
          {p.name}: {pct(p.value)}
        </div>
      ))}
    </div>
  );
};

const axisTick = { fontSize: 10, fill: T3 };
const axisLabel = { fontSize: 10, fill: T2 };

// Monthly combined data
const monthlyData = MONTHS.map((m, i) => ({
  month: m,
  fullMonth: MONTHS_FULL[i],
  gross: GROSS[i],
  returns: RETURNS[i],
  net: NET[i],
  cash: CASH[i],
  card: CARD[i],
  cumNet: cumulativeNet[i],
  returnRate: returnRates[i],
  growth: momGrowth[i],
  cardPct: cardPct[i],
}));

// CAPEX categories
const capexByCategory = (() => {
  const cats: Record<string, number> = {};
  CAPEX_ITEMS.forEach(item => {
    cats[item.category] = (cats[item.category] || 0) + item.amount;
  });
  return Object.entries(cats)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
})();

const catColors: Record<string, string> = {
  Lease: GOLD,
  'Fit-out': STEEL,
  Inventory: SAGE,
  Tech: AMBER,
  Legal: ROSE,
  Deposits: '#7a6fbf',
  People: '#bf5f8c',
  Other: T3,
};

// ══════════════════════════════════════════════════════════════════
// VIEW MODE (must be before useStoreData)
// ══════════════════════════════════════════════════════════════════
type ViewMode = { type: 'all' } | { type: 'country'; country: string; flag: string } | { type: 'city'; city: string; country: string; flag: string } | { type: 'branch'; slug: string };

function isAggregateView(view: ViewMode): boolean {
  return view.type === 'all' || view.type === 'country' || view.type === 'city';
}

// ══════════════════════════════════════════════════════════════════
// STORE DATA TYPE & HOOK
// ══════════════════════════════════════════════════════════════════
interface StoreData {
  months: string[];
  monthsFull: string[];
  gross: number[];
  returns: number[];
  net: number[];
  cash: number[];
  card: number[];
  daily: { startDay: number; values: number[] }[];
  capexItems: { name: string; amount: number; category: string; branchName?: string }[];
  overheads: { name: string; amount: number; branchName?: string }[];
  pnl: {
    period: string; revenue: number; cogsGoods: number; cogsAccessories: number;
    totalCogs: number; grossProfit: number; grossMargin: number;
    totalExpenses: number; netProfitLoss: number;
    expenses: { name: string; amount: number }[];
  };
  totalGross: number;
  totalNet: number;
  totalReturns: number;
  totalCash: number;
  totalCard: number;
  avgMonthlyNet: number;
  capitalRecovered: number;
  avgReturnRate: number;
  cardShare: number;
  cumulativeNet: number[];
  returnRates: number[];
  momGrowth: (number | null)[];
  cardPct: number[];
  totalCapex: number;
  totalOverheads: number;
  totalInvestment: number;
  monthlyData: {
    month: string; fullMonth: string; gross: number; returns: number;
    net: number; cash: number; card: number; cumNet: number;
    returnRate: number; growth: number | null; cardPct: number;
  }[];
  capexByCategory: { name: string; value: number }[];
  // Aggregate view fields
  isAggregate: boolean;
  branchCount: number;
  branchNames: string[];
  currency: string;
  branchComparison?: { branchId: string; branchName: string; totalNet: number; monthCount: number }[];
  // Data version counter — incremented on data mutations to trigger re-renders
  dataVersion: number;
}

const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MNF = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function deriveMetrics(gross: number[], returns: number[], net: number[], cash: number[], card: number[]) {
  const totalGross = gross.reduce((a, b) => a + b, 0);
  const totalNet = net.reduce((a, b) => a + b, 0);
  const totalReturns = returns.reduce((a, b) => a + b, 0);
  const totalCash = cash.reduce((a, b) => a + b, 0);
  const totalCard = card.reduce((a, b) => a + b, 0);
  const n = net.length || 1;
  const avgMonthlyNet = totalNet / n;
  const cumulativeNet = net.reduce((acc: number[], v) => { acc.push((acc[acc.length - 1] || 0) + v); return acc; }, []);
  const returnRates = gross.map((g, i) => +(returns[i] / g * 100).toFixed(2));
  const momGrowth: (number | null)[] = net.map((v, i) => i === 0 ? null : +(((v - net[i - 1]) / net[i - 1]) * 100).toFixed(1));
  const cardPct = card.map((c, i) => +(c / net[i] * 100).toFixed(1));
  return { totalGross, totalNet, totalReturns, totalCash, totalCard, avgMonthlyNet, cumulativeNet, returnRates, momGrowth, cardPct };
}

function buildMonthlyData(months: string[], monthsFull: string[], gross: number[], returns: number[], net: number[], cash: number[], card: number[], cumNet: number[], returnRates: number[], momGrowth: (number | null)[], cardPct: number[]) {
  return months.map((m, i) => ({ month: m, fullMonth: monthsFull[i], gross: gross[i], returns: returns[i], net: net[i], cash: cash[i], card: card[i], cumNet: cumNet[i], returnRate: returnRates[i], growth: momGrowth[i], cardPct: cardPct[i] }));
}

function buildCapexByCategory(items: { name: string; amount: number; category: string }[]) {
  const cats: Record<string, number> = {};
  items.forEach(item => { cats[item.category] = (cats[item.category] || 0) + item.amount; });
  return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function getCurrencyForView(view: ViewMode): string {
  if (view.type === 'branch') {
    const b = getBranchBySlug(view.slug);
    return b?.currency || 'AED';
  }
  if (view.type === 'country') {
    const country = COUNTRIES.find(c => c.name === view.country);
    return country?.currency || 'AED';
  }
  return 'AED'; // all → default AED
}

function useStoreData(view: ViewMode, dataVersion: number): { loading: boolean; hasData: boolean } & StoreData {
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(true);
  const isAgg = isAggregateView(view);
  const currency = getCurrencyForView(view);

  // Helper: fetch with timeout
  const fetchWithTimeout = async (url: string, timeout = 3000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (e: any) {
      clearTimeout(id);
      if (e.name === 'AbortError' || e.message === 'Request timeout') {
        return null;
      }
      throw e;
    }
  };

  const makeFallbackData = (slug: string): StoreData => {
    const branchName = getBranchBySlug(slug)?.name || slug;
    return {
      months: [...MONTHS], monthsFull: [...MONTHS_FULL],
      gross: [...GROSS], returns: [...RETURNS], net: [...NET], cash: [...CASH], card: [...CARD],
      daily: DAILY.map(d => ({ ...d })),
      capexItems: CAPEX_ITEMS.map(i => ({ ...i })),
      overheads: OVERHEADS.map(o => ({ ...o })),
      pnl: { ...PNL, expenses: PNL.expenses.map(e => ({ ...e })) },
      totalGross, totalNet, totalReturns, totalCash, totalCard,
      avgMonthlyNet, capitalRecovered, avgReturnRate, cardShare,
      cumulativeNet: [...cumulativeNet], returnRates: [...returnRates],
      momGrowth: [...momGrowth], cardPct: [...cardPct],
      totalCapex: TOTAL_CAPEX, totalOverheads: TOTAL_OVERHEADS, totalInvestment: TOTAL_INVESTMENT,
      monthlyData: monthlyData.map(d => ({ ...d })),
      capexByCategory: capexByCategory.map(c => ({ ...c })),
      isAggregate: false,
      branchCount: 1,
      branchNames: [branchName],
      currency,
      dataVersion,
    };
  };

  const [data, setData] = useState<StoreData>({
    months: [...MONTHS], monthsFull: [...MONTHS_FULL],
    gross: [...GROSS], returns: [...RETURNS], net: [...NET], cash: [...CASH], card: [...CARD],
    daily: DAILY.map(d => ({ ...d })),
    capexItems: CAPEX_ITEMS.map(i => ({ ...i })),
    overheads: OVERHEADS.map(o => ({ ...o })),
    pnl: { ...PNL, expenses: PNL.expenses.map(e => ({ ...e })) },
    totalGross, totalNet, totalReturns, totalCash, totalCard,
    avgMonthlyNet, capitalRecovered, avgReturnRate, cardShare,
    cumulativeNet: [...cumulativeNet], returnRates: [...returnRates],
    momGrowth: [...momGrowth], cardPct: [...cardPct],
    totalCapex: TOTAL_CAPEX, totalOverheads: TOTAL_OVERHEADS, totalInvestment: TOTAL_INVESTMENT,
    monthlyData: monthlyData.map(d => ({ ...d })),
    capexByCategory: capexByCategory.map(c => ({ ...c })),
    isAggregate: isAgg,
    branchCount: isAgg ? 0 : 1,
    branchNames: [],
    currency,
    dataVersion,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        if (isAggregateView(view)) {
          // ── Aggregate view: fetch from /api/data/aggregate ──
          const params = new URLSearchParams();
          if (view.type === 'country') {
            params.set('viewType', 'country');
            params.set('country', view.country);
          } else if (view.type === 'city') {
            params.set('viewType', 'city');
            params.set('country', view.country);
            params.set('city', view.city);
          } else {
            params.set('viewType', 'all');
          }

          const aggRes = await fetchWithTimeout(`/api/data/aggregate?${params}`).then(r => r?.json()).catch(() => null);
          if (aggRes && aggRes.monthlySales && aggRes.monthlySales.length > 0) {
            setHasData(true);
            const msRes = aggRes.monthlySales;
            const dailyRes = aggRes.dailySales || [];
            const capexRes = aggRes.capexItems || [];
            const ohRes = aggRes.overheads || [];
            const pnlRes = aggRes.pnl || [];

            const months = msRes.map((ms: any) => `${MN[ms.month - 1]} ${String(ms.year).slice(2)}`);
            const monthsFull = msRes.map((ms: any) => `${MNF[ms.month - 1]} ${ms.year}`);
            const gross = msRes.map((ms: any) => ms.gross);
            const returns = msRes.map((ms: any) => ms.returns);
            const net = msRes.map((ms: any) => ms.net);
            const cash = msRes.map((ms: any) => ms.cash);
            const card = msRes.map((ms: any) => ms.card);
            const d = deriveMetrics(gross, returns, net, cash, card);

            // Build daily data from aggregated daily sales
            let daily = DAILY.map(dd => ({ ...dd }));
            if (dailyRes.length > 0) {
              const grouped = new Map<string, any[]>();
              dailyRes.forEach((ds: any) => {
                const dateStr = ds.date;
                const parts = dateStr.split('-');
                const month = parseInt(parts[1]);
                const year = parseInt(parts[0]);
                const k = `${month}-${year}`;
                if (!grouped.has(k)) grouped.set(k, []);
                grouped.get(k)!.push({ ...ds, month, year });
              });
              daily = msRes.map((ms: any) => {
                const days = grouped.get(`${ms.month}-${ms.year}`) || [];
                return days.length > 0
                  ? { startDay: days[0].dayOfWeek, values: days.sort((a: any, b: any) => a.date.localeCompare(b.date)).map((dd: any) => dd.revenue) }
                  : { startDay: 0, values: [] };
              });
            }

            // P&L
            let pnl = { ...PNL, expenses: PNL.expenses.map(e => ({ ...e })) };
            if (pnlRes.length > 0) {
              const f = pnlRes[0];
              pnl = {
                period: f.period || `${monthsFull[0]} – ${monthsFull[monthsFull.length - 1]}`,
                revenue: f.revenue, cogsGoods: f.cogsGoods, cogsAccessories: f.cogsAccessories,
                totalCogs: f.totalCogs, grossProfit: f.grossProfit, grossMargin: f.grossMargin,
                totalExpenses: f.totalExpenses, netProfitLoss: f.netProfitLoss,
                expenses: (f.expenses || []).map((e: any) => ({ name: e.name, amount: e.amount })),
              };
            }

            const capexItems = capexRes.length > 0
              ? capexRes.map((c: any) => ({ name: c.branchName ? `${c.name} (${c.branchName.replace('Parfumix ', '')})` : c.name, amount: c.amount, category: c.category, branchName: c.branchName }))
              : [];
            const overheads = ohRes.length > 0
              ? ohRes.map((o: any) => ({ name: o.branchName ? `${o.name} (${o.branchName.replace('Parfumix ', '')})` : o.name, amount: o.amount, branchName: o.branchName }))
              : [];
            const totalCapex = capexItems.reduce((s: number, i: any) => s + i.amount, 0);
            const totalOverheads = overheads.reduce((s: number, o: any) => s + o.amount, 0);
            const totalInvestment = totalCapex + totalOverheads;
            const capitalRecovered = totalInvestment > 0 ? (d.totalNet / totalInvestment) * 100 : 0;
            const avgReturnRate = d.totalGross > 0 ? (d.totalReturns / d.totalGross) * 100 : 0;
            const cardShare = d.totalNet > 0 ? (d.totalCard / d.totalNet) * 100 : 0;

            setData({
              months, monthsFull, gross, returns, net, cash, card, daily,
              capexItems, overheads, pnl,
              ...d, capitalRecovered, avgReturnRate, cardShare,
              totalCapex, totalOverheads, totalInvestment,
              monthlyData: buildMonthlyData(months, monthsFull, gross, returns, net, cash, card, d.cumulativeNet, d.returnRates, d.momGrowth, d.cardPct),
              capexByCategory: buildCapexByCategory(capexItems),
              isAggregate: true,
              branchCount: aggRes.branchCount || 0,
              branchNames: aggRes.branchNames || [],
              currency,
              branchComparison: aggRes.branchComparison || [],
            });
          } else {
            // Aggregate view but no data in any matching branches
            setData(prev => ({ ...prev, isAggregate: true, branchCount: aggRes?.branchCount || 0, branchNames: aggRes?.branchNames || [], currency }));
            setHasData(false);
          }
          } else {
          // ── Single branch view: fetch from individual APIs ──
          const slug = view.slug;
          const qs = slug !== DEFAULT_BRANCH_SLUG ? `?branchSlug=${encodeURIComponent(slug)}` : '';
          const [msRes, dailyRes, capexRes, ohRes, pnlRes] = await Promise.all([
            fetchWithTimeout(`/api/data/monthly-sales${qs}`).then(r => r?.json()).catch(() => []),
            fetchWithTimeout(`/api/data/daily-sales${qs}`).then(r => r?.json()).catch(() => []),
            fetchWithTimeout(`/api/data/capex${qs}`).then(r => r?.json()).catch(() => []),
            fetchWithTimeout(`/api/data/overheads${qs}`).then(r => r?.json()).catch(() => []),
            fetchWithTimeout(`/api/data/pnl${qs}`).then(r => r?.json()).catch(() => []),
          ]);
          if (msRes && msRes.length > 0) {
            setHasData(true);
            const months = msRes.map((ms: any) => `${MN[ms.month - 1]} ${String(ms.year).slice(2)}`);
            const monthsFull = msRes.map((ms: any) => `${MNF[ms.month - 1]} ${ms.year}`);
            const gross = msRes.map((ms: any) => ms.gross);
            const returns = msRes.map((ms: any) => ms.returns);
            const net = msRes.map((ms: any) => ms.net);
            const cash = msRes.map((ms: any) => ms.cash);
            const card = msRes.map((ms: any) => ms.card);
            const d = deriveMetrics(gross, returns, net, cash, card);

            let daily = DAILY.map(dd => ({ ...dd }));
            if (dailyRes.length > 0) {
              const grouped = new Map<string, any[]>();
              dailyRes.forEach((ds: any) => { const k = `${ds.month}-${ds.year}`; if (!grouped.has(k)) grouped.set(k, []); grouped.get(k)!.push(ds); });
              daily = msRes.map((ms: any) => {
                const days = grouped.get(`${ms.month}-${ms.year}`) || [];
                return days.length > 0 ? { startDay: days[0].dayOfWeek, values: days.map((dd: any) => dd.revenue) } : { startDay: 0, values: [] };
              });
            }

            let pnl = { ...PNL, expenses: PNL.expenses.map(e => ({ ...e })) };
            if (pnlRes.length > 0) {
              const f = pnlRes[0];
              pnl = { period: f.period, revenue: f.revenue, cogsGoods: f.cogsGoods, cogsAccessories: f.cogsAccessories, totalCogs: f.totalCogs, grossProfit: f.grossProfit, grossMargin: f.grossMargin, totalExpenses: f.totalExpenses, netProfitLoss: f.netProfitLoss, expenses: (f.expenses || []).map((e: any) => ({ name: e.name, amount: e.amount })) };
            }

            const capexItems = capexRes.length > 0 ? capexRes.map((c: any) => ({ name: c.name, amount: c.amount, category: c.category })) : CAPEX_ITEMS.map(i => ({ ...i }));
            const overheads = ohRes.length > 0 ? ohRes.map((o: any) => ({ name: o.name, amount: o.amount })) : OVERHEADS.map(o => ({ ...o }));
            const totalCapex = capexItems.reduce((s: number, i: any) => s + i.amount, 0);
            const totalOverheads = overheads.reduce((s: number, o: any) => s + o.amount, 0);
            const totalInvestment = totalCapex + totalOverheads;
            const capitalRecovered = (d.totalNet / totalInvestment) * 100;
            const avgReturnRate = (d.totalReturns / d.totalGross) * 100;
            const cardShare = (d.totalCard / d.totalNet) * 100;

            setData({
              months, monthsFull, gross, returns, net, cash, card, daily,
              capexItems, overheads, pnl,
              ...d, capitalRecovered, avgReturnRate, cardShare,
              totalCapex, totalOverheads, totalInvestment,
              monthlyData: buildMonthlyData(months, monthsFull, gross, returns, net, cash, card, d.cumulativeNet, d.returnRates, d.momGrowth, d.cardPct),
              capexByCategory: buildCapexByCategory(capexItems),
              isAggregate: false,
              branchCount: 1,
              branchNames: [getBranchBySlug(slug)?.name || slug],
              currency,
            });
          } else if (slug === DEFAULT_BRANCH_SLUG) {
            // Keep the dashboard usable if the production DB is empty or unreachable.
            setData(makeFallbackData(slug));
            setHasData(true);
          } else {
            setHasData(false);
          }
        }
      } catch (e) { console.error('Failed to fetch store data:', e); }
      finally { setLoading(false); }
    }
    fetchData();
  }, [view, currency, dataVersion]);

  return { loading, hasData, ...data };
}

// ══════════════════════════════════════════════════════════════════
// BRANCH VIEW MODE — localStorage persistence
// ══════════════════════════════════════════════════════════════════
const BRANCH_LS_KEY = 'parfumix:selectedView';

function loadViewMode(): ViewMode {
  if (typeof window === 'undefined') return { type: 'branch', slug: DEFAULT_BRANCH_SLUG };
  try {
    const stored = localStorage.getItem(BRANCH_LS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.type === 'branch' && parsed.slug) return parsed;
      if (parsed.type === 'all') return { type: 'all' };
      if (parsed.type === 'country') return parsed;
      if (parsed.type === 'city') return parsed;
    }
  } catch {}
  return { type: 'branch', slug: DEFAULT_BRANCH_SLUG };
}

function saveViewMode(view: ViewMode) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BRANCH_LS_KEY, JSON.stringify(view));
    window.dispatchEvent(new Event('parfumix:view-change'));
  } catch {}
}

function getViewLabel(view: ViewMode): string {
  switch (view.type) {
    case 'all': return '🌍 All Branches';
    case 'country': return `${view.flag} ${view.country} — All`;
    case 'city': return `${view.flag} ${view.city} — All`;
    case 'branch': {
      const b = getBranchBySlug(view.slug);
      return b ? b.name : 'Select Branch';
    }
  }
}

function getViewSubLabel(view: ViewMode): string {
  switch (view.type) {
    case 'all': return `${BRANCHES.length} branches across 3 countries`;
    case 'country': {
      const count = BRANCHES.filter(b => b.country === view.country).length;
      return `${count} branch${count !== 1 ? 'es' : ''}`;
    }
    case 'city': {
      const count = BRANCHES.filter(b => b.city === view.city).length;
      return `${count} branch${count !== 1 ? 'es' : ''} in ${view.city}`;
    }
    case 'branch': {
      const b = getBranchBySlug(view.slug);
      return b ? `${b.flag} ${b.city}, ${b.country}` : '';
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// KPI CARD
// ══════════════════════════════════════════════════════════════════
function KpiCard({
  label, value, sub, badge, badgeColor, large,
}: {
  label: string; value: string; sub?: string;
  badge?: string; badgeColor?: string; large?: boolean;
}) {
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: large ? 24 : 16 }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: T3, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ ...(large ? { fontSize: 28 } : { fontSize: 20 }), fontFamily: 'Georgia, serif', color: T1, lineHeight: 1.1, marginBottom: sub || badge ? 6 : 0 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: T3 }}>{sub}</div>}
      {badge && (
        <span style={{
          display: 'inline-block', marginTop: 6, padding: '2px 8px', borderRadius: 999,
          fontSize: 9, fontWeight: 600, background: `${badgeColor || GOLD}22`, color: badgeColor || GOLD,
        }}>
          {badge}
        </span>
      )}
    </div>
  );
}

// Chart card wrapper
function ChartCard({ title, children, wide }: { title?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{
      background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10,
      padding: 20, ...(wide ? { gridColumn: '1 / -1' } : {}),
    }}>
      {title && (
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: T2, marginBottom: 16 }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// NAVIGATION CONFIG
// ══════════════════════════════════════════════════════════════════
type PageId = 'dashboard' | 'alerts' | 'pnl' | 'capex' | 'payback' | 'breakeven' | 'revenue' | 'heatmap' | 'weekly' | 'returns' | 'payments' | 'supply-chain' | 'forecast' | 'simulator' | 'gaps' | 'products' | 'staff' | 'marketing' | 'daily-ops' | 'cash-flow' | 'customers' | 'integrations' | 'data-center';

const navSections = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard' as PageId, label: 'Dashboard', icon: LayoutDashboard },
      { id: 'alerts' as PageId, label: 'Alerts', icon: AlertTriangle, badge: '__ALERT_COUNT__' },
    ],
  },
  {
    title: 'Unit Economics',
    items: [
      { id: 'pnl' as PageId, label: 'P&L Model', icon: DollarSign },
      { id: 'capex' as PageId, label: 'CAPEX Breakdown', icon: PieChartIcon },
      { id: 'payback' as PageId, label: 'Payback Analysis', icon: Target },
      { id: 'breakeven' as PageId, label: 'Breakeven', icon: Calculator },
    ],
  },
  {
    title: 'Sales',
    items: [
      { id: 'revenue' as PageId, label: 'Revenue Trends', icon: TrendingUp },
      { id: 'heatmap' as PageId, label: 'Daily Heatmap', icon: CalendarDays },
      { id: 'weekly' as PageId, label: 'Weekly', icon: BarChart2 },
    ],
  },
  {
    title: 'Operations',
    items: [
      { id: 'daily-ops' as PageId, label: 'Daily Operations', icon: Gauge },
      { id: 'returns' as PageId, label: 'Returns', icon: RotateCcw },
      { id: 'payments' as PageId, label: 'Payment Mix', icon: CreditCard },
      { id: 'supply-chain' as PageId, label: 'Supply Chain', icon: ShoppingCart, badge: 'AI' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { id: 'products' as PageId, label: 'Product Analytics', icon: Package },
      { id: 'staff' as PageId, label: 'Staff Productivity', icon: Users },
      { id: 'marketing' as PageId, label: 'Marketing ROI', icon: Megaphone },
      { id: 'customers' as PageId, label: 'Customer Insights', icon: UserCheck },
    ],
  },
  {
    title: 'Strategy',
    items: [
      { id: 'forecast' as PageId, label: 'Forecast', icon: BarChart3 },
      { id: 'simulator' as PageId, label: 'What-If', icon: Zap },
      { id: 'cash-flow' as PageId, label: 'Cash Flow', icon: Wallet },
      { id: 'gaps' as PageId, label: 'Data Gaps', icon: Database },
    ],
  },
  {
    title: 'System',
    items: [
      { id: 'integrations' as PageId, label: 'Integrations', icon: Plug, badge: 'API' },
      { id: 'data-center' as PageId, label: 'Data Center', icon: Upload, badge: 'NEW' },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════
// BRANCH SELECTOR BAR
// ══════════════════════════════════════════════════════════════════
function BranchSelectorBar({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const label = getViewLabel(view);
  const subLabel = getViewSubLabel(view);
  const isAggregate = isAggregateView(view);

  // For non-ADCB individual branches, show index
  const branchIndex = view.type === 'branch' ? BRANCHES.findIndex(b => b.slug === view.slug) + 1 : null;

  return (
    <div style={{
      width: '100%', background: CARD_BG,
      borderBottom: `1px solid ${BORDER}`,
      position: 'relative', zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1600, margin: '0 auto',
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '8px 20px', height: 44,
      }}>
        {/* Brand */}
        <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: GOLD, fontSize: 16, letterSpacing: '0.02em', flexShrink: 0 }}>
          parf&uuml;mix
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: BORDER, flexShrink: 0 }} />

        {/* Selector trigger */}
        <button onClick={() => setOpen(!open)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 12px', borderRadius: 6,
          background: isAggregate ? `${GOLD}15` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isAggregate ? `${GOLD}33` : BORDER}`,
          color: isAggregate ? GOLD : T1, fontSize: 11, cursor: 'pointer',
          fontFamily: 'inherit', transition: 'all 0.15s', flexShrink: 0,
        }}>
          {label}
          <ChevronDown size={12} style={{ opacity: 0.6, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </button>

        {/* Current branch name pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 6,
          background: 'rgba(201,165,90,0.06)',
          border: `1px solid rgba(201,165,90,0.1)`,
          fontSize: 10, color: T2, flexShrink: 0,
        }}>
          <span style={{ color: T3 }}>{subLabel}</span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Right info */}
        <div style={{ fontSize: 9, color: T3, flexShrink: 0 }}>
          {view.type === 'branch' && branchIndex ? `${branchIndex} of ${BRANCHES.length} branches` : `Viewing ${view.type === 'all' ? 'all' : view.type}`}
        </div>

        {/* Aggregate badge */}
        {isAggregate && (
          <span style={{
            padding: '2px 8px', borderRadius: 4, fontSize: 8, fontWeight: 600,
            background: `${GOLD}22`, color: GOLD, letterSpacing: '0.06em', flexShrink: 0,
          }}>
            AGGREGATE
          </span>
        )}
      </div>

      {/* Dropdown panel */}
      {open && (
        <div ref={panelRef} style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: '#0c0c10',
          borderBottom: `1px solid ${BORDER}`,
          borderTop: `1px solid rgba(201,165,90,0.15)`,
          maxHeight: 'calc(100vh - 44px)', overflowY: 'auto',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          zIndex: 200,
        }}>
          <div style={{ maxWidth: 1600, margin: '0 auto', padding: '12px 20px 16px' }}>
            {/* Global view */}
            <button onClick={() => { onChange({ type: 'all' }); setOpen(false); }} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 14px', borderRadius: 8, border: 'none',
              background: view.type === 'all' ? `${GOLD}15` : 'transparent',
              color: view.type === 'all' ? GOLD : T1, fontSize: 12, cursor: 'pointer',
              fontFamily: 'inherit', marginBottom: 4, textAlign: 'left',
            }}>
              <span style={{ width: 20, textAlign: 'center', fontSize: 14 }}>🌍</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>All Branches</div>
                <div style={{ fontSize: 9, color: T3, marginTop: 1 }}>{BRANCHES.length} branches — overall dashboard</div>
              </div>
              {view.type === 'all' && <span style={{ fontSize: 9, color: GOLD }}>Active</span>}
            </button>

            <div style={{ height: 1, background: BORDER, margin: '8px 0 12px' }} />

            {/* Countries */}
            {COUNTRIES.map(country => (
              <div key={country.name} style={{ marginBottom: 12 }}>
                {/* Country header */}
                <button onClick={() => { onChange({ type: 'country', country: country.name, flag: country.flag }); setOpen(false); }} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '8px 14px', borderRadius: 8, border: 'none',
                  background: (view.type === 'country' && view.country === country.name) ? `${GOLD}15` : 'transparent',
                  color: (view.type === 'country' && view.country === country.name) ? GOLD : T1,
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', marginBottom: 2,
                }}>
                  <span style={{ width: 20, textAlign: 'center', fontSize: 14 }}>{country.flag}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{country.name}</div>
                    <div style={{ fontSize: 9, color: T3, marginTop: 1 }}>{country.cities.reduce((s, c) => s + c.branches.length, 0)} branches &middot; {country.cities.length} {country.cities.length > 1 ? 'cities' : 'city'}</div>
                  </div>
                  <ChevronRight size={12} style={{ color: T3 }} />
                </button>

                {/* Cities within country */}
                <div style={{ paddingLeft: 34 }}>
                  {country.cities.map(city => (
                    <div key={city.name}>
                      {/* City header (only show if country has multiple cities) */}
                      {country.cities.length > 1 && (
                        <button onClick={() => { onChange({ type: 'city', city: city.name, country: country.name, flag: country.flag }); setOpen(false); }} style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                          padding: '6px 10px', borderRadius: 6, border: 'none',
                          background: (view.type === 'city' && view.city === city.name) ? `${GOLD}15` : 'transparent',
                          color: (view.type === 'city' && view.city === city.name) ? GOLD : T2,
                          fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', marginBottom: 2,
                        }}>
                          <span style={{ fontWeight: 500 }}>{city.name}</span>
                          <span style={{ fontSize: 9, color: T3 }}>({city.branches.length})</span>
                        </button>
                      )}

                      {/* Branches within city */}
                      <div style={{ paddingLeft: country.cities.length > 1 ? 8 : 0 }}>
                        {city.branches.map(branch => {
                          const isActive = view.type === 'branch' && view.slug === branch.slug;
                          return (
                            <button key={branch.slug} onClick={() => { onChange({ type: 'branch', slug: branch.slug }); setOpen(false); }} style={{
                              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                              padding: '5px 10px', borderRadius: 6, border: 'none',
                              background: isActive ? `${GOLD}15` : 'transparent',
                              color: isActive ? GOLD : T2, fontSize: 10, cursor: 'pointer',
                              fontFamily: 'inherit', textAlign: 'left', marginBottom: 1,
                            }}>
                              <span style={{ width: 4, height: 4, borderRadius: '50%', background: isActive ? GOLD : T3, flexShrink: 0 }} />
                              <span style={{ flex: 1 }}>{branch.name}</span>
                              {branch.slug === 'adcb' && (
                                <span style={{ padding: '1px 5px', borderRadius: 3, fontSize: 7, fontWeight: 700, background: `${SAGE}18`, color: SAGE, letterSpacing: '0.04em' }}>LIVE</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ height: 1, background: BORDER, margin: '8px 0 8px' }} />
            <div style={{ padding: '4px 14px', fontSize: 8, color: T3 }}>
              {BRANCHES.length} branches &middot; UAE {BRANCHES.filter(b => b.country === 'UAE').length} &middot; Oman {BRANCHES.filter(b => b.country === 'Oman').length} &middot; Bahrain {BRANCHES.filter(b => b.country === 'Bahrain').length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// NO DATA PLACEHOLDER
// ══════════════════════════════════════════════════════════════════
function NoDataPage({ view }: { view: ViewMode }) {
  const label = getViewLabel(view);
  const isAgg = isAggregateView(view);
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 500, textAlign: 'center', padding: 40,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(201,165,90,0.08)', border: `1px solid rgba(201,165,90,0.15)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
      }}>
        <Database size={24} style={{ color: GOLD, opacity: 0.6 }} />
      </div>
      <h2 style={{ fontSize: 16, color: T1, marginBottom: 8, fontWeight: 500 }}>No Data Available</h2>
      <p style={{ fontSize: 12, color: T2, maxWidth: 400, lineHeight: 1.7, marginBottom: 16 }}>
        {isAgg
          ? `None of the ${label.includes('All Branches') ? '20 branches' : 'matching branches'} have data loaded yet. Seed data for individual branches first.`
          : `Data for this branch has not been loaded yet. Use the Data Center to seed or upload data.`
        }
      </p>
      <div style={{
        padding: '8px 16px', borderRadius: 6,
        background: 'rgba(201,165,90,0.08)', border: `1px solid rgba(201,165,90,0.15)`,
        fontSize: 10, color: GOLD,
      }}>
        {isAgg ? 'Select a branch → Data Center → Load Existing Data' : 'Go to Data Center → Load Existing Data'}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ALERT COUNT COMPUTATION (mirrors AlertsPage logic for sidebar badge)
// ══════════════════════════════════════════════════════════════════
function computeAlertCount(data: StoreData): number {
  const { totalInvestment: TOTAL_INVESTMENT, avgMonthlyNet, pnl: PNL, capexItems: CAPEX_ITEMS, returns: RETURNS, net: NET } = data;
  let count = 0;
  const paybackMonths73 = Math.ceil(TOTAL_INVESTMENT / (avgMonthlyNet * (PNL.grossMargin / 100)));
  if (paybackMonths73 > 24) count++;
  if (CAPEX_ITEMS.length > 0 && TOTAL_INVESTMENT > 0) {
    const keyMoneyPct = (CAPEX_ITEMS[0].amount / TOTAL_INVESTMENT) * 100;
    if (keyMoneyPct > 20) count++;
  }
  const returnAnomalies = detectAnomalies(RETURNS, 1.5);
  const revenueAnomalies = detectAnomalies(NET, 1.5);
  const trend = revenueTrendAnalysis(NET);
  if (returnAnomalies.anomalies.find(a => a.type === 'spike')) count++;
  if (revenueAnomalies.anomalies.find(a => a.type === 'spike')) count++;
  if (revenueAnomalies.anomalies.find(a => a.type === 'dip')) count++;
  if (trend.trend === 'growth' || trend.trend === 'strong_growth') count++;
  else if (trend.trend === 'decline' || trend.trend === 'strong_decline') count++;
  count++; // card loyalty alert
  return count;
}

// ══════════════════════════════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════════════════════════════
function Sidebar({ active, onChange, branchLabel, alertCount }: { active: PageId; onChange: (p: PageId) => void; branchLabel: string; alertCount?: number }) {
  return (
    <aside style={{
      width: 220, minHeight: '100vh', position: 'sticky', top: 0,
      background: CARD_BG, borderRight: `1px solid ${BORDER}`,
      padding: '24px 0', display: 'flex', flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ padding: '0 20px 24px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: GOLD, fontSize: 20, marginBottom: 2 }}>
          parf&uuml;mix
        </div>
        <div style={{ fontSize: 9, color: T3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          branch intelligence
        </div>
      </div>

      {/* Branch pill */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{
          display: 'inline-block', padding: '4px 10px', borderRadius: 6,
          background: 'rgba(201,165,90,0.08)', fontSize: 9, color: GOLD,
          maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {branchLabel}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
        {navSections.map(section => (
          <div key={section.title} style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.14em',
              color: T3, padding: '0 20px', marginBottom: 6,
            }}>
              {section.title}
            </div>
            {section.items.map(item => {
              const isActive = active === item.id;
              return (
                <button key={item.id} onClick={() => onChange(item.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '7px 20px', border: 'none',
                  background: isActive ? 'rgba(201,165,90,0.08)' : 'transparent',
                  color: isActive ? GOLD : T2, fontSize: 11, cursor: 'pointer',
                  transition: 'all 0.15s', textAlign: 'left', fontFamily: 'inherit',
                }}>
                  <item.icon size={13} style={{ opacity: 0.7 }} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span style={{
                      background: item.badge === '__ALERT_COUNT__' && alertCount === 0 ? 'rgba(88,152,122,0.3)' : ROSE,
                      color: item.badge === '__ALERT_COUNT__' && alertCount === 0 ? SAGE : '#fff',
                      fontSize: 8, fontWeight: 700,
                      padding: '1px 6px', borderRadius: 999, lineHeight: '16px',
                    }}>
                      {item.badge === '__ALERT_COUNT__' ? alertCount : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: SAGE,
            display: 'inline-block', boxShadow: '0 0 6px rgba(88,152,122,0.5)',
          }} />
          <span style={{ fontSize: 9, color: T3 }}>Real branch data</span>
        </div>
        <div style={{ fontSize: 8, color: T3 }}>
          Oct 2025 &ndash; Mar 2026 &middot; P&L verified
        </div>
      </div>
    </aside>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE 1: DASHBOARD
// ══════════════════════════════════════════════════════════════════
function DashboardPage({ data }: { data: StoreData }) {
  const { months: MONTHS, monthsFull: MONTHS_FULL, net: NET, capexItems: CAPEX_ITEMS, totalInvestment: TOTAL_INVESTMENT, totalNet, avgMonthlyNet, capitalRecovered, totalReturns, avgReturnRate, cardShare, totalCard, totalCash, monthlyData, isAggregate, branchCount, branchNames, currency: cur, branchComparison } = data;
  const m = (n: number) => money(n, cur);
  const mK = (n: number) => moneyK(n, cur);
  const bestMonthIdx = NET.length > 0 ? NET.indexOf(Math.max(...NET)) : 0;
  const keyMoneyBurden = CAPEX_ITEMS.length > 0 && TOTAL_INVESTMENT > 0 ? ((CAPEX_ITEMS[0].amount / TOTAL_INVESTMENT) * 100).toFixed(1) : '—';
  const lastMonth = MONTHS.length > 0 ? MONTHS[MONTHS.length - 1] : '—';
  const firstMonth = MONTHS.length > 0 ? MONTHS[0] : '—';

  return (
    <div>
      {/* Aggregate banner */}
      {isAggregate && branchCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
          padding: '10px 16px', borderRadius: 8,
          background: 'rgba(201,165,90,0.06)', border: '1px solid rgba(201,165,90,0.12)',
        }}>
          <Store size={14} style={{ color: GOLD }} />
          <div>
            <div style={{ fontSize: 10, color: T1, fontWeight: 500 }}>
              {branchCount} {branchCount === 1 ? 'branch' : 'branches'} with data
            </div>
            <div style={{ fontSize: 9, color: T3, marginTop: 2 }}>
              {branchNames.slice(0, 5).join(' · ')}{branchNames.length > 5 ? ` +${branchNames.length - 5} more` : ''}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 9, color: GOLD, padding: '2px 8px', borderRadius: 4, background: `${GOLD}15` }}>
            AGGREGATE
          </div>
        </div>
      )}

      {/* Row 1: 4 KPI */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <KpiCard label={isAggregate ? "Total Investment" : "Total Investment"} value={m(TOTAL_INVESTMENT)} sub={isAggregate ? `Sum across ${branchCount} branches` : "CAPEX + Overheads"} badge="All-in" badgeColor={GOLD} />
        <KpiCard label={isAggregate ? "Total Net Revenue" : `${MONTHS.length}-Month Net Revenue`} value={m(totalNet)} sub={`${firstMonth} – ${lastMonth}`} badge="Net of returns" badgeColor={SAGE} />
        <KpiCard label="Avg Monthly Net" value={m(Math.round(avgMonthlyNet))} sub={isAggregate ? `Per month across branches` : `${MONTHS.length}-month average`} />
        <KpiCard label="Capital Recovered" value={pct(capitalRecovered)} sub={TOTAL_INVESTMENT > 0 ? `${m(totalNet)} of ${m(TOTAL_INVESTMENT)}` : '—'} badge={`${Math.round(capitalRecovered)}%`} badgeColor={capitalRecovered > 40 ? SAGE : AMBER} />
      </div>

      {/* Row 2: 4 KPI */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <KpiCard label="Total Returns" value={m(totalReturns)} sub={`Avg rate: ${pct(avgReturnRate)}`} badge={pct(avgReturnRate)} badgeColor={ROSE} />
        <KpiCard label="Best Month" value={NET.length > 0 ? m(NET[bestMonthIdx]) : '—'} sub={MONTHS_FULL[bestMonthIdx] || '—'} badge="Peak" badgeColor={SAGE} />
        <KpiCard label="Card Revenue Share" value={pct(cardShare)} sub={`${m(totalCard)} card / ${m(totalCash)} cash`} badge={cardShare > 70 ? '70%+' : ''} badgeColor={STEEL} />
        <KpiCard label="Key Money Burden" value={keyMoneyBurden !== '—' ? `${keyMoneyBurden}%` : '—'} sub={CAPEX_ITEMS.length > 0 ? m(CAPEX_ITEMS[0].amount) : 'No CAPEX data'} badge="Sunk cost" badgeColor={ROSE} />
      </div>

      {/* Revenue vs Investment Recovery */}
      <ChartCard title="Revenue vs Investment Recovery" wide className="mb-3">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={axisTick} />
            <YAxis yAxisId="left" tick={axisTick} tickFormatter={v => mK(v)} />
            <YAxis yAxisId="right" orientation="right" tick={axisTick} domain={[0, 'auto']} tickFormatter={v => pct(v)} />
            <Tooltip content={<AEDTooltip />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: T2 }} />
            <Bar yAxisId="left" dataKey="net" name="Net Revenue" fill={GOLD} radius={[4, 4, 0, 0]} barSize={32} />
            <Line yAxisId="left" dataKey="cumNet" name="Cumulative" stroke={SAGE} strokeWidth={2} dot={{ r: 3, fill: SAGE }} />
            <Line yAxisId="right" dataKey="cardPct" name="Card %" stroke={STEEL} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Row 3: 3 small charts */}
      <div className="grid grid-cols-3 gap-3">
        {/* Monthly Net Revenue */}
        <ChartCard title="Monthly Net Revenue">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={axisTick} fontSize={8} />
              <YAxis tick={axisTick} tickFormatter={v => mK(v)} fontSize={8} />
              <Tooltip content={<AEDTooltip />} />
              <Bar dataKey="net" name="Net" fill={GOLD} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Return Rate Trend */}
        <ChartCard title="Return Rate Trend">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={axisTick} fontSize={8} />
              <YAxis tick={axisTick} tickFormatter={v => pct(v)} fontSize={8} domain={[0, 'auto']} />
              <Tooltip content={<PctTooltip />} />
              <Line dataKey="returnRate" name="Return %" stroke={ROSE} strokeWidth={2} dot={{ r: 3, fill: ROSE }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Payment Split Donut */}
        <ChartCard title="Payment Split">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Card', value: totalCard },
                  { name: 'Cash', value: totalCash },
                ]}
                cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                dataKey="value" stroke="none"
              >
                <Cell fill={STEEL} />
                <Cell fill={AMBER} />
              </Pie>
              <Tooltip formatter={(v: number) => m(v)} contentStyle={ttStyle} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 9, color: T2 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Branch Comparison (aggregate views only) */}
      {isAggregate && (branchComparison || []).length > 0 && (
        <div style={{ marginTop: 12 }}>
          <ChartCard title="Revenue by Branch" wide>
            <div style={{ fontSize: 9, color: T3, marginBottom: 12 }}>
              Net revenue comparison across {branchCount} {branchCount === 1 ? 'branch' : 'branches'} with data
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(() => {
                const maxBranchNet = Math.max(...(branchComparison || []).map(b => b.totalNet), 1);
                const colors = [GOLD, SAGE, STEEL, AMBER, ROSE, '#7a6fbf', '#bf5f8c', '#5f8cbf', '#8cbf5f', '#bf8c5f'];
                return (branchComparison || []).map((b, i) => {
                  const pctWidth = (b.totalNet / maxBranchNet) * 100;
                  const sharePct = totalNet > 0 ? ((b.totalNet / totalNet) * 100).toFixed(1) : '0';
                  return (
                    <div key={b.branchId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 160, fontSize: 9, color: T2, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.branchName.replace('Parfumix ', '')}
                      </div>
                      <div style={{ flex: 1, height: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          width: `${pctWidth}%`, height: '100%',
                          background: `linear-gradient(90deg, ${colors[i % colors.length]}55, ${colors[i % colors.length]}25)`,
                          borderRadius: 4, transition: 'width 0.5s ease',
                          display: 'flex', alignItems: 'center', padding: '0 8px',
                        }}>
                          <span style={{ fontSize: 8, color: T1, fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {m(b.totalNet)}
                          </span>
                        </div>
                      </div>
                      <div style={{ width: 55, fontSize: 9, color: T3, textAlign: 'right' }}>
                        {sharePct}%
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE 2: ALERTS
// ══════════════════════════════════════════════════════════════════
function AlertsPage({ data }: { data: StoreData }) {
  const { totalInvestment: TOTAL_INVESTMENT, avgMonthlyNet, pnl: PNL, capexItems: CAPEX_ITEMS, returns: RETURNS, returnRates, net: NET, momGrowth, cardShare, months: MONTHS } = data;
  const paybackMonths73 = Math.ceil(TOTAL_INVESTMENT / (avgMonthlyNet * (PNL.grossMargin / 100)));
  const paybackMonths62 = Math.ceil(TOTAL_INVESTMENT / (avgMonthlyNet * 0.62));

  // ── Real Predictive Alerts ──
  const revenueAnomalies = detectAnomalies(NET, 1.5);
  const returnAnomalies = detectAnomalies(RETURNS, 1.5);
  const trend = revenueTrendAnalysis(NET);
  const reg = linearRegression(NET);

  const alerts: { severity: 'red' | 'gold' | 'green'; title: string; body: string; icon: any; predictive?: boolean }[] = [];

  // Payback check (only if > 24 months)
  if (paybackMonths73 > 24) {
    alerts.push({
      severity: 'red' as const,
      title: 'Capital Payback Timeline Exceeds 24 Months',
      body: `At ${PNL.grossMargin}% gross margin, payback requires ~${paybackMonths73} months (${(paybackMonths73 / 12).toFixed(1)} years). At 62% margin, it extends to ~${paybackMonths62} months. The key money of ${aed(CAPEX_ITEMS.length > 0 ? CAPEX_ITEMS[0].amount : 0)} significantly inflates the capital base.`,
      icon: Clock,
    });
  }

  // Key money check
  if (CAPEX_ITEMS.length > 0 && TOTAL_INVESTMENT > 0) {
    const keyMoneyPct = ((CAPEX_ITEMS[0].amount / TOTAL_INVESTMENT) * 100).toFixed(1);
    if (parseFloat(keyMoneyPct) > 20) {
      alerts.push({
        severity: parseFloat(keyMoneyPct) > 35 ? 'red' as const : 'gold' as const,
        title: `Key Money is ${keyMoneyPct}% Sunk Cost`,
        body: `${aed(CAPEX_ITEMS[0].amount)} of the ${aed(TOTAL_INVESTMENT)} total investment is non-recoverable key money. This is the single largest risk factor and has zero residual value.`,
        icon: AlertTriangle,
      });
    }
  }

  // Add dynamic anomaly alerts
  const maxReturnAnomaly = returnAnomalies.anomalies.find(a => a.type === 'spike');
  if (maxReturnAnomaly) {
    const monthLabel = MONTHS[maxReturnAnomaly.index] || `Month ${maxReturnAnomaly.index + 1}`;
    alerts.push({
      severity: 'gold' as const,
      title: `Returns Spike in ${monthLabel} (${pct(maxReturnAnomaly.zScore)}σ above average)`,
      body: `Returns of ${aed(maxReturnAnomaly.value)} detected as anomalous (${maxReturnAnomaly.zScore} standard deviations above mean of ${aed(returnAnomalies.mean)}). Peak sales months may attract gifting-related impulse purchases being returned.`,
      icon: RotateCcw,
      predictive: true,
    });
  }

  // Add revenue spike alerts
  const revenueSpike = revenueAnomalies.anomalies.find(a => a.type === 'spike');
  if (revenueSpike) {
    const monthLabel = MONTHS[revenueSpike.index] || `Month ${revenueSpike.index + 1}`;
    alerts.push({
      severity: 'green' as const,
      title: `Revenue Peak in ${monthLabel} (${revenueSpike.zScore}σ above average)`,
      body: `Net revenue of ${aed(revenueSpike.value)} is significantly above the ${aed(revenueAnomalies.mean)} average. Investigate drivers — potential for replication at other branches.`,
      icon: TrendingUp,
      predictive: true,
    });
  }

  // Add revenue dip alerts
  const revenueDip = revenueAnomalies.anomalies.find(a => a.type === 'dip');
  if (revenueDip) {
    const monthLabel = MONTHS[revenueDip.index] || `Month ${revenueDip.index + 1}`;
    alerts.push({
      severity: 'gold' as const,
      title: `Revenue Dip in ${monthLabel} (${revenueDip.zScore}σ below average)`,
      body: `Net revenue of ${aed(revenueDip.value)} is below normal range. May indicate seasonal slowdown, staffing issues, or mall foot traffic decline.`,
      icon: TrendingUp,
      predictive: true,
    });
  }

  // Add trend-based alert
  if (trend.trend === 'strong_growth' || trend.trend === 'growth') {
    alerts.push({
      severity: 'green' as const,
      title: `Revenue Trend: ${trend.trend === 'strong_growth' ? 'Strong' : 'Positive'} Growth (${trend.momentum > 0 ? '+' : ''}${trend.momentum.toFixed(0)}% momentum)`,
      body: `CAGR: ${trend.cagr > 0 ? '+' : ''}${trend.cagr}%. Next month estimate: ${aed(trend.nextMonthEstimate)} (range: ${aed(trend.nextMonthRange.low)}–${aed(trend.nextMonthRange.high)}). Regression R²=${reg.r2.toFixed(2)}.`,
      icon: Activity,
      predictive: true,
    });
  } else if (trend.trend === 'decline' || trend.trend === 'strong_decline') {
    alerts.push({
      severity: 'red' as const,
      title: `Revenue Declining (${trend.momentum.toFixed(0)}% momentum)`,
      body: `CAGR: ${trend.cagr}%. Momentum is negative. Volatility: ${trend.volatility.toFixed(1)}%. Consider cost optimization and marketing boost.`,
      icon: Activity,
      predictive: true,
    });
  }

  // Add card loyalty alert
  alerts.push({
    severity: 'green' as const,
    title: 'Card Payment Loyalty Potential',
    body: `${pct(cardShare)} of revenue comes via card payments — strong indicator of repeat customers. A loyalty programme integrated with card transactions could significantly boost retention and basket size.`,
    icon: CreditCard,
  });

  const sevColors = { red: ROSE, gold: GOLD, green: SAGE };
  const sevBg = { red: 'rgba(191,95,89,0.06)', gold: 'rgba(201,165,90,0.06)', green: 'rgba(88,152,122,0.06)' };
  const sevLabel = { red: 'CRITICAL', gold: 'WARNING', green: 'OPPORTUNITY' };

  const predictiveCount = alerts.filter(a => a.predictive).length;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, color: T1, marginBottom: 4 }}>Active Alerts</h2>
        <p style={{ fontSize: 11, color: T3 }}>{alerts.length} issues identified &middot; {predictiveCount} dynamically computed from data</p>
      </div>
      <div className="flex flex-col gap-3">
        {alerts.map((a, i) => (
          <div key={i} style={{
            background: CARD_BG, border: `1px solid ${BORDER}`,
            borderLeft: `3px solid ${sevColors[a.severity]}`,
            borderRadius: 10, padding: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 8,
                fontWeight: 700, letterSpacing: '0.08em',
                background: `${sevColors[a.severity]}22`, color: sevColors[a.severity],
              }}>
                {sevLabel[a.severity]}
              </span>
              {a.predictive && (
                <span style={{
                  padding: '2px 6px', borderRadius: 4, fontSize: 7,
                  fontWeight: 700, letterSpacing: '0.06em',
                  background: 'rgba(85,120,191,0.15)', color: STEEL,
                }}>
                  PREDICTED
                </span>
              )}
              <h3 style={{ fontSize: 12, color: T1, fontWeight: 500 }}>{a.title}</h3>
            </div>
            <p style={{ fontSize: 11, color: T2, lineHeight: 1.7 }}>{a.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE 3: P&L MODEL
// ══════════════════════════════════════════════════════════════════
function PnlPage({ data }: { data: StoreData }) {
  const { avgMonthlyNet, totalInvestment: TOTAL_INVESTMENT, pnl: PNL, monthlyData } = data;
  const [scenario, setScenario] = useState(73);

  const marginOptions = [
    { label: '55%', value: 55 },
    { label: '62%', value: 62 },
    { label: '73% ACTUAL', value: 73, active: true },
    { label: '70%', value: 70 },
  ];

  const avgGP = Math.round(avgMonthlyNet * (scenario / 100));
  const estNetProfit = avgGP - EST_MONTHLY_COSTS.total;
  const paybackPeriod = estNetProfit > 0 ? Math.ceil(TOTAL_INVESTMENT / estNetProfit) : 999;
  const sixMonthNetProfit = estNetProfit * 6;

  const scenarioData = [55, 62, 73, 70].map(m => ({
    margin: `${m}%`,
    monthlyGP: Math.round(avgMonthlyNet * (m / 100)),
    netProfit: Math.round(avgMonthlyNet * (m / 100)) - EST_MONTHLY_COSTS.total,
  }));

  return (
    <div>
      {/* Info card */}
      <div style={{
        background: 'rgba(85,120,191,0.06)', border: `1px solid rgba(85,120,191,0.15)`,
        borderRadius: 10, padding: 16, marginBottom: 16,
      }}>
        <div style={{ fontSize: 10, color: STEEL, fontWeight: 600, marginBottom: 4 }}>Data Source</div>
        <p style={{ fontSize: 11, color: T2, lineHeight: 1.6 }}>
          P&L covers {PNL.period}. Actual gross margin from verified P&L: <span style={{ color: SAGE, fontWeight: 600 }}>{PNL.grossMargin}%</span>.
          Revenue data from POS daywise reports. Monthly costs estimated from P&L expense run-rate.
        </p>
      </div>

      {/* Scenario buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {marginOptions.map(m => (
          <button key={m.value} onClick={() => setScenario(m.value)} style={{
            padding: '6px 16px', borderRadius: 6, fontSize: 10, fontWeight: 600,
            border: `1px solid ${scenario === m.value ? GOLD : BORDER}`,
            background: scenario === m.value ? `${GOLD}22` : 'transparent',
            color: scenario === m.value ? GOLD : T2, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="Avg Gross Profit" value={aed(avgGP)} sub={`At ${scenario}% margin`} badge={`${scenario}% GP`} badgeColor={scenario === 73 ? SAGE : GOLD} />
        <KpiCard label="Est. Monthly Net Profit" value={aed(estNetProfit)} sub={`GP ${aed(avgGP)} − Costs ${aed(EST_MONTHLY_COSTS.total)}`} badge={estNetProfit > 0 ? 'Profitable' : 'Loss-making'} badgeColor={estNetProfit > 0 ? SAGE : ROSE} />
        <KpiCard label="Payback Period" value={paybackPeriod > 100 ? '100+ months' : `${paybackPeriod} mo`} sub={`(${(paybackPeriod / 12).toFixed(1)} years)`} badge={paybackPeriod <= 24 ? 'On track' : 'Extended'} badgeColor={paybackPeriod <= 24 ? SAGE : AMBER} />
        <KpiCard label="6-Month Net Profit" value={aed(sixMonthNetProfit)} sub={sixMonthNetProfit > 0 ? 'After all costs' : 'Cumulative loss'} badge={sixMonthNetProfit > 0 ? 'Positive' : 'Negative'} badgeColor={sixMonthNetProfit > 0 ? SAGE : ROSE} />
      </div>

      {/* P&L Waterfall */}
      <ChartCard title="P&L Waterfall — Gross Profit vs Net Profit by Month" className="mb-3">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={monthlyData.map(d => ({
            ...d,
            gp: Math.round(d.gross * (scenario / 100)),
            netAfterCosts: Math.round(d.gross * (scenario / 100)) - EST_MONTHLY_COSTS.total,
          }))} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={axisTick} />
            <YAxis tick={axisTick} tickFormatter={v => aedK(v)} />
            <Tooltip content={<AEDTooltip />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: T2 }} />
            <Bar dataKey="gp" name="Gross Profit" fill={GOLD} radius={[4, 4, 0, 0]} barSize={28} />
            <Line dataKey="netAfterCosts" name="Net After Costs" stroke={scenario >= 73 ? SAGE : ROSE} strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Scenario comparison */}
      <ChartCard title="Margin Scenario Comparison" className="mb-3">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={scenarioData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="margin" tick={axisTick} />
            <YAxis tick={axisTick} tickFormatter={v => aedK(v)} />
            <Tooltip content={<AEDTooltip />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: T2 }} />
            <Bar dataKey="monthlyGP" name="Monthly GP" fill={GOLD} radius={[4, 4, 0, 0]} barSize={24} />
            <Bar dataKey="netProfit" name="Net Profit" fill={scenario >= 73 ? SAGE : ROSE} radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Cost Structure Table */}
      <ChartCard title="Monthly Cost Structure" wide>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              <th style={{ textAlign: 'left', color: T3, padding: '8px 0', fontWeight: 400, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Expense</th>
              <th style={{ textAlign: 'right', color: T3, padding: '8px 0', fontWeight: 400, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Amount</th>
              <th style={{ textAlign: 'right', color: T3, padding: '8px 0', fontWeight: 400, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Share</th>
            </tr>
          </thead>
          <tbody>
            {[...PNL.expenses].sort((a, b) => b.amount - a.amount).map((e, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                <td style={{ padding: '7px 0', color: T2 }}>{e.name}</td>
                <td style={{ padding: '7px 0', color: T1, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{aed(e.amount)}</td>
                <td style={{ padding: '7px 0', color: T3, textAlign: 'right' }}>{pct((e.amount / PNL.totalExpenses) * 100)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: `2px solid ${GOLD}` }}>
              <td style={{ padding: '8px 0', color: T1, fontWeight: 600 }}>Total Expenses</td>
              <td style={{ padding: '8px 0', color: GOLD, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{aed(PNL.totalExpenses)}</td>
              <td style={{ padding: '8px 0', color: GOLD, textAlign: 'right' }}>100%</td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: 12, padding: '10px 14px', background: `${SAGE}11`, borderRadius: 6, border: `1px solid ${SAGE}33` }}>
          <span style={{ fontSize: 10, color: SAGE, fontWeight: 600 }}>
            Actual GP Margin from P&L: {PNL.grossMargin}% &mdash; Gross Profit: {aed(PNL.grossProfit)} on Revenue: {aed(PNL.revenue)}
          </span>
        </div>
      </ChartCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE 4: CAPEX BREAKDOWN
// ══════════════════════════════════════════════════════════════════
function CapexPage({ data }: { data: StoreData }) {
  const { capexItems: CAPEX_ITEMS, totalCapex: TOTAL_CAPEX, overheads: OVERHEADS, totalOverheads: TOTAL_OVERHEADS, totalInvestment: TOTAL_INVESTMENT, avgMonthlyNet, capexByCategory } = data;
  const sorted = [...CAPEX_ITEMS].sort((a, b) => b.amount - a.amount);
  const maxAmount = sorted[0].amount;

  return (
    <div>
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <KpiCard label="Setup CAPEX" value={aed(TOTAL_CAPEX)} sub="17 items across 8 categories" badge="Direct costs" badgeColor={GOLD} />
        <KpiCard label="Overheads" value={aed(TOTAL_OVERHEADS)} sub={`${OVERHEADS.length} items (3-month pre-open)`} badge="Pre-launch" badgeColor={AMBER} />
        <KpiCard label="Total Project Cost" value={aed(TOTAL_INVESTMENT)} sub={`${pct((TOTAL_CAPEX / TOTAL_INVESTMENT) * 100)} CAPEX + ${pct((TOTAL_OVERHEADS / TOTAL_INVESTMENT) * 100)} overheads`} badge="All-in" badgeColor={GOLD} />
      </div>

      {/* Breakdown list + Donut */}
      <div className="grid grid-cols-5 gap-3 mb-3">
        <div className="col-span-3">
          <ChartCard title="CAPEX Items (sorted by amount)">
            <div className="flex flex-col gap-2" style={{ maxHeight: 420, overflowY: 'auto' }}>
              {sorted.map((item, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: T2 }}>{item.name}</span>
                    <span style={{ fontSize: 10, color: T1, fontVariantNumeric: 'tabular-nums' }}>{aed(item.amount)}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${(item.amount / maxAmount) * 100}%`,
                      background: catColors[item.category] || T3, borderRadius: 2,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
        <div className="col-span-2">
          <ChartCard title="By Category">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={capexByCategory}
                  cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" stroke="none"
                >
                  {capexByCategory.map((c, i) => (
                    <Cell key={i} fill={catColors[c.name] || T3} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => aed(v)} contentStyle={ttStyle} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 9, color: T2 }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Overheads list */}
            <div style={{ marginTop: 16, borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: T3, marginBottom: 8 }}>Overheads</div>
              {OVERHEADS.map((o, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ fontSize: 10, color: T2 }}>{o.name}</span>
                  <span style={{ fontSize: 10, color: T1, fontVariantNumeric: 'tabular-nums' }}>{aed(o.amount)}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Revenue milestones */}
      <ChartCard title="CAPEX as Revenue Milestones" wide>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Key Money alone', amount: CAPEX_ITEMS[0].amount, months: Math.ceil(CAPEX_ITEMS[0].amount / avgMonthlyNet) },
            { label: 'Fit-out costs', amount: CAPEX_ITEMS.filter(i => i.category === 'Fit-out').reduce((s, i) => s + i.amount, 0), months: Math.ceil(CAPEX_ITEMS.filter(i => i.category === 'Fit-out').reduce((s, i) => s + i.amount, 0) / avgMonthlyNet) },
            { label: 'Inventory investment', amount: CAPEX_ITEMS.filter(i => i.category === 'Inventory').reduce((s, i) => s + i.amount, 0), months: Math.ceil(CAPEX_ITEMS.filter(i => i.category === 'Inventory').reduce((s, i) => s + i.amount, 0) / avgMonthlyNet) },
            { label: 'Full project cost', amount: TOTAL_INVESTMENT, months: Math.ceil(TOTAL_INVESTMENT / avgMonthlyNet) },
          ].map((m, i) => (
            <div key={i} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
              <div style={{ fontSize: 9, color: T3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 16, fontFamily: 'Georgia, serif', color: T1 }}>{aed(m.amount)}</div>
              <div style={{ fontSize: 10, color: T2, marginTop: 4 }}>{m.months} months @ avg net</div>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE 5: PAYBACK ANALYSIS
// ══════════════════════════════════════════════════════════════════
function PaybackPage({ data }: { data: StoreData }) {
  const { totalInvestment: TOTAL_INVESTMENT, avgMonthlyNet, pnl: PNL, cumulativeNet, totalReturns, cardShare, totalCash } = data;
  const paybackGross = Math.ceil(TOTAL_INVESTMENT / avgMonthlyNet);
  const netAt73 = avgMonthlyNet * (PNL.grossMargin / 100) - EST_MONTHLY_COSTS.total;
  const netAt62 = avgMonthlyNet * 0.62 - EST_MONTHLY_COSTS.total;
  const payback73 = netAt73 > 0 ? Math.ceil(TOTAL_INVESTMENT / netAt73) : 999;
  const payback62 = netAt62 > 0 ? Math.ceil(TOTAL_INVESTMENT / netAt62) : 999;

  // 24-month cumulative recovery projection (at 73% margin)
  const cumData = Array.from({ length: 24 }, (_, i) => ({
    month: `M${i + 1}`,
    cumulative: Math.min(i < 6 ? cumulativeNet[Math.min(i, 5)] || 0 : cumulativeNet[5] + (i - 5) * netAt73, TOTAL_INVESTMENT),
    investment: TOTAL_INVESTMENT,
  }));

  return (
    <div>
      {/* 3 payback displays */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div style={{
          background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10,
          padding: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: T3, marginBottom: 8 }}>Gross Revenue Payback</div>
          <div style={{ fontSize: 40, fontFamily: 'Georgia, serif', color: GOLD, lineHeight: 1 }}>{paybackGross}</div>
          <div style={{ fontSize: 11, color: T2, marginTop: 4 }}>months ({(paybackGross / 12).toFixed(1)} years)</div>
          <div style={{ fontSize: 9, color: T3, marginTop: 8 }}>100% of net revenue to investment</div>
        </div>
        <div style={{
          background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10,
          padding: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: T3, marginBottom: 8 }}>Payback @ 62% Margin</div>
          <div style={{ fontSize: 40, fontFamily: 'Georgia, serif', color: AMBER, lineHeight: 1 }}>{payback62 > 100 ? '100+' : payback62}</div>
          <div style={{ fontSize: 11, color: T2, marginTop: 4 }}>months ({payback62 > 100 ? '8.3+' : (payback62 / 12).toFixed(1)} years)</div>
          <div style={{ fontSize: 9, color: T3, marginTop: 8 }}>Conservative estimate</div>
        </div>
        <div style={{
          background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10,
          padding: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: T3, marginBottom: 8 }}>Payback @ 73% Margin (Actual)</div>
          <div style={{ fontSize: 40, fontFamily: 'Georgia, serif', color: SAGE, lineHeight: 1 }}>{payback73 > 100 ? '100+' : payback73}</div>
          <div style={{ fontSize: 11, color: T2, marginTop: 4 }}>months ({payback73 > 100 ? '8.3+' : (payback73 / 12).toFixed(1)} years)</div>
          <div style={{ fontSize: 9, color: T3, marginTop: 8 }}>Based on verified P&L margin</div>
        </div>
      </div>

      {/* Cumulative recovery chart */}
      <ChartCard title="Cumulative Recovery vs Investment (24-month projection)" className="mb-3">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={cumData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD} stopOpacity={0.3} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={axisTick} interval={2} />
            <YAxis tick={axisTick} tickFormatter={v => aedK(v)} domain={[0, TOTAL_INVESTMENT * 1.1]} />
            <Tooltip content={<AEDTooltip />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: T2 }} />
            <Area dataKey="cumulative" name="Cumulative Recovery" fill="url(#cumGrad)" stroke={GOLD} strokeWidth={2} />
            <Line dataKey="investment" name="Total Investment" stroke={ROSE} strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Payback by margin scenario bar chart */}
      <ChartCard title="Payback by Margin Scenario" className="mb-3">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={[
            { scenario: 'Gross', months: paybackGross },
            { scenario: '55% GP', months: 55 > 0 ? Math.ceil(TOTAL_INVESTMENT / (avgMonthlyNet * 0.55 - EST_MONTHLY_COSTS.total)) : 999 },
            { scenario: '62% GP', months: payback62 },
            { scenario: '70% GP', months: Math.ceil(TOTAL_INVESTMENT / (avgMonthlyNet * 0.70 - EST_MONTHLY_COSTS.total)) },
            { scenario: '73% GP', months: payback73 },
          ].filter(d => d.months < 200)} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="scenario" tick={axisTick} />
            <YAxis tick={axisTick} label={{ value: 'Months', ...axisLabel, angle: -90, position: 'insideLeft' }} />
            <Tooltip content={(props: any) => {
              if (!props.active || !props.payload?.length) return null;
              return (
                <div style={ttStyle}>
                  <div style={{ color: T2, marginBottom: 4 }}>{props.payload[0].payload.scenario}</div>
                  <div style={{ color: GOLD, fontWeight: 500 }}>{props.payload[0].value} months ({(props.payload[0].value / 12).toFixed(1)} yrs)</div>
                </div>
              );
            }} />
            <Bar dataKey="months" fill={GOLD} radius={[4, 4, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* What accelerates payback */}
      <ChartCard title="What Accelerates Payback" wide>
        <div className="grid grid-cols-2 gap-3">
          {[
            { lever: 'Increase Average Ticket Size', impact: 'Higher gross per transaction boosts net directly', icon: ArrowUpRight },
            { lever: 'Reduce Returns to <1.5%', impact: `${aed(totalReturns * 0.5)} potential savings annually`, icon: RotateCcw },
            { lever: 'Launch Loyalty Programme', impact: `${pct(cardShare)} card share = repeat customer base`, icon: CreditCard },
            { lever: 'Optimize Marketing ROI', impact: `Current est. ${aed(EST_MONTHLY_COSTS.marketing)}/mo — track conversion`, icon: Target },
            { lever: 'Extend Operating Hours', impact: 'Capture evening & weekend footfall', icon: Clock },
            { lever: 'Cross-sell Accessories', impact: 'Higher margin category drives GP% above 73%', icon: ShoppingCart },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8,
            }}>
              <item.icon size={16} style={{ color: GOLD, flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 11, color: T1, fontWeight: 500, marginBottom: 2 }}>{item.lever}</div>
                <div style={{ fontSize: 10, color: T3 }}>{item.impact}</div>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE 6: REVENUE TRENDS
// ══════════════════════════════════════════════════════════════════
function RevenuePage({ data }: { data: StoreData }) {
  const { months: MONTHS, monthsFull: MONTHS_FULL, net: NET, totalGross, totalNet, totalReturns, monthlyData, returns: RETURNS, cash: CASH, card: CARD, cardPct, momGrowth, cumulativeNet, returnRates, avgReturnRate } = data;
  const peakIdx = NET.indexOf(Math.max(...NET));
  const lowIdx = NET.indexOf(Math.min(...NET));

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="6-Month Gross" value={aed(totalGross)} sub={`${MONTHS[0]} – ${MONTHS[5]}`} />
        <KpiCard label="6-Month Net" value={aed(totalNet)} sub={`After ${aed(totalReturns)} returns`} badge="Net of returns" badgeColor={SAGE} />
        <KpiCard label="Peak Month" value={aed(NET[peakIdx])} sub={MONTHS_FULL[peakIdx]} badge="Highest net" badgeColor={SAGE} />
        <KpiCard label="Low Month" value={aed(NET[lowIdx])} sub={MONTHS_FULL[lowIdx]} badge="Launch month" badgeColor={AMBER} />
      </div>

      {/* Gross vs Net vs Returns */}
      <ChartCard title="Monthly Gross vs Net vs Returns" className="mb-3">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={axisTick} />
            <YAxis tick={axisTick} tickFormatter={v => aedK(v)} />
            <Tooltip content={<AEDTooltip />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: T2 }} />
            <Bar dataKey="gross" name="Gross" fill={GOLD} radius={[4, 4, 0, 0]} barSize={20} />
            <Bar dataKey="net" name="Net" fill={SAGE} radius={[4, 4, 0, 0]} barSize={20} />
            <Line dataKey="returns" name="Returns" stroke={ROSE} strokeWidth={2} dot={{ r: 3, fill: ROSE }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* MoM Growth + Cumulative */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <ChartCard title="Month-on-Month Growth">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData.filter(d => d.growth !== null)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={axisTick} />
              <YAxis tick={axisTick} tickFormatter={v => `${v}%`} />
              <Tooltip content={(props: any) => {
                if (!props.active || !props.payload?.length) return null;
                return (
                  <div style={ttStyle}>
                    <div style={{ color: T2, marginBottom: 4 }}>{props.label}</div>
                    <div style={{ color: props.payload[0].value >= 0 ? SAGE : ROSE, fontWeight: 500 }}>
                      {props.payload[0].value >= 0 ? '+' : ''}{props.payload[0].value}%
                    </div>
                  </div>
                );
              }} />
              <Bar dataKey="growth" name="MoM Growth" radius={[4, 4, 0, 0]}>
                {monthlyData.filter(d => d.growth !== null).map((d, i) => (
                  <Cell key={i} fill={(d.growth || 0) >= 0 ? SAGE : ROSE} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cumulative Net Revenue">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cumNetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SAGE} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={SAGE} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={axisTick} />
              <YAxis tick={axisTick} tickFormatter={v => aedK(v)} />
              <Tooltip content={<AEDTooltip />} />
              <Area dataKey="cumNet" name="Cumulative Net" fill="url(#cumNetGrad)" stroke={SAGE} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Monthly breakdown table */}
      <ChartCard title="Monthly Breakdown" wide>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {['Month', 'Gross', 'Returns', 'Net', 'Cash', 'Card', 'Card %', 'MoM Growth', 'Cumulative'].map(h => (
                <th key={h} style={{
                  textAlign: h === 'Month' ? 'left' : 'right', color: T3,
                  padding: '8px 6px', fontWeight: 400, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((d, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                <td style={{ padding: '8px 6px', color: T2 }}>{d.fullMonth}</td>
                <td style={{ padding: '8px 6px', color: T1, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{aed(d.gross)}</td>
                <td style={{ padding: '8px 6px', color: ROSE, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{aed(d.returns)}</td>
                <td style={{ padding: '8px 6px', color: SAGE, textAlign: 'right', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{aed(d.net)}</td>
                <td style={{ padding: '8px 6px', color: T1, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{aed(d.cash)}</td>
                <td style={{ padding: '8px 6px', color: T1, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{aed(d.card)}</td>
                <td style={{ padding: '8px 6px', color: STEEL, textAlign: 'right' }}>{d.cardPct}%</td>
                <td style={{ padding: '8px 6px', color: d.growth !== null ? (d.growth! >= 0 ? SAGE : ROSE) : T3, textAlign: 'right' }}>
                  {d.growth !== null ? `${d.growth >= 0 ? '+' : ''}${d.growth}%` : '—'}
                </td>
                <td style={{ padding: '8px 6px', color: T1, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{aed(d.cumNet)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ChartCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE 7: DAILY HEATMAP
// ══════════════════════════════════════════════════════════════════
function HeatmapPage({ data }: { data: StoreData }) {
  const { months: MONTHS, monthsFull: MONTHS_FULL, daily: DAILY } = data;
  const [selectedMonth, setSelectedMonth] = useState(0);
  const monthData = DAILY[selectedMonth];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const values = monthData.values;
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const avgVal = values.reduce((a, b) => a + b, 0) / values.length;

  // Build calendar grid
  const cells: { day: number; value: number | null; dow: number }[] = [];
  let dayCounter = 1;
  for (let week = 0; week < 6; week++) {
    for (let dow = 0; dow < 7; dow++) {
      if (week === 0 && dow < monthData.startDay) {
        cells.push({ day: 0, value: null, dow });
      } else if (dayCounter <= values.length) {
        cells.push({ day: dayCounter, value: values[dayCounter - 1], dow });
        dayCounter++;
      } else {
        cells.push({ day: 0, value: null, dow });
      }
    }
  }

  const getColor = (val: number | null) => {
    if (val === null) return 'transparent';
    const intensity = (val - minVal) / (maxVal - minVal || 1);
    const alpha = 0.15 + intensity * 0.85;
    return `rgba(201,165,90,${alpha})`;
  };

  // Day-of-week averages
  const dowAvgs = dayNames.map((_, dow) => {
    const dayVals: number[] = [];
    cells.forEach(c => { if (c.value !== null && c.dow === dow) dayVals.push(c.value); });
    return {
      day: dayNames[dow],
      avg: dayVals.length ? Math.round(dayVals.reduce((a, b) => a + b, 0) / dayVals.length) : 0,
    };
  });

  return (
    <div>
      {/* Month tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {MONTHS.map((m, i) => (
          <button key={i} onClick={() => setSelectedMonth(i)} style={{
            padding: '6px 14px', borderRadius: 6, fontSize: 10,
            border: `1px solid ${selectedMonth === i ? GOLD : BORDER}`,
            background: selectedMonth === i ? `${GOLD}22` : 'transparent',
            color: selectedMonth === i ? GOLD : T2, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {m}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <KpiCard label="Min Daily" value={aed(minVal)} sub={`Day ${values.indexOf(minVal) + 1}`} />
        <KpiCard label="Avg Daily" value={aed(Math.round(avgVal))} sub={`${values.length} trading days`} />
        <KpiCard label="Max Daily" value={aed(maxVal)} sub={`Day ${values.indexOf(maxVal) + 1}`} badge="Peak" badgeColor={SAGE} />
      </div>

      {/* Calendar grid */}
      <ChartCard title={`Daily Revenue — ${MONTHS_FULL[selectedMonth]}`} className="mb-3">
        {/* Day-of-week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {dayNames.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 9, color: T3, fontWeight: 500 }}>{d}</div>
          ))}
        </div>
        {/* Cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((cell, i) => (
            <div key={i} style={{
              aspectRatio: '1.4',
              background: getColor(cell.value),
              borderRadius: 4,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              border: cell.value !== null ? '1px solid rgba(201,165,90,0.1)' : '1px solid transparent',
            }}>
              {cell.day > 0 && (
                <>
                  <div style={{ fontSize: 9, color: T1, fontWeight: 500 }}>{cell.day}</div>
                  <div style={{ fontSize: 7, color: cell.value && cell.value > avgVal ? GOLD : T3 }}>
                    {cell.value?.toLocaleString()}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, justifyContent: 'center' }}>
          <span style={{ fontSize: 8, color: T3 }}>Low</span>
          {[0.15, 0.35, 0.55, 0.75, 1.0].map((a, i) => (
            <div key={i} style={{ width: 20, height: 8, borderRadius: 2, background: `rgba(201,165,90,${a})` }} />
          ))}
          <span style={{ fontSize: 8, color: T3 }}>High</span>
        </div>
      </ChartCard>

      {/* Day-of-week averages */}
      <ChartCard title="Day-of-Week Average Revenue">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dowAvgs} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="day" tick={axisTick} />
            <YAxis tick={axisTick} tickFormatter={v => aedK(v)} />
            <Tooltip content={<AEDTooltip />} />
            <Bar dataKey="avg" name="Avg Revenue" fill={GOLD} radius={[4, 4, 0, 0]}>
              {dowAvgs.map((d, i) => (
                <Cell key={i} fill={d.avg >= avgVal ? GOLD : GOLD_DIM} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE 8: RETURNS ANALYSIS
// ══════════════════════════════════════════════════════════════════
function ReturnsPage({ data }: { data: StoreData }) {
  const { months: MONTHS, monthsFull: MONTHS_FULL, totalReturns, avgReturnRate, returnRates, monthlyData, gross: GROSS, returns: RETURNS, net: NET } = data;
  const worstMonthIdx = returnRates.indexOf(Math.max(...returnRates));
  const targetRate = 1.5;
  const savingsAtTarget = GROSS.reduce((sum, g, i) => sum + (g * targetRate / 100 - RETURNS[i]), 0);

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="Total Returns" value={aed(totalReturns)} sub={`Across ${MONTHS[0]}–${MONTHS[5]}`} badge={pct(avgReturnRate)} badgeColor={ROSE} />
        <KpiCard label="Average Return Rate" value={pct(avgReturnRate)} sub={`Range: ${pct(Math.min(...returnRates))} – ${pct(Math.max(...returnRates))}`} />
        <KpiCard label="Worst Month" value={pct(returnRates[worstMonthIdx])} sub={MONTHS_FULL[worstMonthIdx]} badge={aed(RETURNS[worstMonthIdx])} badgeColor={ROSE} />
        <KpiCard label="Savings @ 1.5% Target" value={aed(Math.abs(Math.round(savingsAtTarget)))} sub="If returns held at 1.5% target" badge="Potential" badgeColor={SAGE} />
      </div>

      {/* Monthly return value bar */}
      <ChartCard title="Monthly Return Value" className="mb-3">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={axisTick} />
            <YAxis tick={axisTick} tickFormatter={v => aedK(v)} />
            <Tooltip content={<AEDTooltip />} />
            <Bar dataKey="returns" name="Returns (AED)" fill={ROSE} radius={[4, 4, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Return rate trend with target */}
      <ChartCard title="Return Rate % with 1.5% Target" className="mb-3">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={axisTick} />
            <YAxis tick={axisTick} tickFormatter={v => `${v}%`} domain={[0, 5]} />
            <Tooltip content={<PctTooltip />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: T2 }} />
            <Line dataKey="returnRate" name="Return %" stroke={ROSE} strokeWidth={2} dot={{ r: 4, fill: ROSE }} />
            <Line dataKey={() => targetRate} name="1.5% Target" stroke={SAGE} strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Returns detail table */}
      <ChartCard title="Returns Detail" wide>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {['Month', 'Gross Revenue', 'Returns', 'Return Rate', 'Returns @ 1.5%', 'Savings'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', color: T3, padding: '8px 6px', fontWeight: 400,
                  fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((d, i) => {
              const targetReturns = Math.round(d.gross * 0.015);
              const savings = RETURNS[i] - targetReturns;
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '8px 6px', color: T2 }}>{d.fullMonth}</td>
                  <td style={{ padding: '8px 6px', color: T1, fontVariantNumeric: 'tabular-nums' }}>{aed(d.gross)}</td>
                  <td style={{ padding: '8px 6px', color: ROSE, fontVariantNumeric: 'tabular-nums' }}>{aed(d.returns)}</td>
                  <td style={{ padding: '8px 6px', color: d.returnRate > 2 ? ROSE : T1, fontVariantNumeric: 'tabular-nums' }}>{pct(d.returnRate)}</td>
                  <td style={{ padding: '8px 6px', color: SAGE, fontVariantNumeric: 'tabular-nums' }}>{aed(targetReturns)}</td>
                  <td style={{ padding: '8px 6px', color: savings > 0 ? SAGE : T1, fontVariantNumeric: 'tabular-nums' }}>
                    {savings > 0 ? aed(savings) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ChartCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE 9: PAYMENT MIX
// ══════════════════════════════════════════════════════════════════
function PaymentsPage({ data }: { data: StoreData }) {
  const { totalCard, cardShare, totalCash, cash: CASH, months: MONTHS, monthsFull: MONTHS_FULL, monthlyData } = data;
  const highestCashIdx = CASH.indexOf(Math.max(...CASH));
  const loyaltyPotential = Math.round(totalCard * 0.03); // 3% repeat potential

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="Total Card" value={aed(totalCard)} sub={`${pct(cardShare)} of net revenue`} badge="Primary" badgeColor={STEEL} />
        <KpiCard label="Total Cash" value={aed(totalCash)} sub={`${pct(100 - cardShare)} of net revenue`} badge="Secondary" badgeColor={AMBER} />
        <KpiCard label="Highest Cash Month" value={aed(CASH[highestCashIdx])} sub={MONTHS_FULL[highestCashIdx]} />
        <KpiCard label="Loyalty Potential" value={aed(loyaltyPotential)} sub="Est. 3% incremental from card repeat" badge="Opportunity" badgeColor={SAGE} />
      </div>

      {/* Stacked bar */}
      <ChartCard title="Cash vs Card Revenue" className="mb-3">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={axisTick} />
            <YAxis tick={axisTick} tickFormatter={v => aedK(v)} />
            <Tooltip content={<AEDTooltip />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: T2 }} />
            <Bar dataKey="card" name="Card" stackId="a" fill={STEEL} radius={[0, 0, 0, 0]} />
            <Bar dataKey="cash" name="Cash" stackId="a" fill={AMBER} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Card share trend */}
      <ChartCard title="Card Share % Trend" className="mb-3">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={axisTick} />
            <YAxis tick={axisTick} domain={[70, 85]} tickFormatter={v => `${v}%`} />
            <Tooltip content={<PctTooltip />} />
            <Line dataKey="cardPct" name="Card %" stroke={STEEL} strokeWidth={2} dot={{ r: 4, fill: STEEL }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Loyalty opportunity */}
      <ChartCard title="Loyalty Programme Opportunity" wide>
        <div style={{
          background: 'rgba(85,120,191,0.06)', border: `1px solid rgba(85,120,191,0.15)`,
          borderRadius: 8, padding: 16,
        }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: STEEL, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Why Card Customers Matter
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  `${pct(cardShare)} of revenue via card — strong repeat signal`,
                  `Card customers typically spend 20-40% more per visit`,
                  `Trackable purchase history enables personalization`,
                  `ADCB Mall's affluent demographic = high lifetime value`,
                  `Potential ${aed(loyaltyPotential)}/mo incremental with 3% repeat uplift`,
                ].map((item, i) => (
                  <li key={i} style={{ fontSize: 10, color: T2, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <span style={{ color: STEEL, fontSize: 8, marginTop: 2 }}>&#9679;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ width: 200, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontFamily: 'Georgia, serif', color: STEEL }}>{pct(cardShare)}</div>
                <div style={{ fontSize: 9, color: T3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Card Share</div>
              </div>
            </div>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE 10: FORECAST
// ══════════════════════════════════════════════════════════════════
function ForecastPage({ data }: { data: StoreData }) {
  const { months: MONTHS, cumulativeNet, net: NET, totalInvestment: TOTAL_INVESTMENT, avgMonthlyNet, gross: GROSS } = data;

  // ── Real Predictive Forecasting ──
  const regression = linearRegression(NET);
  const smoothed = exponentialSmoothing(NET, 0.3);
  const maForecast = movingAverageForecast(NET, 3);
  const trendAnalysis = revenueTrendAnalysis(NET);

  // Generate 3-month forecast using regression + blended smoothing
  const fcMonths = ['Apr 26', 'May 26', 'Jun 26'];
  const forecastMonths = fcMonths.map((month, i) => {
    const x = NET.length + i;
    const regVal = regression.forecast(x);
    // Blend regression with exponential smoothing for robustness
    const blend = NET.length >= 6 ? 0.6 : 0.4;
    const base = Math.round(blend * regVal + (1 - blend) * smoothed.forecast);
    // Confidence intervals that widen with each period
    const ci = confidenceInterval(NET, base, i + 1, 0.9);
    return { month, base: Math.max(0, base), bear: Math.max(0, Math.round(ci.lower)), bull: Math.round(ci.upper), type: 'forecast' as const };
  });

  const nineMonthData = [
    ...monthlyData.map(d => ({ month: d.month, net: d.net, type: 'actual' })),
    ...forecastMonths.map(d => ({ month: d.month, net: d.base, bear: d.bear, bull: d.bull, type: 'forecast' })),
  ];

  // Cumulative projection
  const cumForecast = [...cumulativeNet];
  forecastMonths.forEach(f => {
    cumForecast.push(cumForecast[cumForecast.length - 1] + f.base);
  });

  // Trend badge
  const trendLabels: Record<string, { label: string; color: string }> = {
    strong_growth: { label: 'Strong Growth', color: SAGE },
    growth: { label: 'Growing', color: '#6dab7e' },
    stable: { label: 'Stable', color: GOLD },
    decline: { label: 'Declining', color: AMBER },
    strong_decline: { label: 'Strong Decline', color: ROSE },
  };
  const trendInfo = trendLabels[trendAnalysis.trend] || trendLabels.stable;

  return (
    <div>
      {/* Info card */}
      <div style={{
        background: 'rgba(201,165,90,0.06)', border: `1px solid rgba(201,165,90,0.15)`,
        borderRadius: 10, padding: 16, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 10, color: GOLD, fontWeight: 600 }}>Methodology</div>
          <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', background: `${trendInfo.color}22`, color: trendInfo.color }}>
            {trendInfo.label}
          </span>
        </div>
        <p style={{ fontSize: 11, color: T2, lineHeight: 1.6 }}>
          Forecasts computed via linear regression (R²={regression.r2.toFixed(2)}) blended with exponential smoothing (α=0.3).
          Bear/bull bands are 90% confidence intervals that widen per period. CAGR: {trendAnalysis.cagr > 0 ? '+' : ''}{trendAnalysis.cagr}%, Volatility: {trendAnalysis.volatility.toFixed(1)}%.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="April Forecast" value={aed(forecastMonths[0].base)} sub={`${aed(forecastMonths[0].bear)} – ${aed(forecastMonths[0].bull)}`} badge="90% CI" badgeColor={GOLD} />
        <KpiCard label="May Forecast" value={aed(forecastMonths[1].base)} sub={`${aed(forecastMonths[1].bear)} – ${aed(forecastMonths[1].bull)}`} badge="90% CI" badgeColor={GOLD} />
        <KpiCard label="June Forecast" value={aed(forecastMonths[2].base)} sub={`${aed(forecastMonths[2].bear)} – ${aed(forecastMonths[2].bull)}`} badge="90% CI" badgeColor={GOLD} />
        <KpiCard label="Q2 Total" value={aed(forecastMonths.reduce((s, f) => s + f.base, 0))} sub={`Range: ${aed(forecastMonths.reduce((s, f) => s + f.bear, 0))} – ${aed(forecastMonths.reduce((s, f) => s + f.bull, 0))}`} badge={`R² ${regression.r2.toFixed(2)}`} badgeColor={regression.r2 > 0.5 ? SAGE : AMBER} />
      </div>

      {/* 9-month revenue view */}
      <ChartCard title="9-Month Revenue View (6 Actual + 3 Projected)" className="mb-3">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={nineMonthData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD} stopOpacity={0.2} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis tick={axisTick} dataKey="month" />
            <YAxis tick={axisTick} tickFormatter={v => aedK(v)} />
            <Tooltip content={<AEDTooltip />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: T2 }} />
            <Bar dataKey="net" name="Net Revenue" fill={GOLD} radius={[4, 4, 0, 0]} barSize={24} />
            <Area dataKey="bear" name="Bear Case" fill="url(#forecastGrad)" stroke="none" />
            <Line dataKey="bull" name="Bull Case" stroke={SAGE} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Scenario table */}
      <ChartCard title="Scenario Breakdown" className="mb-3">
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {['Month', 'Bear (-15%)', 'Base', 'Bull (+15%)', 'Range'].map(h => (
                <th key={h} style={{
                  textAlign: h === 'Month' ? 'left' : 'right', color: T3, padding: '8px 6px',
                  fontWeight: 400, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {forecastMonths.map((f, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                <td style={{ padding: '8px 6px', color: T2 }}>{f.month}</td>
                <td style={{ padding: '8px 6px', color: ROSE, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{aed(f.bear)}</td>
                <td style={{ padding: '8px 6px', color: GOLD, textAlign: 'right', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{aed(f.base)}</td>
                <td style={{ padding: '8px 6px', color: SAGE, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{aed(f.bull)}</td>
                <td style={{ padding: '8px 6px', color: T3, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{aed(f.bull - f.bear)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: `2px solid ${GOLD}` }}>
              <td style={{ padding: '8px 6px', color: T1, fontWeight: 600 }}>Q2 Total</td>
              <td style={{ padding: '8px 6px', color: ROSE, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {aed(forecastMonths.reduce((s, f) => s + f.bear, 0))}
              </td>
              <td style={{ padding: '8px 6px', color: GOLD, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {aed(forecastMonths.reduce((s, f) => s + f.base, 0))}
              </td>
              <td style={{ padding: '8px 6px', color: SAGE, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {aed(forecastMonths.reduce((s, f) => s + f.bull, 0))}
              </td>
              <td style={{ padding: '8px 6px', color: T3, textAlign: 'right' }}>—</td>
            </tr>
          </tbody>
        </table>
      </ChartCard>

      {/* Cumulative recovery projection */}
      <ChartCard title="Cumulative Recovery Projection">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={[
            ...MONTHS.map((m, i) => ({ month: m, cumulative: cumulativeNet[i] })),
            { month: 'Apr 26', cumulative: cumForecast[6] },
            { month: 'May 26', cumulative: cumForecast[7] },
            { month: 'Jun 26', cumulative: cumForecast[8] },
          ].map(d => ({ ...d, investment: TOTAL_INVESTMENT }))} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD} stopOpacity={0.25} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={axisTick} />
            <YAxis tick={axisTick} tickFormatter={v => aedK(v)} domain={[0, TOTAL_INVESTMENT * 1.1]} />
            <Tooltip content={<AEDTooltip />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: T2 }} />
            <Area dataKey="cumulative" name="Cumulative" fill="url(#projGrad)" stroke={GOLD} strokeWidth={2} />
            <Line dataKey="investment" name="Investment" stroke={ROSE} strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontFamily: 'Georgia, serif', color: T1 }}>{aed(cumForecast[8])}</div>
            <div style={{ fontSize: 9, color: T3 }}>9-Month Cumulative</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontFamily: 'Georgia, serif', color: GOLD }}>{pct((cumForecast[8] / TOTAL_INVESTMENT) * 100)}</div>
            <div style={{ fontSize: 9, color: T3 }}>Investment Recovered</div>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SVG DONUT CHART HELPER
// ══════════════════════════════════════════════════════════════════
function DonutChart({ percentage, size = 180, strokeWidth = 14, color }: { percentage: number; size?: number; strokeWidth?: number; color: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════
// GAUGE BAR HELPER
// ══════════════════════════════════════════════════════════════════
function GaugeBar({ current, target, max, label, color }: { current: number; target: number; max: number; label: string; color: string }) {
  const clampedCurrent = Math.min(current, max);
  const clampedTarget = Math.min(target, max);
  const currentPct = (clampedCurrent / max) * 100;
  const targetPct = (clampedTarget / max) * 100;
  const above = current >= target;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: T2 }}>{label}</span>
        <span style={{ fontSize: 10, color: above ? SAGE : ROSE, fontWeight: 500 }}>
          {above ? '+' : ''}{pct(((current - target) / target) * 100)} vs breakeven
        </span>
      </div>
      <div style={{ height: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${currentPct}%`, background: `${color}88`, borderRadius: 6, transition: 'width 0.3s' }} />
        <div style={{ position: 'absolute', top: -2, left: `${targetPct}%`, width: 2, height: 16, background: ROSE, borderRadius: 1, transition: 'left 0.3s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 8, color: T3 }}>{aed(Math.round(current))} current</span>
        <span style={{ fontSize: 8, color: ROSE }}>{aed(Math.round(target))} breakeven</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE 12: BREAKEVEN CALCULATOR
// ══════════════════════════════════════════════════════════════════
function BreakevenPage({ data }: { data: StoreData }) {
  const { avgMonthlyNet } = data;
  const [fixedCosts, setFixedCosts] = useState(EST_MONTHLY_COSTS.total);
  const [margin, setMargin] = useState(73);
  const [targetProfit, setTargetProfit] = useState(5000);

  const monthlyBreakeven = fixedCosts / (margin / 100);
  const dailyBreakeven = monthlyBreakeven / 30;
  const revenueForTarget = (fixedCosts + targetProfit) / (margin / 100);
  const currentVsBreakeven = avgMonthlyNet - monthlyBreakeven;
  const currentVsPct = (currentVsBreakeven / monthlyBreakeven) * 100;

  const sensitivityMargins = [55, 62, 70, 73, 80];
  const sensitivityData = sensitivityMargins.map(m => ({
    margin: `${m}%`,
    breakeven: Math.round(fixedCosts / (m / 100)),
    daily: Math.round((fixedCosts / (m / 100)) / 30),
  }));

  const costDonutData = [
    { name: 'Rent', value: EST_MONTHLY_COSTS.rent },
    { name: 'Salaries', value: EST_MONTHLY_COSTS.salaries },
    { name: 'Marketing', value: EST_MONTHLY_COSTS.marketing },
    { name: 'Utilities', value: EST_MONTHLY_COSTS.utilities },
    { name: 'Misc', value: EST_MONTHLY_COSTS.misc },
    { name: 'Software', value: EST_MONTHLY_COSTS.software },
  ];
  const costColors = [GOLD, SAGE, AMBER, STEEL, T3, ROSE];

  const sliderStyle = {
    display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 20,
  };
  const labelRow = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  };

  return (
    <div>
      <style>{`
        input[type="range"] { -webkit-appearance: none; width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; outline: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #c9a55a; cursor: pointer; }
        input[type="range"]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #c9a55a; cursor: pointer; border: none; }
      `}</style>

      {/* Sliders */}
      <ChartCard title="Adjust Assumptions" className="mb-3">
        <div style={sliderStyle}>
          <div style={labelRow}>
            <span style={{ fontSize: 10, color: T2 }}>Monthly Fixed Costs</span>
            <span style={{ fontSize: 11, color: T1, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{aed(fixedCosts)}</span>
          </div>
          <input type="range" min={15000} max={60000} step={500} value={fixedCosts} onChange={e => setFixedCosts(Number(e.target.value))} />
        </div>
        <div style={sliderStyle}>
          <div style={labelRow}>
            <span style={{ fontSize: 10, color: T2 }}>Gross Margin %</span>
            <span style={{ fontSize: 11, color: T1, fontWeight: 600 }}>{margin}%</span>
          </div>
          <input type="range" min={40} max={85} step={1} value={margin} onChange={e => setMargin(Number(e.target.value))} />
        </div>
        <div style={{ ...sliderStyle, marginBottom: 0 }}>
          <div style={labelRow}>
            <span style={{ fontSize: 10, color: T2 }}>Target Monthly Profit</span>
            <span style={{ fontSize: 11, color: T1, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{aed(targetProfit)}</span>
          </div>
          <input type="range" min={0} max={30000} step={500} value={targetProfit} onChange={e => setTargetProfit(Number(e.target.value))} />
        </div>
      </ChartCard>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <KpiCard label="Monthly Breakeven" value={aed(Math.round(monthlyBreakeven))} sub={`Costs / ${margin}% margin`} badge="Revenue needed" badgeColor={GOLD} />
        <KpiCard label="Daily Breakeven" value={aed(Math.round(dailyBreakeven))} sub={`${aed(Math.round(monthlyBreakeven))} / 30 days`} />
        <KpiCard label="Revenue for Target" value={aed(Math.round(revenueForTarget))} sub={`Breakeven + ${aed(targetProfit)} profit`} badge={pct(((revenueForTarget - monthlyBreakeven) / monthlyBreakeven) * 100)} badgeColor={SAGE} />
        <KpiCard
          label="Current vs Breakeven"
          value={aed(Math.round(Math.abs(currentVsBreakeven)))}
          sub={currentVsBreakeven >= 0 ? 'above breakeven' : 'below breakeven'}
          badge={currentVsBreakeven >= 0 ? `${pct(currentVsPct)} above` : `${pct(Math.abs(currentVsPct))} below`}
          badgeColor={currentVsBreakeven >= 0 ? SAGE : ROSE}
        />
      </div>

      {/* Gauge bar */}
      <ChartCard title="Revenue vs Breakeven Gauge" className="mb-3">
        <GaugeBar
          current={avgMonthlyNet}
          target={monthlyBreakeven}
          max={Math.max(avgMonthlyNet, monthlyBreakeven, revenueForTarget) * 1.2}
          label="Avg Monthly Revenue"
          color={GOLD}
        />
        <GaugeBar
          current={revenueForTarget}
          target={monthlyBreakeven}
          max={Math.max(avgMonthlyNet, monthlyBreakeven, revenueForTarget) * 1.2}
          label="Revenue for Target Profit"
          color={SAGE}
        />
      </ChartCard>

      {/* Sensitivity table + Cost donut */}
      <div className="grid grid-cols-5 gap-3 mb-3">
        <div className="col-span-3">
          <ChartCard title="Breakeven Sensitivity by Margin">
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th style={{ textAlign: 'left', color: T3, padding: '8px 6px', fontWeight: 400, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Margin</th>
                  <th style={{ textAlign: 'right', color: T3, padding: '8px 6px', fontWeight: 400, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Monthly Breakeven</th>
                  <th style={{ textAlign: 'right', color: T3, padding: '8px 6px', fontWeight: 400, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Daily Target</th>
                  <th style={{ textAlign: 'right', color: T3, padding: '8px 6px', fontWeight: 400, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>vs Current</th>
                </tr>
              </thead>
              <tbody>
                {sensitivityData.map((d, i) => {
                  const diff = avgMonthlyNet - d.breakeven;
                  const diffPct = (diff / d.breakeven) * 100;
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}`, background: sensitivityMargins[i] === margin ? 'rgba(201,165,90,0.04)' : 'transparent' }}>
                      <td style={{ padding: '7px 6px', color: sensitivityMargins[i] === 73 ? GOLD : T2, fontWeight: sensitivityMargins[i] === 73 ? 600 : 400 }}>{d.margin}</td>
                      <td style={{ padding: '7px 6px', color: T1, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{aed(d.breakeven)}</td>
                      <td style={{ padding: '7px 6px', color: T2, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{aed(d.daily)}</td>
                      <td style={{ padding: '7px 6px', color: diff >= 0 ? SAGE : ROSE, textAlign: 'right', fontWeight: 500 }}>{diff >= 0 ? '+' : ''}{pct(diffPct)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ChartCard>
        </div>
        <div className="col-span-2">
          <ChartCard title="Fixed Cost Breakdown">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={costDonutData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                  {costDonutData.map((_c, i) => <Cell key={i} fill={costColors[i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => aed(v)} contentStyle={ttStyle} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 9, color: T2 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SHARED: RANGE SLIDER COMPONENT (for What-If Simulator)
// ══════════════════════════════════════════════════════════════════
function RangeSlider({ label, value, onChange, min, max, step, unit, icon: Icon }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; unit?: string; icon: any;
}) {
  const fillColor = value > 0 ? SAGE : value < 0 ? ROSE : GOLD;
  return (
    <div style={{ padding: '14px 16px', background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={13} style={{ color: value !== 0 ? fillColor : T3, opacity: 0.7 }} />
          <span style={{ fontSize: 10, color: T1, fontWeight: 500 }}>{label}</span>
        </div>
        <span style={{
          fontSize: 11, fontFamily: 'DM Mono, monospace', fontWeight: 600, color: fillColor,
        }}>
          {value >= 0 ? '+' : ''}{value}{unit || ''}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%', height: 4, borderRadius: 2, outline: 'none',
          WebkitAppearance: 'none', appearance: 'none',
          background: `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.08) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.08) 100%)`,
          cursor: 'pointer',
        }}
      />
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 14px; height: 14px; border-radius: 50%;
          background: ${T1}; border: 2px solid ${fillColor};
          cursor: pointer; box-shadow: 0 0 6px rgba(0,0,0,0.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 50%;
          background: ${T1}; border: 2px solid ${fillColor};
          cursor: pointer;
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 8, color: T3 }}>{min}{unit || ''}</span>
        <span style={{ fontSize: 8, color: T3 }}>{max}{unit || ''}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE 13: WHAT-IF SIMULATOR
// ══════════════════════════════════════════════════════════════════
function SimulatorPage({ data }: { data: StoreData }) {
  const { avgMonthlyNet, pnl: PNL, totalReturns, net: NET, months: MONTHS, totalInvestment: TOTAL_INVESTMENT, currency: cur } = data;
  const m = (n: number) => money(n, cur);
  const mK = (n: number) => moneyK(n, cur);

  const cur_ = cur || 'AED';
  const currentNetProfit = Math.round(avgMonthlyNet * (PNL.grossMargin / 100) - EST_MONTHLY_COSTS.total);
  const currentCosts = EST_MONTHLY_COSTS.total;
  const currentGP = Math.round(avgMonthlyNet * (PNL.grossMargin / 100));
  const baseRent = EST_MONTHLY_COSTS.rent;
  const baseSalaries = EST_MONTHLY_COSTS.salaries;
  const baseMarketing = EST_MONTHLY_COSTS.marketing;

  // ── Interactive Slider States ──
  const [rentChange, setRentChange] = useState(0);        // +/- AED per month
  const [staffChange, setStaffChange] = useState(0);      // +/- AED per month (0, 3000, -3000)
  const [revenueGrowth, setRevenueGrowth] = useState(0);  // % change (-30 to +100)
  const [marketingChange, setMarketingChange] = useState(0); // +/- AED
  const [returnsReduction, setReturnsReduction] = useState(0); // 0-100%
  const [marginShift, setMarginShift] = useState(0);      // +/- percentage points

  // ── Derived Calculations ──
  const adjustedMargin = PNL.grossMargin + marginShift;
  const adjustedRevenue = avgMonthlyNet * (1 + revenueGrowth / 100);
  const adjustedGP = Math.round(adjustedRevenue * (adjustedMargin / 100));
  const adjustedCosts = currentCosts + rentChange + staffChange + marketingChange;
  const adjustedNetProfit = adjustedGP - adjustedCosts;
  const returnsSaving = (totalReturns / 12) * (returnsReduction / 100); // monthly saving
  const totalAdjustedNet = adjustedNetProfit + Math.round(returnsSaving);

  const breakevenRevenue = adjustedMargin > 0 ? Math.round(adjustedCosts / (adjustedMargin / 100)) : Infinity;
  const newPayback = totalAdjustedNet > 0 ? Math.ceil(TOTAL_INVESTMENT / totalAdjustedNet) : 999;
  const annualizedProfit = totalAdjustedNet * 12;
  const profitDelta = totalAdjustedNet - currentNetProfit;
  const profitDeltaPct = currentNetProfit !== 0 ? ((profitDelta / Math.abs(currentNetProfit)) * 100).toFixed(0) : '—';

  const isChanged = rentChange !== 0 || staffChange !== 0 || revenueGrowth !== 0 || marketingChange !== 0 || returnsReduction !== 0 || marginShift !== 0;

  // ── Chart data ──
  const comparisonData = MONTHS.map((m, i) => ({
    month: m,
    current: NET[i],
    simulated: Math.round(NET[i] * (1 + revenueGrowth / 100)),
  }));

  // ── Preset Scenarios ──
  const presets = [
    {
      label: 'Optimistic Growth',
      tag: 'GROWTH', color: SAGE,
      icon: ArrowUpRight,
      values: { rentChange: 0, staffChange: 0, revenueGrowth: 20, marketingChange: 0, returnsReduction: 30, marginShift: 2 },
      desc: '+20% revenue, −30% returns, +2pp margin',
    },
    {
      label: 'Cost Crisis',
      tag: 'RISK', color: ROSE,
      icon: AlertTriangle,
      values: { rentChange: 5000, staffChange: 3000, revenueGrowth: -10, marketingChange: 0, returnsReduction: 0, marginShift: -5 },
      desc: '+5K rent, +3K staff, −10% revenue, −5pp margin',
    },
    {
      label: 'Lean Operations',
      tag: 'EFFICIENCY', color: GOLD,
      icon: Target,
      values: { rentChange: 0, staffChange: 0, revenueGrowth: 0, marketingChange: -3000, returnsReduction: 40, marginShift: 0 },
      desc: '−3K marketing, −40% returns',
    },
    {
      label: 'Expansion Mode',
      tag: 'SCALE', color: STEEL,
      icon: TrendingUp,
      values: { rentChange: 0, staffChange: 5000, revenueGrowth: 35, marketingChange: 3000, returnsReduction: 20, marginShift: 0 },
      desc: '+5K staff, +35% revenue, +3K marketing',
    },
    {
      label: 'Reset',
      tag: 'DEFAULT', color: T3,
      icon: RotateCcw,
      values: { rentChange: 0, staffChange: 0, revenueGrowth: 0, marketingChange: 0, returnsReduction: 0, marginShift: 0 },
      desc: 'Reset all sliders to baseline',
    },
  ];

  const applyPreset = (p: typeof presets[0]) => {
    setRentChange(p.values.rentChange);
    setStaffChange(p.values.staffChange);
    setRevenueGrowth(p.values.revenueGrowth);
    setMarketingChange(p.values.marketingChange);
    setReturnsReduction(p.values.returnsReduction);
    setMarginShift(p.values.marginShift);
  };

  return (
    <div>
      {/* ── Preset scenario buttons ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: T3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Quick Scenarios</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {presets.map((p, i) => (
            <button key={i} onClick={() => applyPreset(p)} style={{
              padding: '6px 12px', borderRadius: 6, fontSize: 9, fontWeight: 600,
              border: `1px solid ${p.color}33`,
              background: `${p.color}11`,
              color: p.color, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.15s',
            }}>
              <p.icon size={11} />
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Slider Controls ── */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <RangeSlider label="Rent Change" value={rentChange} onChange={setRentChange} min={-5000} max={15000} step={500} unit={` ${cur_}/mo`} icon={Store} />
        <RangeSlider label="Staff Cost Change" value={staffChange} onChange={setStaffChange} min={-3000} max={10000} step={500} unit={` ${cur_}/mo`} icon={Users} />
        <RangeSlider label="Revenue Growth" value={revenueGrowth} onChange={setRevenueGrowth} min={-30} max={100} step={1} unit="%" icon={ArrowUpRight} />
        <RangeSlider label="Marketing Budget" value={marketingChange} onChange={setMarketingChange} min={-10000} max={10000} step={500} unit={` ${cur_}/mo`} icon={Target} />
        <RangeSlider label="Returns Reduction" value={returnsReduction} onChange={setReturnsReduction} min={0} max={100} step={5} unit="%" icon={RotateCcw} />
        <RangeSlider label="Margin Shift" value={marginShift} onChange={setMarginShift} min={-15} max={15} step={1} unit=" pp" icon={Activity} />
      </div>

      {/* ── Live P&L Impact ── */}
      <ChartCard title="Live P&L Impact" wide>
        <div className="grid grid-cols-4 gap-3">
          <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', color: T3, marginBottom: 6 }}>Gross Profit</div>
            <div style={{ fontSize: 22, fontFamily: 'Georgia, serif', color: isChanged ? SAGE : T1, lineHeight: 1 }}>{m(adjustedGP)}</div>
            <div style={{ fontSize: 9, color: T2, marginTop: 4 }}>
              <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>{m(currentGP)}</span>
              {' → '}
              <span style={{ color: adjustedMargin !== PNL.grossMargin ? GOLD : 'inherit' }}>{adjustedMargin}%</span>
            </div>
          </div>
          <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', color: T3, marginBottom: 6 }}>Monthly Costs</div>
            <div style={{ fontSize: 22, fontFamily: 'Georgia, serif', color: adjustedCosts > currentCosts ? ROSE : adjustedCosts < currentCosts ? SAGE : T1, lineHeight: 1 }}>{m(adjustedCosts)}</div>
            <div style={{ fontSize: 9, color: T2, marginTop: 4 }}>
              <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>{m(currentCosts)}</span>
              {' → '}Δ {adjustedCosts - currentCosts >= 0 ? '+' : ''}{m(adjustedCosts - currentCosts)}
            </div>
          </div>
          <div style={{ padding: 16, background: totalAdjustedNet > currentNetProfit ? 'rgba(88,152,122,0.04)' : totalAdjustedNet < currentNetProfit ? 'rgba(191,95,89,0.04)' : 'rgba(255,255,255,0.02)', borderRadius: 8, textAlign: 'center', border: `1px solid ${totalAdjustedNet > currentNetProfit ? 'rgba(88,152,122,0.15)' : totalAdjustedNet < currentNetProfit ? 'rgba(191,95,89,0.15)' : BORDER}` }}>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', color: totalAdjustedNet > currentNetProfit ? SAGE : totalAdjustedNet < currentNetProfit ? ROSE : T3, marginBottom: 6 }}>Monthly Net Profit</div>
            <div style={{ fontSize: 22, fontFamily: 'Georgia, serif', color: totalAdjustedNet >= 0 ? T1 : ROSE, lineHeight: 1 }}>{m(totalAdjustedNet)}</div>
            <div style={{ fontSize: 9, color: profitDelta >= 0 ? SAGE : ROSE, marginTop: 4 }}>
              {profitDelta >= 0 ? '▲' : '▼'} {m(Math.abs(profitDelta))}/mo ({profitDeltaPct}%)
            </div>
          </div>
          <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', color: T3, marginBottom: 6 }}>Payback Period</div>
            <div style={{ fontSize: 22, fontFamily: 'Georgia, serif', color: newPayback <= 24 ? SAGE : newPayback <= 60 ? AMBER : ROSE, lineHeight: 1 }}>
              {newPayback > 100 ? '100+' : newPayback} mo
            </div>
            <div style={{ fontSize: 9, color: T2, marginTop: 4 }}>
              ({(newPayback / 12).toFixed(1)} yrs) · Annual: {m(annualizedProfit)}
            </div>
          </div>
        </div>
      </ChartCard>

      {/* ── Comparison Chart ── */}
      <ChartCard title={`Revenue: Current vs Simulated ${isChanged ? `(+${revenueGrowth}% growth)` : ''}`} className="mb-3">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={comparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={axisTick} />
            <YAxis tick={axisTick} tickFormatter={v => mK(v)} />
            <Tooltip content={<AEDTooltip />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: T2 }} />
            <Bar dataKey="current" name="Current" fill={GOLD} radius={[3, 3, 0, 0]} barSize={20} />
            <Line dataKey="simulated" name="Simulated" stroke={SAGE} strokeWidth={2} dot={{ r: 3, fill: SAGE }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Cost Breakdown ── */}
      <ChartCard title="Adjusted Cost Structure" wide>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Rent', base: baseRent, delta: rentChange, color: GOLD },
                { label: 'Salaries', base: baseSalaries, delta: staffChange, color: SAGE },
                { label: 'Marketing', base: baseMarketing, delta: marketingChange, color: AMBER },
                { label: 'Utilities', base: EST_MONTHLY_COSTS.utilities, delta: 0, color: STEEL },
                { label: 'Software', base: EST_MONTHLY_COSTS.software, delta: 0, color: T3 },
                { label: 'Misc', base: EST_MONTHLY_COSTS.misc, delta: 0, color: T3 },
              ].map(cost => {
                const total = cost.base + cost.delta;
                const pctOfTotal = adjustedCosts > 0 ? (total / adjustedCosts * 100) : 0;
                return (
                  <div key={cost.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontSize: 10, color: T2 }}>{cost.label}</span>
                      <span style={{ fontSize: 10, color: cost.delta !== 0 ? (cost.delta > 0 ? ROSE : SAGE) : T1, fontFamily: 'DM Mono, monospace' }}>
                        {m(total)} {cost.delta !== 0 && <span style={{ fontSize: 8, opacity: 0.7 }}>({cost.delta > 0 ? '+' : ''}{m(cost.delta)})</span>}
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: cost.color, width: `${pctOfTotal}%`, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
              <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', color: T3, marginBottom: 6 }}>Returns Impact</div>
              <div style={{ fontSize: 14, fontFamily: 'Georgia, serif', color: T1 }}>
                {returnsReduction > 0 ? `${m(Math.round(totalReturns * returnsReduction / 100))}/yr saved` : m(Math.round(totalReturns)) + '/yr current'}
              </div>
              <div style={{ fontSize: 9, color: T2, marginTop: 4 }}>
                {returnsReduction}% reduction = {m(Math.round(returnsSaving))}/mo additional profit
              </div>
            </div>
            <div style={{ padding: 16, background: totalAdjustedNet > 0 ? 'rgba(88,152,122,0.06)' : 'rgba(191,95,89,0.06)', borderRadius: 8, border: `1px solid ${totalAdjustedNet > 0 ? 'rgba(88,152,122,0.2)' : 'rgba(191,95,89,0.2)'}` }}>
              <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', color: totalAdjustedNet > 0 ? SAGE : ROSE, marginBottom: 6 }}>Breakeven Revenue</div>
              <div style={{ fontSize: 14, fontFamily: 'Georgia, serif', color: T1 }}>
                {breakevenRevenue === Infinity ? 'N/A' : m(breakevenRevenue) + '/mo'}
              </div>
              <div style={{ fontSize: 9, color: T2, marginTop: 4 }}>
                Need {breakevenRevenue === Infinity ? '—' : m(breakevenRevenue)} monthly revenue to cover {m(adjustedCosts)} costs at {adjustedMargin}% margin
              </div>
            </div>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE 14: WEEKLY PERFORMANCE
// ══════════════════════════════════════════════════════════════════
function WeeklyPage({ data }: { data: StoreData }) {
  const { daily: DAILY, months: MONTHS, avgMonthlyNet } = data;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthColors = [GOLD, SAGE, ROSE, STEEL, AMBER, GOLD_DIM];

  // Aggregate DAILY data into weeks
  const weeklyAgg: { weekLabel: string; total: number; monthIdx: number; weekNum: number }[] = [];
  let globalWeekNum = 0;
  DAILY.forEach((monthData, mi) => {
    let dayIdx = 0;
    let weekTotal = 0;
    const startDow = monthData.startDay;
    // Days before start of month belong to previous week (padding)
    let weekDayCount = startDow; // count of days accumulated in current week (from prev month padding)
    while (dayIdx < monthData.values.length) {
      weekTotal += monthData.values[dayIdx];
      weekDayCount++;
      if (weekDayCount >= 7) {
        weeklyAgg.push({
          weekLabel: `${MONTHS[mi]}W${Math.floor(dayIdx / 7) + 1}`,
          total: weekTotal,
          monthIdx: mi,
          weekNum: globalWeekNum,
        });
        globalWeekNum++;
        weekTotal = 0;
        weekDayCount = 0;
      }
      dayIdx++;
    }
    if (weekDayCount > 0) {
      weeklyAgg.push({
        weekLabel: `${MONTHS[mi]}W${Math.floor(dayIdx / 7) + 1}`,
        total: weekTotal,
        monthIdx: mi,
        weekNum: globalWeekNum,
      });
      globalWeekNum++;
    }
  });

  // Day-of-week analysis
  const dowStats = dayNames.map((name, dow) => {
    const dayVals: number[] = [];
    const monthAvg = avgMonthlyNet / 30;
    DAILY.forEach(monthData => {
      let dayIdx = 0;
      let currentDow = monthData.startDay;
      while (dayIdx < monthData.values.length) {
        if (currentDow === dow) dayVals.push(monthData.values[dayIdx]);
        dayIdx++;
        currentDow = (currentDow + 1) % 7;
      }
    });
    const avg = dayVals.length ? dayVals.reduce((a, b) => a + b, 0) / dayVals.length : 0;
    const best = dayVals.length ? Math.max(...dayVals) : 0;
    const aboveAvg = dayVals.filter(v => v > monthAvg).length;
    return { day: name, avg: Math.round(avg), best, count: dayVals.length, aboveAvg, belowAvg: dayVals.length - aboveAvg };
  });

  const totalWeeks = weeklyAgg.length;
  const weekTotals = weeklyAgg.map(w => w.total);
  const bestWeek = Math.max(...weekTotals);
  const worstWeek = Math.min(...weekTotals);
  const avgWeekly = Math.round(weekTotals.reduce((a, b) => a + b, 0) / totalWeeks);
  const bestWeekLabel = weeklyAgg.find(w => w.total === bestWeek)?.weekLabel || '';
  const worstWeekLabel = weeklyAgg.find(w => w.total === worstWeek)?.weekLabel || '';

  return (
    <div>
      {/* Key stats */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <KpiCard label="Total Weeks" value={`${totalWeeks}`} sub="Across 6 months" />
        <KpiCard label="Best Week" value={aed(bestWeek)} sub={bestWeekLabel} badge="Peak" badgeColor={SAGE} />
        <KpiCard label="Worst Week" value={aed(worstWeek)} sub={worstWeekLabel} badgeColor={ROSE} />
        <KpiCard label="Avg Weekly Revenue" value={aed(avgWeekly)} sub={pct(avgWeekly > 0 ? 1 : 0)} />
        <KpiCard label="Week Range" value={aed(bestWeek - worstWeek)} sub={`Best − Worst spread`} />
      </div>

      {/* Week-over-week bar chart */}
      <ChartCard title="Weekly Revenue by Month" className="mb-3">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyAgg} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="weekLabel" tick={axisTick} interval={2} fontSize={8} />
            <YAxis tick={axisTick} tickFormatter={v => aedK(v)} />
            <Tooltip content={<AEDTooltip />} />
            <Bar dataKey="total" name="Weekly Revenue" radius={[3, 3, 0, 0]}>
              {weeklyAgg.map((w, i) => <Cell key={i} fill={monthColors[w.monthIdx]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* Month legend */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
          {MONTHS.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: monthColors[i] }} />
              <span style={{ fontSize: 8, color: T3 }}>{m}</span>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Day-of-week grid + Weekly trend */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <ChartCard title="Day-of-Week Performance">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {dowStats.map((d, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '10px 4px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
                <div style={{ fontSize: 9, color: T3, marginBottom: 6, fontWeight: 500 }}>{d.day}</div>
                <div style={{ fontSize: 14, fontFamily: 'Georgia, serif', color: T1, lineHeight: 1 }}>{aed(d.avg)}</div>
                <div style={{ fontSize: 8, color: T3, marginTop: 4 }}>avg/day</div>
                <div style={{ fontSize: 8, color: SAGE, marginTop: 2 }}>{aed(d.best)}</div>
                <div style={{ fontSize: 7, color: T3, marginTop: 4 }}>{d.aboveAvg}↑ {d.belowAvg}↓</div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Weekly Trend">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={weeklyAgg} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="weekLabel" tick={axisTick} interval={4} fontSize={8} />
              <YAxis tick={axisTick} tickFormatter={v => aedK(v)} />
              <Tooltip content={<AEDTooltip />} />
              <Line dataKey="total" name="Weekly Total" stroke={GOLD} strokeWidth={2} dot={{ r: 2, fill: GOLD }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE: DAILY OPERATIONS TRACKER
// ══════════════════════════════════════════════════════════════════
function DailyOpsPage({ data }: { data: StoreData }) {
  const { daily: DAILY, months: MONTHS, net: NET, avgMonthlyNet, currency: cur, totalReturns, monthsFull: MONTHS_FULL } = data;
  const m = (n: number) => money(n, cur);
  const mK = (n: number) => moneyK(n, cur);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const [selectedMonth, setSelectedMonth] = useState(DAILY.length - 1);

  const monthData = DAILY[selectedMonth] || { startDay: 0, values: [] };
  const dailyValues = monthData.values;
  const daysInMonth = dailyValues.length;
  const totalDailyRevenue = dailyValues.reduce((a, b) => a + b, 0);
  const avgDailyRevenue = daysInMonth > 0 ? totalDailyRevenue / daysInMonth : 0;
  const maxDaily = daysInMonth > 0 ? Math.max(...dailyValues) : 0;
  const minDaily = daysInMonth > 0 ? Math.min(...dailyValues) : 0;
  const bestDayIdx = dailyValues.indexOf(maxDaily);
  const worstDayIdx = dailyValues.indexOf(minDaily);
  const targetDaily = avgMonthlyNet / 30;

  // Day-of-week aggregation for selected month
  const dowAgg = dayNames.map((name, dow) => {
    const vals: number[] = [];
    dailyValues.forEach((v, di) => {
      const actualDow = (monthData.startDay + di) % 7;
      if (actualDow === dow) vals.push(v);
    });
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { name, avg: Math.round(avg), count: vals.length, total: Math.round(vals.reduce((a, b) => a + b, 0)) };
  });

  // Weekly targets for selected month
  const weeklyTarget = targetDaily * 7;
  let weekTotal = 0;
  let weekDayCount = 0;
  const weeklyPerformance: { week: number; total: number; days: number; vsTarget: number; pct: number }[] = [];
  dailyValues.forEach((v, di) => {
    weekTotal += v;
    weekDayCount++;
    if (weekDayCount >= 7 || di === dailyValues.length - 1) {
      const pct = weeklyTarget > 0 ? (weekTotal / weeklyTarget) * 100 : 0;
      weeklyPerformance.push({ week: weeklyPerformance.length + 1, total: weekTotal, days: weekDayCount, vsTarget: weekTotal - weeklyTarget, pct });
      weekTotal = 0;
      weekDayCount = 0;
    }
  });

  // Rolling 7-day trend
  const rolling7 = dailyValues.map((_, i) => {
    const window = dailyValues.slice(Math.max(0, i - 6), i + 1);
    return window.reduce((a, b) => a + b, 0) / window.length;
  });

  const dailyChartData = dailyValues.map((v, i) => ({
    day: i + 1,
    revenue: v,
    target: Math.round(targetDaily),
    '7-day avg': Math.round(rolling7[i]),
    dow: dayNames[(monthData.startDay + i) % 7],
  }));

  return (
    <div>
      {/* Month selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {MONTHS.map((m, i) => (
          <button key={i} onClick={() => setSelectedMonth(i)} style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 9, fontWeight: 600,
            border: `1px solid ${selectedMonth === i ? GOLD : BORDER}`,
            background: selectedMonth === i ? `${GOLD}22` : 'transparent',
            color: selectedMonth === i ? GOLD : T2, cursor: 'pointer', fontFamily: 'inherit',
          }}>{m}</button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <KpiCard label="Monthly Total" value={m(totalDailyRevenue)} sub={MONTHS_FULL[selectedMonth] || MONTHS[selectedMonth]} badge={`${daysInMonth} days`} badgeColor={GOLD} />
        <KpiCard label="Avg Daily Revenue" value={m(Math.round(avgDailyRevenue))} sub={`Target: ${m(Math.round(targetDaily))}`} badge={avgDailyRevenue >= targetDaily ? 'On Track' : 'Below Target'} badgeColor={avgDailyRevenue >= targetDaily ? SAGE : AMBER} />
        <KpiCard label="Best Day" value={m(maxDaily)} sub={`Day ${bestDayIdx + 1} · ${dayNames[(monthData.startDay + bestDayIdx) % 7]}`} badge="Peak" badgeColor={SAGE} />
        <KpiCard label="Worst Day" value={m(minDaily)} sub={`Day ${worstDayIdx + 1} · ${dayNames[(monthData.startDay + worstDayIdx) % 7]}`} badge="Low" badgeColor={ROSE} />
      </div>

      {/* Daily Revenue vs Target */}
      <ChartCard title={`${MONTHS[selectedMonth]} ${MONTHS_FULL[selectedMonth] || ''} — Daily Revenue vs Target`}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={dailyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="day" tick={axisTick} />
            <YAxis tick={axisTick} tickFormatter={v => mK(v)} />
            <Tooltip content={<AEDTooltip />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: T2 }} />
            <Bar dataKey="revenue" name="Revenue" fill={GOLD} radius={[2, 2, 0, 0]} barSize={12} opacity={0.85} />
            <Line dataKey="target" name="Target" stroke={ROSE} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            <Line dataKey="7-day avg" name="7-Day Avg" stroke={SAGE} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-2 gap-3 mt-3">
        {/* Day-of-week performance */}
        <ChartCard title="Performance by Day of Week">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dowAgg} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={axisTick} />
              <YAxis tick={axisTick} tickFormatter={v => mK(v)} />
              <Tooltip content={<AEDTooltip />} />
              <Bar dataKey="avg" name="Avg Revenue" radius={[3, 3, 0, 0]} barSize={24}>
                {dowAgg.map((_, i) => <Cell key={i} fill={dowAgg[i].avg >= avgDailyRevenue ? SAGE : dowAgg[i].avg >= avgDailyRevenue * 0.7 ? AMBER : ROSE} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Weekly performance */}
        <ChartCard title="Weekly Performance vs Target">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {weeklyPerformance.map(w => (
              <div key={w.week}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: T2 }}>Week {w.week} <span style={{ fontSize: 8, color: T3 }}>({w.days} days)</span></span>
                  <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: w.pct >= 100 ? SAGE : w.pct >= 75 ? AMBER : ROSE, fontWeight: 600 }}>
                    {m(w.total)} <span style={{ fontSize: 8, fontWeight: 400 }}>({w.pct.toFixed(0)}%)</span>
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                  <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(w.pct, 130)}%`, background: w.pct >= 100 ? SAGE : w.pct >= 75 ? AMBER : ROSE, transition: 'width 0.3s' }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE: CASH FLOW VIEW
// ══════════════════════════════════════════════════════════════════
function CashFlowPage({ data }: { data: StoreData }) {
  const { net: NET, gross: GROSS, months: MONTHS, monthsFull: MONTHS_FULL, pnl: PNL, totalInvestment: TOTAL_INVESTMENT, capexItems: CAPEX_ITEMS, overheads: OVERHEADS, totalNet, monthlyData, currency: cur, cumulativeNet } = data;
  const m = (n: number) => money(n, cur);
  const mK = (n: number) => moneyK(n, cur);

  const monthlyOpCosts = EST_MONTHLY_COSTS.total;
  const cogsRate = PNL.grossMargin > 0 ? (100 - PNL.grossMargin) : 27;
  const avgReturns = monthlyData.length > 0 ? monthlyData.reduce((s, d) => s + d.returns, 0) / monthlyData.length : 0;

  // Monthly cash flow = Net Revenue - Op Costs - COGS already deducted from net
  // But we need to account for CAPEX timing and working capital
  const monthlyCashFlow = NET.map((n, i) => {
    const opCosts = monthlyOpCosts;
    const gp = GROSS[i] * (PNL.grossMargin / 100);
    const cogs = GROSS[i] - gp;
    return Math.round(n - opCosts); // net already has returns deducted, op costs subtracted
  });

  const monthlyInflows = NET.map(n => n);
  const monthlyOutflows = monthlyCashFlow.map(cf => cf < 0 ? Math.abs(cf) : 0);

  const totalInflow = monthlyInflows.reduce((a, b) => a + b, 0);
  const totalOutflow = monthlyOutflows.reduce((a, b) => a + b, 0);

  // Cumulative cash position (starting from -TOTAL_INVESTMENT)
  const cashPosition = [-TOTAL_INVESTMENT];
  monthlyCashFlow.forEach(cf => cashPosition.push(cashPosition[cashPosition.length - 1] + cf));
  const cashLabels = ['Start', ...MONTHS];

  // Runway calculation
  const lastCash = cashPosition[cashPosition.length - 1];
  const avgBurn = monthlyCashFlow.length > 0 ? monthlyCashFlow.reduce((a, b) => a + b, 0) / monthlyCashFlow.length : 0;
  const runway = avgBurn < 0 ? Math.floor(lastCash / avgBurn) : 999;
  const monthsToProfit = (() => {
    let pos = lastCash;
    for (let i = 0; i < 24; i++) {
      pos += avgBurn;
      if (pos >= 0) return i + 1;
    }
    return 999;
  })();

  const cashFlowChartData = MONTHS.map((m, i) => ({
    month: m,
    'Cash Flow': monthlyCashFlow[i],
    inflow: monthlyInflows[i],
    outflow: monthlyOutflows[i],
  }));

  const cashPosData = cashLabels.map((label, i) => ({
    label,
    'Cash Position': cashPosition[i],
  }));

  // Seasonal pattern
  const monthlyCFByMonthNum = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const monthlyCFCount = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  monthlyData.forEach((d, i) => {
    const monthNum = i % 12;
    monthlyCFByMonthNum[monthNum] += monthlyCashFlow[i] || 0;
    monthlyCFCount[monthNum]++;
  });
  const seasonalData = monthlyCFByMonthNum.map((v, i) => ({
    month: MN[i],
    'Avg CF': monthlyCFCount[i] > 0 ? Math.round(v / monthlyCFCount[i]) : 0,
  }));

  return (
    <div>
      {/* Info */}
      <div style={{ background: 'rgba(85,120,191,0.06)', border: `1px solid rgba(85,120,191,0.15)`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <p style={{ fontSize: 10, color: T2, lineHeight: 1.6 }}>
          Cash flow analysis projects net monthly revenue against operating costs. Starting position reflects total capital investment ({m(TOTAL_INVESTMENT)}).
          Seasonal patterns and runway estimates help plan working capital needs.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <KpiCard label="Current Cash Position" value={m(lastCash)} sub={`Started at −${m(TOTAL_INVESTMENT)}`} badge={lastCash >= 0 ? 'Positive' : 'Negative'} badgeColor={lastCash >= 0 ? SAGE : ROSE} />
        <KpiCard label="Avg Monthly Cash Flow" value={m(Math.round(avgBurn))} sub={`Total: ${m(totalNet)} revenue − ${m(monthlyOpCosts * NET.length)} costs`} badge={avgBurn >= 0 ? 'Surplus' : 'Deficit'} badgeColor={avgBurn >= 0 ? SAGE : ROSE} />
        <KpiCard label="Runway" value={runway >= 100 ? '100+ mo' : `${runway} mo`} sub={avgBurn < 0 ? `at ${m(Math.abs(avgBurn))}/mo burn` : 'Cash positive'} badge={runway > 12 ? 'Safe' : runway > 6 ? 'Monitor' : 'Critical'} badgeColor={runway > 12 ? SAGE : runway > 6 ? AMBER : ROSE} />
        <KpiCard label="Months to Profitability" value={monthsToProfit >= 100 ? '100+' : `${monthsToProfit}`} sub={`from current position`} badge={monthsToProfit <= 12 ? 'Achievable' : 'Long-term'} badgeColor={monthsToProfit <= 12 ? SAGE : AMBER} />
      </div>

      {/* Cash Flow bar chart */}
      <ChartCard title="Monthly Cash Flow (Revenue − Operating Costs)" className="mb-3">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={cashFlowChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={axisTick} />
            <YAxis tick={axisTick} tickFormatter={v => mK(v)} />
            <Tooltip content={<AEDTooltip />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: T2 }} />
            <ReferenceLine y={0} stroke={T3} strokeWidth={1} />
            <Bar dataKey="Cash Flow" radius={[3, 3, 0, 0]} barSize={24}>
              {cashFlowChartData.map((entry, i) => <Cell key={i} fill={entry['Cash Flow'] >= 0 ? SAGE : ROSE} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-2 gap-3">
        {/* Cash Position Line */}
        <ChartCard title="Cumulative Cash Position">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={cashPosData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" tick={axisTick} />
              <YAxis tick={axisTick} tickFormatter={v => mK(v)} />
              <Tooltip content={<AEDTooltip />} />
              <ReferenceLine y={0} stroke={T3} strokeWidth={1.5} strokeDasharray="4 4" />
              <Area type="monotone" dataKey="Cash Position" stroke={GOLD} fill={`${GOLD}22`} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Seasonal cash needs */}
        <ChartCard title="Seasonal Cash Pattern">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={seasonalData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={axisTick} />
              <YAxis tick={axisTick} tickFormatter={v => mK(v)} />
              <Tooltip content={<AEDTooltip />} />
              <ReferenceLine y={0} stroke={T3} strokeWidth={1} />
              <Bar dataKey="Avg CF" radius={[3, 3, 0, 0]} barSize={20}>
                {seasonalData.map((entry, i) => <Cell key={i} fill={entry['Avg CF'] >= 0 ? SAGE : ROSE} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE: CUSTOMER INSIGHTS
// ══════════════════════════════════════════════════════════════════
function CustomerInsightsPage({ data }: { data: StoreData }) {
  const { net: NET, months: MONTHS, card: CARD, cash: CASH, avgMonthlyNet, totalNet, totalCard, totalCash, currency: cur, monthlyData, momGrowth } = data;
  const m = (n: number) => money(n, cur);
  const mK = (n: number) => moneyK(n, cur);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        let slug = DEFAULT_BRANCH_SLUG;
        try { const v = JSON.parse(localStorage.getItem('parfumix:selectedView') || '{}'); if (v.type === 'branch' && v.slug) slug = v.slug; } catch {}
        const qs = slug !== DEFAULT_BRANCH_SLUG ? `?branchSlug=${encodeURIComponent(slug)}` : '';
        const res = await fetch(`/api/data/transactions${qs}`).then(r => r.json()).catch(() => []);
        setTransactions(res || []);
      } finally { setLoading(false); }
    }
    setLoading(true);
    load();
  }, [data.dataVersion]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><RefreshCw size={20} style={{ color: GOLD, animation: 'spin 1s linear infinite' }} /></div>;

  // Derived customer metrics
  const totalReceipts = transactions.reduce((s: number, t: any) => s + (t.receiptCount || 0), 0);
  const avgTicketSize = totalReceipts > 0 ? totalNet / totalReceipts : 0;
  const cardShare = totalNet > 0 ? (totalCard / totalNet) * 100 : 0;

  // Estimate new vs repeat from card ratio (card users ≈ repeat)
  const estimatedRepeatPct = Math.min(cardShare * 1.2, 75); // card users tend to be repeat, with some buffer
  const estimatedNewPct = 100 - estimatedRepeatPct;
  const estimatedRepeatCustomers = Math.round(totalReceipts * estimatedRepeatPct / 100);
  const estimatedNewCustomers = totalReceipts - estimatedRepeatCustomers;

  // Loyalty tier distribution (estimated)
  const loyaltyTiers = [
    { name: 'One-Time', pct: estimatedNewPct, color: T3, icon: UserCheck, desc: 'Single purchase' },
    { name: 'Casual', pct: Math.round(estimatedRepeatPct * 0.5), color: STEEL, icon: Users, desc: '2–3 visits/yr' },
    { name: 'Regular', pct: Math.round(estimatedRepeatPct * 0.3), color: GOLD, icon: BadgeDollarSign, desc: '4–6 visits/yr' },
    { name: 'Loyal', pct: Math.round(estimatedRepeatPct * 0.15), color: SAGE, icon: Coins, desc: '7+ visits/yr' },
    { name: 'VIP', pct: Math.round(estimatedRepeatPct * 0.05), color: '#bf6fa0', icon: TrendingUp, desc: 'Top 5% spenders' },
  ];

  // Monthly ticket size trend
  const ticketTrend = transactions.map((t: any) => ({
    month: `${MN[(t.month || 1) - 1]} ${String(t.year || '').slice(2)}`,
    'Ticket Size': Math.round(t.avgTicketSize || (t.totalRevenue / Math.max(t.receiptCount, 1))),
    receipts: t.receiptCount || 0,
    revenue: t.totalRevenue || 0,
  }));

  // Revenue per customer segment
  const avgRevenuePerRepeat = estimatedRepeatCustomers > 0 ? (totalNet * estimatedRepeatPct / 100) / estimatedRepeatCustomers : 0;
  const avgRevenuePerNew = estimatedNewCustomers > 0 ? (totalNet * estimatedNewPct / 100) / estimatedNewCustomers : 0;

  // Purchase frequency estimate
  const monthsTracked = transactions.length || 1;
  const avgFrequencyPerCustomer = monthsTracked > 0 ? (totalReceipts * 12 / (estimatedRepeatCustomers + estimatedNewCustomers) / monthsTracked * monthsTracked).toFixed(1) : '—';

  // Retention metrics
  const retentionData = MONTHS.map((m, i) => {
    const cardPct = monthlyData[i] ? monthlyData[i].cardPct : 0;
    return { month: m, 'Repeat Rate': Math.round(Math.min(cardPct * 1.2, 75)), 'Card Share': cardPct };
  });

  return (
    <div>
      {/* Info */}
      <div style={{ background: 'rgba(201,165,90,0.06)', border: `1px solid rgba(201,165,90,0.15)`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <p style={{ fontSize: 10, color: T2, lineHeight: 1.6 }}>
          Customer insights are derived from transaction patterns, payment method mix, and ticket size trends. Card payment ratio serves as a proxy for repeat customer behavior. Upload detailed POS data for more granular segmentation.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <KpiCard label="Total Customers" value={totalReceipts.toLocaleString()} sub={`${monthsTracked} months tracked`} badge="Estimated" badgeColor={GOLD} />
        <KpiCard label="Avg Ticket Size" value={m(Math.round(avgTicketSize))} sub={`across ${totalReceipts.toLocaleString()} transactions`} badge={avgTicketSize > 150 ? 'Premium' : 'Standard'} badgeColor={avgTicketSize > 150 ? SAGE : T2} />
        <KpiCard label="Repeat Rate" value={`${estimatedRepeatPct.toFixed(0)}%`} sub={`${estimatedRepeatCustomers.toLocaleString()} repeat customers`} badge={estimatedRepeatPct > 50 ? 'Strong' : 'Growing'} badgeColor={estimatedRepeatPct > 50 ? SAGE : AMBER} />
        <KpiCard label="Card Loyalty" value={`${cardShare.toFixed(1)}%`} sub="payment via card → repeat proxy" badge={cardShare > 70 ? 'High' : 'Moderate'} badgeColor={cardShare > 70 ? SAGE : STEEL} />
      </div>

      {/* Loyalty Tiers */}
      <ChartCard title="Customer Loyalty Tier Distribution" className="mb-3">
        <div className="grid grid-cols-5 gap-3">
          {loyaltyTiers.map((tier, i) => (
            <div key={i} style={{ textAlign: 'center', padding: 16, background: `${tier.color}08`, border: `1px solid ${tier.color}22`, borderRadius: 10 }}>
              <tier.icon size={18} style={{ color: tier.color, marginBottom: 8 }} />
              <div style={{ fontSize: 20, fontFamily: 'Georgia, serif', color: tier.color, lineHeight: 1 }}>{tier.pct}%</div>
              <div style={{ fontSize: 10, color: T1, fontWeight: 500, marginTop: 4 }}>{tier.name}</div>
              <div style={{ fontSize: 8, color: T3, marginTop: 2 }}>{tier.desc}</div>
              <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${tier.pct}%`, background: tier.color, transition: 'width 0.3s' }} />
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      <div className="grid grid-cols-2 gap-3">
        {/* Ticket Size Trend */}
        <ChartCard title="Average Ticket Size Trend">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={ticketTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={axisTick} />
              <YAxis tick={axisTick} tickFormatter={v => m(v)} />
              <Tooltip content={<AEDTooltip />} />
              <Area type="monotone" dataKey="Ticket Size" stroke={GOLD} fill={`${GOLD}22`} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Retention trend */}
        <ChartCard title="Estimated Repeat Customer Rate">
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={retentionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={axisTick} />
              <YAxis tick={axisTick} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Tooltip content={<AEDTooltip />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: T2 }} />
              <Bar dataKey="Repeat Rate" fill={SAGE} radius={[3, 3, 0, 0]} barSize={20} opacity={0.7} />
              <Line dataKey="Card Share" stroke={GOLD} strokeWidth={2} dot={{ r: 3, fill: GOLD }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Segment Revenue Comparison */}
      <ChartCard title="Revenue by Customer Segment" className="mt-3">
        <div className="grid grid-cols-3 gap-4">
          <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: T3, marginBottom: 6 }}>New Customers</div>
            <div style={{ fontSize: 24, fontFamily: 'Georgia, serif', color: T1, lineHeight: 1 }}>{estimatedNewCustomers.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: T2, marginTop: 4 }}>Avg {m(Math.round(avgRevenuePerNew))} / customer</div>
            <div style={{ fontSize: 9, color: ROSE, marginTop: 2 }}>{m(Math.round(totalNet * estimatedNewPct / 100))} total revenue</div>
          </div>
          <div style={{ padding: 20, background: 'rgba(88,152,122,0.04)', borderRadius: 8, textAlign: 'center', border: `1px solid rgba(88,152,122,0.15)` }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: SAGE, marginBottom: 6 }}>Repeat Customers</div>
            <div style={{ fontSize: 24, fontFamily: 'Georgia, serif', color: SAGE, lineHeight: 1 }}>{estimatedRepeatCustomers.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: T2, marginTop: 4 }}>Avg {m(Math.round(avgRevenuePerRepeat))} / customer</div>
            <div style={{ fontSize: 9, color: SAGE, marginTop: 2 }}>{m(Math.round(totalNet * estimatedRepeatPct / 100))} total revenue</div>
          </div>
          <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: T3, marginBottom: 6 }}>Purchase Frequency</div>
            <div style={{ fontSize: 24, fontFamily: 'Georgia, serif', color: GOLD, lineHeight: 1 }}>{avgFrequencyPerCustomer}×</div>
            <div style={{ fontSize: 10, color: T2, marginTop: 4 }}>avg visits per customer / year</div>
            <div style={{ fontSize: 9, color: T3, marginTop: 2 }}>Based on {monthsTracked} months of data</div>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE 15: DATA CENTER
// ══════════════════════════════════════════════════════════════════
function DataCenterPage({ data }: { data: StoreData }) {
  const { isAggregate, branchNames, currency: cur } = data;
  // ── State ──
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [uploadResults, setUploadResults] = useState<Record<string, any>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [manualForm, setManualForm] = useState({
    rent: '', salaries: '', utilities: '', software: '', marketingBudget: '',
    period: '', revenue: '', cogs: '', grossProfit: '', grossMargin: '', totalExpenses: '', netProfitLoss: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState('');

  // ── Fetch with timeout helper ──
  const fetchWithTimeout = async (url: string, options?: RequestInit, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (e: any) {
      clearTimeout(e);
      if (e.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw e;
    }
  };

  // ── Fetch status ──
  const fetchStatus = async () => {
    try {
      const res = await fetchWithTimeout('/api/data/status');
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error('Failed to fetch status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // ── Handlers ──
  const handleSeed = async () => {
    if (isAggregate) return; // Cannot seed aggregate view
    setSeeding(true);
    try {
      const currentView = loadViewMode();
      const branchSlug = currentView.type === 'branch' ? currentView.slug : DEFAULT_BRANCH_SLUG;
      const res = await fetch('/api/data/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, branchSlug }),
      });
      const data = await res.json();
      setSeedResult(data);
      if (data.success) {
        setSeeded(true);
        window.dispatchEvent(new Event('parfumix:data-changed'));
      }
      fetchStatus();
    } catch (e) {
      console.error('Seed failed:', e);
    } finally {
      setSeeding(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await fetch('/api/data/reset', { method: 'DELETE' });
      setSeedResult(null);
      setSeeded(false);
      setUploadResults({});
      setResetDone(true);
      setTimeout(() => setResetDone(false), 3000);
      fetchStatus();
      window.dispatchEvent(new Event('parfumix:data-changed'));
    } catch (e) {
      console.error('Reset failed:', e);
    } finally {
      setResetting(false);
    }
  };

  const handleUpload = async (category: string) => {
    const fileInput = document.getElementById(`file-${category}`) as HTMLInputElement;
    if (!fileInput?.files?.length) return;

    setUploading(prev => ({ ...prev, [category]: true }));
    try {
      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      formData.append('category', category);
      const res = await fetch('/api/data/upload', { method: 'POST', body: formData });
      const data = await res.json();
      setUploadResults(prev => ({ ...prev, [category]: data }));
      fetchStatus();
      if (data.success) window.dispatchEvent(new Event('parfumix:data-changed'));
    } catch (e) {
      console.error('Upload failed:', e);
    } finally {
      setUploading(prev => ({ ...prev, [category]: false }));
    }
  };

  const handleManualSave = async () => {
    setSaving(true);
    setSaveResult('');
    try {
      const res = await fetch('/api/data/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, manualData: manualForm }),
      });
      const data = await res.json();
      setSaveResult(data.success ? 'Data saved successfully' : 'Failed to save data');
      fetchStatus();
      if (data.success) window.dispatchEvent(new Event('parfumix:data-changed'));
    } catch {
      setSaveResult('Error saving data');
    } finally {
      setSaving(false);
    }
  };

  // ── Computed ──
  const statusCategories = [
    { key: 'monthlySales', label: 'Monthly Sales', color: GOLD },
    { key: 'dailySales', label: 'Daily Sales', color: SAGE },
    { key: 'capexItems', label: 'CAPEX Items', color: AMBER },
    { key: 'overheads', label: 'Overheads', color: STEEL },
    { key: 'pnlPeriods', label: 'P&L Periods', color: ROSE },
    { key: 'products', label: 'Products', color: GOLD },
    { key: 'staffCosts', label: 'Staff Costs', color: SAGE },
    { key: 'marketingSpends', label: 'Marketing', color: AMBER },
    { key: 'transactionSummaries', label: 'Transactions', color: STEEL },
  ];

  const hasDataKeys = [
    'monthlySales', 'dailySales', 'capex', 'overheads',
    'pnl', 'products', 'staffCosts', 'marketing', 'transactions',
  ];

  const overallCompleteness = status?.hasData
    ? Math.round((Object.values(status.hasData).filter(Boolean).length / hasDataKeys.length) * 100)
    : 0;

  const uploadZones = [
    { category: 'monthly-sales', title: 'Monthly Sales', icon: BarChart3, color: GOLD, description: 'CSV: month, year, gross, returns, net, cash, card', placeholder: 'month,year,gross,returns,net,cash,card\n10,2025,125000,3200,121800,28500,93300' },
    { category: 'capex', title: 'CAPEX Items', icon: PieChartIcon, color: AMBER, description: 'CSV: name, amount, category', placeholder: 'name,amount,category\nKey Money,190000,Lease\nFit-out,120000,Fit-out' },
    { category: 'overheads', title: 'Overheads', icon: DollarSign, color: STEEL, description: 'CSV: name, amount', placeholder: 'name,amount\nTrade License,15000\nInsurance,8000' },
    { category: 'products', title: 'Products / SKU', icon: Package, color: SAGE, description: 'CSV: name, sku, category, unit_cost, selling_price, quantity, revenue', placeholder: 'name,sku,category,unit_cost,selling_price,quantity,revenue\nOud Perfume,PFM001,Perfume,85,350,45,15750' },
    { category: 'monthly-sales', title: 'P&L Expenses', icon: Receipt, color: ROSE, description: 'CSV: name, amount (uploaded as expenses within a P&L period)', placeholder: 'name,amount\nStaff Salaries,25000\nRent,19000\nUtilities,3500' },
    { category: 'transactions', title: 'Transactions', icon: CreditCard, color: GOLD, description: 'CSV: month, year, receipts, revenue', placeholder: 'month,year,receipts,revenue\n10,2025,380,125000\n11,2025,420,138000' },
  ];

  const recentUploads = status?.recentUploads || [];

  // ── Shared styles ──
  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`,
    borderRadius: 6, padding: '8px 12px', color: T1, fontSize: 11,
    width: '100%', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  };
  const btnStyle = (bg: string, hoverBg: string, textColor = '#fff'): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: 6, fontSize: 10, fontWeight: 600,
    border: 'none', cursor: 'pointer', background: bg, color: textColor,
    fontFamily: 'inherit', letterSpacing: '0.04em', textTransform: 'uppercase' as const,
  });
  const labelStyle: React.CSSProperties = { fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: T3, marginBottom: 6 };

  // ── Render ──
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={24} style={{ color: GOLD, animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 11, color: T3, marginTop: 12 }}>Loading database status…</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ═══ Section Header ═══ */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, color: T1, marginBottom: 4 }}>Data Center</h2>
        <p style={{ fontSize: 11, color: T3 }}>Manage database content — seed, upload, reset, and track data completeness</p>
      </div>

      {/* Aggregate view warning */}
      {isAggregate && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
          padding: '10px 16px', borderRadius: 8,
          background: `${AMBER}10`, border: `1px solid ${AMBER}25`,
        }}>
          <AlertCircle size={14} style={{ color: AMBER }} />
          <div>
            <div style={{ fontSize: 10, color: T1, fontWeight: 500 }}>Aggregate View — Data operations unavailable</div>
            <div style={{ fontSize: 9, color: T3, marginTop: 2 }}>
              Switch to an individual branch to seed, upload, or reset data. {branchNames.length} branches currently have data.
            </div>
          </div>
        </div>
      )}

      {/* ═══ Section 1: Database Status Bar ═══ */}
      <ChartCard title="Database Status" wide>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: overallCompleteness >= 80 ? `${SAGE}18` : overallCompleteness >= 40 ? `${AMBER}18` : `${ROSE}18`,
              border: `2px solid ${overallCompleteness >= 80 ? SAGE : overallCompleteness >= 40 ? AMBER : ROSE}`,
            }}>
              <span style={{ fontSize: 18, fontFamily: 'Georgia, serif', fontWeight: 700, color: overallCompleteness >= 80 ? SAGE : overallCompleteness >= 40 ? AMBER : ROSE }}>
                {overallCompleteness}%
              </span>
            </div>
            <div>
              <div style={{ fontSize: 12, color: T1, fontWeight: 500 }}>Overall Completeness</div>
              <div style={{ fontSize: 10, color: T3 }}>
                {Object.values(status?.hasData || {}).filter(Boolean).length} of {hasDataKeys.length} categories have data
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSeed}
              disabled={seeding || seeded}
              style={{
                ...btnStyle(seeded ? `${SAGE}44` : GOLD, GOLD),
                opacity: seeding || seeded ? 0.6 : 1,
                cursor: seeding || seeded ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Database size={13} />
              {seeding ? 'Seeding…' : seeded ? 'Seeded ✓' : 'Seed Database'}
            </button>
            <button
              onClick={handleReset}
              disabled={resetting}
              style={{
                ...btnStyle(resetDone ? `${SAGE}44` : `${ROSE}22`, ROSE, ROSE),
                opacity: resetting ? 0.6 : 1, border: `1px solid ${ROSE}44`,
              }}
            >
              {resetting ? 'Resetting…' : resetDone ? 'Reset ✓' : 'Reset All Data'}
            </button>
          </div>
        </div>

        {/* Category status cards */}
        <div className="grid grid-cols-3 gap-2" style={{ marginBottom: 4 }}>
          {statusCategories.map(cat => {
            const has = status?.hasData?.[cat.key] ?? false;
            const count = status?.counts?.[cat.key] ?? 0;
            return (
              <div key={cat.key} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 8,
                background: has ? `${cat.color}08` : 'rgba(255,255,255,0.015)',
                border: `1px solid ${has ? `${cat.color}22` : BORDER}`,
              }}>
                {has ? (
                  <CheckCircle2 size={16} style={{ color: SAGE, flexShrink: 0 }} />
                ) : (
                  <XCircle size={16} style={{ color: ROSE, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: has ? T1 : T2, fontWeight: has ? 500 : 400 }}>{cat.label}</div>
                  <div style={{ fontSize: 9, color: T3 }}>
                    {has ? `${count} record${count !== 1 ? 's' : ''}` : 'No data'}
                  </div>
                </div>
                <div style={{
                  fontSize: 8, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                  background: has ? `${SAGE}18` : `${ROSE}18`, color: has ? SAGE : ROSE,
                }}>
                  {has ? 'OK' : 'EMPTY'}
                </div>
              </div>
            );
          })}
        </div>
      </ChartCard>

      {/* ═══ Section 2: One-Click Seed ═══ */}
      <ChartCard title="One-Click Data Seed" wide className="mt-3">
        <div style={{
          display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <p style={{ fontSize: 11, color: T2, lineHeight: 1.7, marginBottom: 14 }}>
              Click <span style={{ color: GOLD, fontWeight: 600 }}>Load Existing Data</span> to populate the database with verified Parfumix ADCB kiosk data.
              This includes all figures extracted from the original POS daywise reports, CAPEX summary, and P&L statement.
            </p>
            <div className="grid grid-cols-2 gap-2" style={{ marginBottom: 16 }}>
              {[
                { label: 'Monthly Sales', value: '6 months (Oct 2025 – Mar 2026)', color: GOLD },
                { label: 'Daily Sales', value: '181 daily revenue records', color: SAGE },
                { label: 'CAPEX Items', value: '17 items across 8 categories', color: AMBER },
                { label: 'Overheads', value: '4 pre-launch overhead items', color: STEEL },
                { label: 'P&L Period', value: '1 period with 27 expense lines', color: ROSE },
                { label: 'Source', value: 'Verified POS & P&L documents', color: T2 },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 9, color: T3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: T2 }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleSeed}
              disabled={seeding || seeded}
              style={{
                ...btnStyle(seeded ? `${SAGE}44` : GOLD, GOLD),
                padding: '10px 24px', fontSize: 11,
                opacity: seeding || seeded ? 0.6 : 1,
                cursor: seeding || seeded ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <Upload size={14} />
              {seeding ? 'Loading Data…' : seeded ? 'Data Loaded Successfully' : 'Load Existing Data'}
            </button>
          </div>

          {/* Seed result panel */}
          <div style={{
            width: 280, flexShrink: 0, padding: 16, borderRadius: 8,
            background: seedResult?.success ? `${SAGE}08` : seedResult ? `${ROSE}08` : 'rgba(255,255,255,0.015)',
            border: `1px solid ${seedResult?.success ? `${SAGE}22` : seedResult ? `${ROSE}22` : BORDER}`,
          }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: T3, marginBottom: 10 }}>
              Seed Result
            </div>
            {seedResult?.success ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <CheckCircle2 size={14} style={{ color: SAGE }} />
                  <span style={{ fontSize: 11, color: SAGE, fontWeight: 500 }}>Success</span>
                </div>
                {seedResult.results && Object.entries(seedResult.results).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ fontSize: 10, color: T2 }}>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span style={{ fontSize: 10, color: T1, fontVariantNumeric: 'tabular-nums' }}>{String(val)}</span>
                  </div>
                ))}
              </div>
            ) : seedResult ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <XCircle size={14} style={{ color: ROSE }} />
                  <span style={{ fontSize: 11, color: ROSE, fontWeight: 500 }}>Error</span>
                </div>
                <span style={{ fontSize: 10, color: T2 }}>{seedResult.error || 'Seed failed'}</span>
              </div>
            ) : (
              <div style={{ fontSize: 10, color: T3, fontStyle: 'italic' }}>No seed operation yet</div>
            )}
          </div>
        </div>
      </ChartCard>

      {/* ═══ Section 3: CSV Upload Zones ═══ */}
      <div style={{ marginTop: 16, marginBottom: 12 }}>
        <h3 style={{ fontSize: 12, color: T1, marginBottom: 4 }}>CSV Upload Zones</h3>
        <p style={{ fontSize: 10, color: T3 }}>Upload CSV or TSV files for each data category. First row must be headers.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {uploadZones.map(zone => {
          const isUploading = uploading[zone.category] || false;
          // use a stable key for result lookup based on zone title
          const resultKey = zone.title === 'P&L Expenses' ? 'pnl-expenses' : zone.category;
          const uploadResult = uploadResults[resultKey];
          return (
            <div key={zone.title} style={{
              background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10,
              padding: 16, display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${zone.color}12`,
                }}>
                  <zone.icon size={16} style={{ color: zone.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T1, fontWeight: 500 }}>{zone.title}</div>
                  <div style={{ fontSize: 9, color: T3 }}>{zone.description}</div>
                </div>
              </div>

              {/* Category badge */}
              <div style={{
                display: 'inline-block', marginBottom: 10, padding: '2px 8px', borderRadius: 4,
                background: `${zone.color}12`, fontSize: 8, color: zone.color, fontWeight: 600,
                letterSpacing: '0.06em', width: 'fit-content',
              }}>
                Category: {zone.category}
              </div>

              {/* File input area */}
              <div style={{
                border: `1px dashed ${BORDER}`, borderRadius: 6, padding: 12,
                marginBottom: 10, textAlign: 'center', cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
                onClick={() => document.getElementById(`file-${resultKey}`)?.click()}
              >
                <FileSpreadsheet size={18} style={{ color: T3, marginBottom: 4 }} />
                <div style={{ fontSize: 9, color: T3 }}>
                  Click to select .csv / .tsv
                </div>
                <input
                  id={`file-${resultKey}`}
                  type="file"
                  accept=".csv,.tsv"
                  style={{ display: 'none' }}
                  onChange={() => {}} // file is read on upload
                />
              </div>

              {/* Upload button */}
              <button
                onClick={() => handleUpload(zone.category === 'monthly-sales' && zone.title === 'P&L Expenses' ? 'overheads' : zone.category)}
                disabled={isUploading}
                style={{
                  ...btnStyle(isUploading ? T3 : zone.color, zone.color),
                  opacity: isUploading ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%',
                }}
              >
                <Upload size={12} />
                {isUploading ? 'Uploading…' : 'Upload'}
              </button>

              {/* Result display */}
              {uploadResult && (
                <div style={{
                  marginTop: 10, padding: '8px 10px', borderRadius: 6, fontSize: 9,
                  background: uploadResult.success ? `${SAGE}08` : `${ROSE}08`,
                  border: `1px solid ${uploadResult.success ? `${SAGE}22` : `${ROSE}22`}`,
                }}>
                  {uploadResult.success ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={12} style={{ color: SAGE }} />
                      <span style={{ color: SAGE }}>
                        {uploadResult.rowCount} row{uploadResult.rowCount !== 1 ? 's' : ''} imported from {uploadResult.fileName}
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <XCircle size={12} style={{ color: ROSE }} />
                      <span style={{ color: ROSE }}>{uploadResult.error || 'Upload failed'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ Section 4: Manual Input Form ═══ */}
      <ChartCard title="Manual Input — Key Metrics" wide className="mt-3">
        <p style={{ fontSize: 10, color: T3, marginBottom: 16 }}>
          Enter key financial metrics below. Values should be in AED. Use the &quot;Seed Database&quot; button above for the full verified dataset.
        </p>

        <div className="grid grid-cols-2 gap-6">
          {/* Fixed Costs */}
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: GOLD, marginBottom: 12, fontWeight: 600 }}>
              Fixed Costs (Monthly)
            </div>
            <div className="flex flex-col gap-3">
              {[
                { key: 'rent' as const, label: 'Rent', placeholder: 'e.g. 19000' },
                { key: 'salaries' as const, label: 'Salaries', placeholder: 'e.g. 25000' },
                { key: 'utilities' as const, label: 'Utilities', placeholder: 'e.g. 3500' },
                { key: 'software' as const, label: 'Software / POS', placeholder: 'e.g. 1500' },
                { key: 'marketingBudget' as const, label: 'Marketing Budget', placeholder: 'e.g. 5000' },
              ].map(field => (
                <div key={field.key}>
                  <label style={labelStyle}>{field.label}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 10, color: T3,
                    }}>AED</span>
                    <input
                      type="number"
                      placeholder={field.placeholder}
                      value={manualForm[field.key]}
                      onChange={e => setManualForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      style={{ ...inputStyle, paddingLeft: 42 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* P&L Summary */}
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: SAGE, marginBottom: 12, fontWeight: 600 }}>
              P&L Summary
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label style={labelStyle}>Period</label>
                <input
                  type="text"
                  placeholder="e.g. Sep–Dec 2025"
                  value={manualForm.period}
                  onChange={e => setManualForm(prev => ({ ...prev, period: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              {[
                { key: 'revenue' as const, label: 'Revenue' },
                { key: 'cogs' as const, label: 'COGS' },
                { key: 'grossProfit' as const, label: 'Gross Profit' },
                { key: 'grossMargin' as const, label: 'Gross Margin %' },
                { key: 'totalExpenses' as const, label: 'Total Expenses' },
                { key: 'netProfitLoss' as const, label: 'Net Profit / Loss' },
              ].map(field => (
                <div key={field.key}>
                  <label style={labelStyle}>{field.label}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 10, color: T3,
                    }}>
                      {field.key === 'grossMargin' ? '%' : 'AED'}
                    </span>
                    <input
                      type="number"
                      placeholder={field.key === 'grossMargin' ? 'e.g. 73.1' : 'e.g. 250000'}
                      value={manualForm[field.key]}
                      onChange={e => setManualForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      style={{ ...inputStyle, paddingLeft: field.key === 'grossMargin' ? 30 : 42 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleManualSave}
            disabled={saving}
            style={{
              ...btnStyle(GOLD, GOLD),
              opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {saving ? 'Saving…' : 'Save Metrics'}
          </button>
          {saveResult && (
            <span style={{
              fontSize: 10, fontWeight: 500,
              color: saveResult.includes('success') ? SAGE : ROSE,
            }}>
              {saveResult.includes('success') ? '✓ ' : '✗ '}{saveResult}
            </span>
          )}
        </div>
      </ChartCard>

      {/* ═══ Section 5: Upload History ═══ */}
      <ChartCard title="Upload History" wide className="mt-3">
        {recentUploads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <FileSpreadsheet size={24} style={{ color: T3, marginBottom: 8 }} />
            <div style={{ fontSize: 11, color: T3 }}>No uploads yet. Seed the database or upload CSV files to get started.</div>
          </div>
        ) : (
          <div style={{ maxHeight: 384, overflowY: 'auto' }}>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, background: CARD_BG }}>
                  {['Date', 'Category', 'File Name', 'Rows', 'Status'].map(h => (
                    <th key={h} style={{
                      textAlign: h === 'Rows' || h === 'Date' ? 'right' : 'left',
                      color: T3, padding: '8px 0', fontWeight: 400, fontSize: 9,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentUploads.map((u: any, i: number) => {
                  const statusColor = u.status === 'success' ? SAGE : u.status === 'error' ? ROSE : AMBER;
                  const statusLabel = u.status === 'success' ? 'OK' : u.status === 'error' ? 'FAIL' : 'PARTIAL';
                  return (
                    <tr key={u.id || i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: '7px 0', color: T2, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 10 }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td style={{ padding: '7px 0' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 600,
                          background: `${statusColor}12`, color: statusColor,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                          {u.category}
                        </span>
                      </td>
                      <td style={{ padding: '7px 0', color: T1, fontSize: 10 }}>{u.fileName}</td>
                      <td style={{ padding: '7px 0', color: T1, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 10 }}>
                        {u.rowCount}
                      </td>
                      <td style={{ padding: '7px 0', textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 600,
                          background: `${statusColor}12`, color: statusColor,
                        }}>
                          {u.status === 'success' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE 11: DATA INTELLIGENCE & RECOMMENDATIONS
// ══════════════════════════════════════════════════════════════════
function GapsPage({ data }: { data: StoreData }) {
  const { totalNet, avgReturnRate, pnl: PNL, totalInvestment: TOTAL_INVESTMENT, totalCapex: TOTAL_CAPEX, totalOverheads: TOTAL_OVERHEADS } = data;
  // — Data for Section 1 —
  const overallScore = 45;
  const subScores = [
    { label: 'Revenue Data', score: 85, color: SAGE },
    { label: 'Financial Data', score: 70, color: GOLD },
    { label: 'Operational Data', score: 20, color: ROSE },
  ];
  const radarData = [
    { axis: 'Revenue', value: 85, fullMark: 100 },
    { axis: 'Financial', value: 70, fullMark: 100 },
    { axis: 'Operational', value: 20, fullMark: 100 },
  ];

  // — Data for Section 2 —
  const verifiedData = [
    {
      title: 'Revenue (6 months)',
      confidence: 'HIGH',
      confidenceColor: SAGE,
      icon: Receipt,
      details: [
        'Monthly net / gross / returns / cash + card split',
        'Daily revenue data per month with day-of-week alignment',
        '6 months: Oct 2025 – Mar 2026',
      ],
      source: 'POS Daywise Reports',
      stats: [
        { label: 'Months covered', value: '6' },
        { label: 'Total net', value: aed(totalNet) },
        { label: 'Avg return rate', value: pct(avgReturnRate) },
      ],
    },
    {
      title: 'P&L (4 months)',
      confidence: 'HIGH',
      confidenceColor: SAGE,
      icon: BarChart2,
      details: [
        `Covers ${PNL.period}`,
        '27 expense line items',
        `Gross margin verified: ${PNL.grossMargin}%`,
        'Missing: Jan–Mar 2026',
      ],
      source: 'ADCB P&L Statement',
      stats: [
        { label: 'Months covered', value: '4' },
        { label: 'Expense lines', value: '27' },
        { label: 'Gross margin', value: `${PNL.grossMargin}%` },
      ],
    },
    {
      title: 'CAPEX (one-time)',
      confidence: 'HIGH',
      confidenceColor: SAGE,
      icon: Package,
      details: [
        '17 items across 8 categories',
        `Total investment: ${aed(TOTAL_INVESTMENT)}`,
        `Setup: ${aed(TOTAL_CAPEX)} + Overheads: ${aed(TOTAL_OVERHEADS)}`,
      ],
      source: 'CAPEX Summary',
      stats: [
        { label: 'Items', value: '17' },
        { label: 'Categories', value: '8' },
        { label: 'Total', value: aed(TOTAL_INVESTMENT) },
      ],
    },
  ];

  // — Data for Section 3 —
  type MissingItem = {
    icon: React.FC<{ size?: number; style?: React.CSSProperties }>;
    name: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    impact: string;
    source: string;
  };
  const missingData: MissingItem[] = [
    { icon: Receipt, name: 'Transaction-level data (receipt count, avg ticket/basket size)', priority: 'CRITICAL', impact: 'Real avg order value, conversion rate, items per transaction', source: 'POS system export' },
    { icon: Package, name: 'Product/SKU-level sales', priority: 'CRITICAL', impact: 'Best/worst sellers, category margins, inventory velocity, reorder points', source: 'POS inventory module' },
    { icon: BarChart2, name: 'P&L for Jan–Mar 2026', priority: 'CRITICAL', impact: 'Actual monthly net profit trend, validate if operation is profitable', source: 'Accountant / bookkeeper' },
    { icon: Store, name: 'Monthly rent & lease terms', priority: 'CRITICAL', impact: 'True breakeven analysis, rent-to-revenue ratio', source: 'Lease agreement' },
    { icon: Users, name: 'Staff costs breakdown (salaries, commissions, visa, accommodation)', priority: 'HIGH', impact: 'True labour cost ratio, staff productivity (revenue per staff hour)', source: 'HR / payroll' },
    { icon: Package, name: 'Inventory on hand (current stock levels, cost value)', priority: 'HIGH', impact: 'Stock turn ratio, dead stock identification, reorder alerts', source: 'Warehouse / POS' },
    { icon: Target, name: 'Marketing spend details (by channel / campaign)', priority: 'HIGH', impact: 'Marketing ROI, CAC per channel, which campaigns drive traffic', source: 'Marketing team / ad accounts' },
    { icon: Store, name: 'Mall foot traffic data', priority: 'HIGH', impact: 'Capture rate (our sales / total footfall), conversion rate', source: 'Mall management' },
    { icon: Users, name: 'Customer data (loyalty signups, repeat rate, demographics)', priority: 'MEDIUM', impact: 'CLV analysis, cohort tracking', source: 'Loyalty programme / CRM' },
    { icon: RotateCcw, name: 'Return reasons (why products are returned)', priority: 'MEDIUM', impact: 'Root cause analysis, product quality issues', source: 'POS return notes' },
    { icon: Store, name: 'Competitor pricing', priority: 'MEDIUM', impact: 'Price positioning, margin opportunity', source: 'Mystery shopping / market survey' },
    { icon: Clock, name: 'Operating hours & shifts', priority: 'MEDIUM', impact: 'Revenue per hour, optimal staffing schedule', source: 'Staff schedule / timesheet' },
    { icon: ClipboardList, name: 'Supplier terms (payment terms, credit period)', priority: 'LOW', impact: 'Working capital optimization', source: 'Purchase orders' },
    { icon: CalendarDays, name: 'Seasonal calendar (Dubai events, mall promotions)', priority: 'LOW', impact: 'Correlate sales with external events', source: 'Marketing calendar' },
    { icon: BarChart2, name: 'Online presence (social media engagement, reviews)', priority: 'LOW', impact: 'Brand sentiment, digital funnel tracking', source: 'Social analytics' },
  ];

  const priorityColors: Record<string, string> = { CRITICAL: ROSE, HIGH: AMBER, MEDIUM: GOLD, LOW: T3 };
  const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  // — Data for Section 4 —
  const recommendations = [
    { title: 'Add Product Analytics Tab', impact: 'HIGH', impactColor: AMBER, icon: BarChart2, desc: 'Track top 10 SKUs, category performance, margin by product. Enables inventory optimization and assortment decisions.' },
    { title: 'Add Daily Operations Tracker', impact: 'HIGH', impactColor: AMBER, icon: Activity, desc: 'Live/historical daily KPIs: sales target vs actual, returns, foot traffic comparison. Enables daily management decisions.' },
    { title: 'Add Staff Performance View', impact: 'HIGH', impactColor: AMBER, icon: Users, desc: 'Revenue per staff, sales commission tracking, shift productivity. Enables fair compensation and scheduling.' },
    { title: 'Add Breakeven Calculator', impact: 'HIGH', impactColor: AMBER, icon: Calculator, desc: 'Interactive slider for rent, salaries, target margin. Shows daily/weekly/monthly breakeven revenue. Enables goal setting.' },
    { title: 'Add Cash Flow View', impact: 'MEDIUM', impactColor: GOLD, icon: DollarSign, desc: 'Monthly cash inflow/outflow, runway projection, seasonal cash needs. Enables working capital management.' },
    { title: 'Add Customer Insights', impact: 'MEDIUM', impactColor: GOLD, icon: Users, desc: 'New vs repeat customer split, avg time between purchases, loyalty tier distribution. Enables retention strategies.' },
  ];

  // — Data for Section 5 —
  const actionPlan = [
    { phase: 'Week 1–2', color: ROSE, items: ['Get P&L for Jan–Mar 2026', 'Get monthly rent amount', 'Get staff cost details'] },
    { phase: 'Week 3–4', color: AMBER, items: ['Export transaction-level POS data', 'Export product/SKU sales report'] },
    { phase: 'Month 2', color: GOLD, items: ['Request mall foot traffic data', 'Set up marketing tracking by channel'] },
    { phase: 'Month 3', color: SAGE, items: ['Launch loyalty programme', 'Start collecting customer data'] },
    { phase: 'Ongoing', color: STEEL, items: ['Monthly data refresh: P&L', 'Monthly POS export', 'Monthly inventory count'] },
  ];

  return (
    <div>
      {/* ══════════════════════════════════════════════════════════ */}
      {/* SECTION 1: Data Completeness Score                        */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 13, color: T1, marginBottom: 4 }}>Data Completeness Score</h2>
        <p style={{ fontSize: 10, color: T3, marginBottom: 20 }}>How much of the full picture we currently have</p>

        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {/* Left: Donut chart */}
          <ChartCard>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative' }}>
                <DonutChart percentage={overallScore} color={overallScore < 50 ? AMBER : SAGE} size={200} strokeWidth={16} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 42, fontFamily: 'Georgia, serif', color: T1, lineHeight: 1 }}>{overallScore}%</span>
                  <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: T3, marginTop: 4 }}>Overall</span>
                </div>
              </div>

              {/* Sub-scores row */}
              <div style={{ display: 'flex', gap: 24, marginTop: 4 }}>
                {subScores.map((s) => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <DonutChart percentage={s.score} color={s.color} size={56} strokeWidth={5} />
                    <div>
                      <div style={{ fontSize: 14, fontFamily: 'Georgia, serif', color: T1 }}>{s.score}%</div>
                      <div style={{ fontSize: 8, color: T3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          {/* Right: Radar chart */}
          <ChartCard title="Data Completeness Radar">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: T2, fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: T3, fontSize: 8 }} />
                <Radar
                  name="Completeness"
                  dataKey="value"
                  stroke={GOLD}
                  fill={GOLD}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
              {subScores.map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 9, color: T3 }}>{s.label}: {s.score}%</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* SECTION 2: What We Have (Verified)                        */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 13, color: T1, marginBottom: 4 }}>What We Have — Verified</h2>
        <p style={{ fontSize: 10, color: T3, marginBottom: 16 }}>Confirmed data sources already integrated into this dashboard</p>

        <div className="grid grid-cols-3 gap-3">
          {verifiedData.map((item, i) => (
            <div key={i} style={{
              background: CARD_BG, border: `1px solid ${BORDER}`,
              borderRadius: 10, padding: 20,
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: `${item.confidenceColor}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <item.icon size={15} style={{ color: item.confidenceColor }} />
                  </div>
                  <span style={{ fontSize: 12, color: T1, fontWeight: 500 }}>{item.title}</span>
                </div>
              </div>

              {/* Confidence badge */}
              <div style={{ marginBottom: 12 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 4, fontSize: 8, fontWeight: 700,
                  background: `${item.confidenceColor}18`, color: item.confidenceColor,
                }}>
                  <CheckCircle2 size={10} />
                  Confidence: {item.confidence}
                </span>
              </div>

              {/* Details */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px 0' }}>
                {item.details.map((d, j) => (
                  <li key={j} style={{
                    fontSize: 10, color: T2, padding: '3px 0', lineHeight: 1.5,
                    display: 'flex', gap: 6, alignItems: 'flex-start',
                  }}>
                    <span style={{ color: SAGE, fontSize: 9, marginTop: 1 }}>✓</span>
                    {d}
                  </li>
                ))}
              </ul>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 8 }}>
                {item.stats.map((st, j) => (
                  <div key={j} style={{
                    flex: 1, padding: '6px 8px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.02)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 11, color: T1, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{st.value}</div>
                    <div style={{ fontSize: 7, color: T3, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{st.label}</div>
                  </div>
                ))}
              </div>

              {/* Source */}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: 8, color: T3 }}>
                  Source: <span style={{ color: T2 }}>{item.source}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* SECTION 3: Missing Data — Priority Matrix                 */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 13, color: T1, marginBottom: 4 }}>Missing Data — Priority Matrix</h2>
        <p style={{ fontSize: 10, color: T3, marginBottom: 16 }}>15 data gaps ranked by business impact. Collecting these unlocks deeper analysis.</p>

        <ChartCard>
          <div style={{ maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
            <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, background: CARD_BG, zIndex: 1 }}>
                  <th style={{ textAlign: 'left', color: T3, padding: '10px 8px', fontWeight: 400, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em', width: 36 }}></th>
                  <th style={{ textAlign: 'left', color: T3, padding: '10px 8px', fontWeight: 400, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Data Item</th>
                  <th style={{ textAlign: 'left', color: T3, padding: '10px 8px', fontWeight: 400, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em', width: 80 }}>Priority</th>
                  <th style={{ textAlign: 'left', color: T3, padding: '10px 8px', fontWeight: 400, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Unlocks</th>
                  <th style={{ textAlign: 'left', color: T3, padding: '10px 8px', fontWeight: 400, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em', width: 140 }}>Where to Get It</th>
                </tr>
              </thead>
              <tbody>
                {[...missingData].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).map((item, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '10px 8px' }}>
                      <item.icon size={14} style={{ color: priorityColors[item.priority], opacity: 0.7 }} />
                    </td>
                    <td style={{ padding: '10px 8px', color: T1, fontWeight: 400 }}>{item.name}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                        fontSize: 8, fontWeight: 700, letterSpacing: '0.06em',
                        background: `${priorityColors[item.priority]}20`, color: priorityColors[item.priority],
                      }}>
                        {item.priority}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', color: T2, lineHeight: 1.5 }}>{item.impact}</td>
                    <td style={{ padding: '10px 8px', color: T3, fontStyle: 'italic' }}>{item.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Priority legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: priorityColors[p], display: 'inline-block' }} />
                <span style={{ fontSize: 8, color: T3 }}>{p}: {missingData.filter(m => m.priority === p).length} items</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* SECTION 4: Dashboard Enhancement Recommendations          */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 13, color: T1, marginBottom: 4 }}>Dashboard Enhancement Recommendations</h2>
        <p style={{ fontSize: 10, color: T3, marginBottom: 16 }}>6 new capabilities to add based on missing data priorities</p>

        <div className="grid grid-cols-3 gap-3">
          {recommendations.map((rec, i) => (
            <div key={i} style={{
              background: CARD_BG, border: `1px solid ${BORDER}`,
              borderRadius: 10, padding: 20,
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${rec.impactColor}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <rec.icon size={15} style={{ color: rec.impactColor }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: T1, fontWeight: 500, lineHeight: 1.3 }}>{rec.title}</div>
                </div>
              </div>

              {/* Impact badge */}
              <div style={{ marginBottom: 10 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  padding: '2px 8px', borderRadius: 4, fontSize: 8, fontWeight: 700,
                  background: `${rec.impactColor}18`, color: rec.impactColor,
                }}>
                  <TrendingUp size={9} />
                  Impact: {rec.impact}
                </span>
              </div>

              {/* Description */}
              <p style={{ fontSize: 10, color: T2, lineHeight: 1.6, flex: 1 }}>{rec.desc}</p>

              {/* Action */}
              <div style={{
                marginTop: 14, paddingTop: 10, borderTop: `1px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <ArrowRight size={10} style={{ color: GOLD, opacity: 0.6 }} />
                <span style={{ fontSize: 9, color: GOLD, opacity: 0.7 }}>Requires missing data</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* SECTION 5: Data Collection Action Plan                    */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 13, color: T1, marginBottom: 4 }}>Data Collection Action Plan</h2>
        <p style={{ fontSize: 10, color: T3, marginBottom: 20 }}>Phased roadmap to reach 80%+ data completeness</p>

        <ChartCard>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
            {/* Vertical timeline line */}
            <div style={{
              position: 'absolute', left: 47, top: 12, bottom: 12,
              width: 2, background: BORDER,
            }} />

            {actionPlan.map((phase, i) => (
              <div key={i} style={{
                display: 'flex', gap: 16, padding: '14px 0',
                borderTop: i > 0 ? `1px solid ${BORDER}` : 'none',
              }}>
                {/* Timeline dot + label */}
                <div style={{
                  width: 96, flexShrink: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', paddingTop: 2,
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: phase.color,
                    border: `3px solid ${CARD_BG}`,
                    boxShadow: `0 0 0 2px ${phase.color}40`,
                    zIndex: 2,
                  }} />
                  <span style={{
                    fontSize: 9, fontWeight: 600, color: phase.color,
                    marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {phase.phase}
                  </span>
                </div>

                {/* Action items */}
                <div style={{ flex: 1, paddingLeft: 4 }}>
                  {phase.items.map((item, j) => (
                    <div key={j} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '4px 0',
                    }}>
                      <ArrowRight size={10} style={{ color: phase.color, opacity: 0.6, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: T2 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Summary callout */}
          <div style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 8,
            background: `${GOLD}08`, border: `1px solid ${GOLD}20`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <AlertCircle size={13} style={{ color: GOLD }} />
              <span style={{ fontSize: 10, color: GOLD, fontWeight: 600 }}>Target: 80% Data Completeness</span>
            </div>
            <p style={{ fontSize: 10, color: T2, lineHeight: 1.6 }}>
              Completing Phases 1–2 (first month) will bring overall completeness from 45% to approximately 70%. 
              Adding Phase 3 items targets 80%+. The ongoing monthly refresh ensures data stays current.
            </p>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE: PRODUCT ANALYTICS
// ══════════════════════════════════════════════════════════════════
function ProductsPage({ data }: { data: StoreData }) {
  const { currency: cur } = data;
  const m = (n: number) => money(n, cur);
  const mK = (n: number) => moneyK(n, cur);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        let slug = DEFAULT_BRANCH_SLUG;
        try { const v = JSON.parse(localStorage.getItem('parfumix:selectedView') || '{}'); if (v.type === 'branch' && v.slug) slug = v.slug; } catch {}
        const qs = slug !== DEFAULT_BRANCH_SLUG ? `?branchSlug=${encodeURIComponent(slug)}` : '';
        const res = await fetch(`/api/data/products${qs}`).then(r => r.json()).catch(() => []);
        setProducts(res || []);
      } finally { setLoading(false); }
    }
    setLoading(true);
    load();
  }, [data.dataVersion]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><RefreshCw size={20} style={{ color: GOLD, animation: 'spin 1s linear infinite' }} /></div>;
  if (products.length === 0) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <Package size={32} style={{ color: T3, marginBottom: 12 }} />
      <div style={{ fontSize: 13, color: T2 }}>No product data loaded yet</div>
      <div style={{ fontSize: 10, color: T3, marginTop: 6 }}>Upload product data via Data Center or reseed the branch</div>
    </div>
  );

  // Aggregate by product name (total across all months)
  const productTotals = products.reduce((acc: Record<string, any>, p: any) => {
    if (!acc[p.name]) acc[p.name] = { name: p.name, sku: p.sku, category: p.category, revenue: 0, quantitySold: 0, unitCost: p.unitCost, sellingPrice: p.sellingPrice, margin: p.margin };
    acc[p.name].revenue += p.revenue || 0;
    acc[p.name].quantitySold += p.quantitySold || 0;
    return acc;
  }, {});
  const topProducts = Object.values(productTotals).sort((a: any, b: any) => b.revenue - a.revenue);

  // Category totals
  const catTotals = products.reduce((acc: Record<string, any>, p: any) => {
    if (!acc[p.category]) acc[p.category] = { name: p.category, revenue: 0, quantity: 0 };
    acc[p.category].revenue += p.revenue || 0;
    acc[p.category].quantity += p.quantitySold || 0;
    return acc;
  }, {});
  const categoryData = Object.values(catTotals).sort((a: any, b: any) => b.revenue - a.revenue);
  const totalRevenue = categoryData.reduce((s: number, c: any) => s + c.revenue, 0);
  const totalQty = categoryData.reduce((s: number, c: any) => s + c.quantity, 0);
  const avgMargin = products.length > 0 ? products.reduce((s: number, p: any) => s + (p.margin || 0), 0) / products.length : 0;

  const catColorsArr = [GOLD, STEEL, SAGE, AMBER, ROSE, '#7a6fbf', '#bf5f8c'];

  // ── Predictive: Demand scoring per product ──
  const productsByMonth = products.reduce((acc: Record<string, number[]>, p: any) => {
    if (!acc[p.name]) acc[p.name] = [];
    acc[p.name].push(p.quantitySold || 0);
    return acc;
  }, {});
  // Sort by month index
  const monthKeys = [...new Set(products.map((p: any) => `${p.month}-${p.year}`))].sort();
  const productDemandMap: Record<string, ReturnType<typeof productDemandScore>> = {};
  for (const [name, qtyArr] of Object.entries(productsByMonth)) {
    productDemandMap[name] = productDemandScore(qtyArr);
  }

  const highRiskProducts = topProducts.filter(p => productDemandMap[p.name]?.stockoutRisk === 'high').length;
  const accelProducts = topProducts.filter(p => productDemandMap[p.name]?.trend === 'accelerating').length;

  // Monthly revenue by category
  const monthlyByCategory = (() => {
    const months = [...new Set(products.map((p: any) => `${p.month}-${p.year}`))].sort();
    const cats = [...new Set(products.map((p: any) => p.category))];
    return months.map(mk => {
      const [mo, yr] = mk.split('-');
      const entry: any = { month: `${MN[parseInt(mo) - 1]} ${yr}` };
      cats.forEach(cat => {
        const matching = products.filter((p: any) => `${p.month}-${p.year}` === mk && p.category === cat);
        entry[cat] = matching.reduce((s: number, p: any) => s + (p.revenue || 0), 0);
      });
      return entry;
    });
  })();

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-3">
        <KpiCard label="Total Product Revenue" value={m(totalRevenue)} sub={`${topProducts.length} unique products`} badge={`${categoryData.length} categories`} badgeColor={GOLD} />
        <KpiCard label="Total Units Sold" value={totalQty.toLocaleString()} sub={`avg ${m(topProducts.length > 0 ? totalRevenue / topProducts.length : 0)} / product`} />
        <KpiCard label="Avg Gross Margin" value={pct(avgMargin)} sub="Across all SKUs" badge={avgMargin > 65 ? 'Healthy' : 'Low'} badgeColor={avgMargin > 65 ? SAGE : ROSE} />
        <KpiCard label="Demand Signals" value={`${accelProducts} accelerating`} sub={`${highRiskProducts} high stockout risk`} badge="Predicted" badgeColor={STEEL} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <ChartCard title="Revenue by Category">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} innerRadius={55} dataKey="revenue" stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: T3, strokeWidth: 1 }}>
                {categoryData.map((_: any, i: number) => <Cell key={i} fill={catColorsArr[i % catColorsArr.length]} />)}
              </Pie>
              <Tooltip content={<AEDTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 8 Products by Revenue">
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {topProducts.slice(0, 8).map((p: any, i: number) => {
              const demand = productDemandMap[p.name];
              const velColor = demand?.velocity === 'fast' ? SAGE : demand?.velocity === 'moderate' ? GOLD : T3;
              const riskColor = demand?.stockoutRisk === 'high' ? ROSE : demand?.stockoutRisk === 'medium' ? AMBER : 'transparent';
              return (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ width: 20, fontSize: 10, color: T3, textAlign: 'center' }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: T1 }}>{p.name}</div>
                    <div style={{ fontSize: 9, color: T3 }}>
                      {p.category} &middot; {p.quantitySold} units
                      {demand && <span style={{ marginLeft: 6, color: velColor }}>{demand.velocity}</span>}
                      {demand?.trend === 'accelerating' && <span style={{ marginLeft: 4, color: SAGE }}>↑ accel</span>}
                      {demand?.trend === 'declining' && <span style={{ marginLeft: 4, color: ROSE }}>↓ slow</span>}
                      {demand?.reorderPoint > 0 && <span style={{ marginLeft: 6, color: T3 }}>reorder: {demand.reorderPoint}u</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: T1, fontFamily: 'Georgia, serif' }}>{m(p.revenue)}</div>
                    <div style={{ fontSize: 9, color: riskColor === 'transparent' ? T3 : riskColor }}>
                      {demand?.stockoutRisk === 'high' ? '⚠ high risk' : demand?.stockoutRisk === 'medium' ? '● moderate' : pct(p.margin)} margin
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Monthly Revenue by Category" wide>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlyByCategory} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={axisTick} />
            <YAxis tick={axisTick} tickFormatter={v => mK(v)} />
            <Tooltip content={<AEDTooltip />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 9, color: T2 }} />
            {[...new Set(products.map((p: any) => p.category))].map((cat: string, i: number) => (
              <Bar key={cat} dataKey={cat} stackId="a" fill={catColorsArr[i % catColorsArr.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE: STAFF PRODUCTIVITY
// ══════════════════════════════════════════════════════════════════
function StaffPage({ data }: { data: StoreData }) {
  const { currency: cur } = data;
  const m = (n: number) => money(n, cur);
  const mK = (n: number) => moneyK(n, cur);
  const [staff, setStaff] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        let slug = DEFAULT_BRANCH_SLUG;
        try { const v = JSON.parse(localStorage.getItem('parfumix:selectedView') || '{}'); if (v.type === 'branch' && v.slug) slug = v.slug; } catch {}
        const qs = slug !== DEFAULT_BRANCH_SLUG ? `?branchSlug=${encodeURIComponent(slug)}` : '';
        const [scRes, txRes] = await Promise.all([
          fetch(`/api/data/staff-costs${qs}`).then(r => r.json()).catch(() => []),
          fetch(`/api/data/transactions${qs}`).then(r => r.json()).catch(() => []),
        ]);
        setStaff(scRes || []);
        setTransactions(txRes || []);
      } finally { setLoading(false); }
    }
    setLoading(true);
    load();
  }, [data.dataVersion]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><RefreshCw size={20} style={{ color: GOLD, animation: 'spin 1s linear infinite' }} /></div>;
  if (staff.length === 0) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <Users size={32} style={{ color: T3, marginBottom: 12 }} />
      <div style={{ fontSize: 13, color: T2 }}>No staff data loaded yet</div>
      <div style={{ fontSize: 10, color: T3, marginTop: 6 }}>Upload staff cost data via Data Center or reseed the branch</div>
    </div>
  );

  const totalSalary = staff.reduce((s: any, c: any) => s + (c.salary || 0), 0);
  const totalCommission = staff.reduce((s: any, c: any) => s + (c.commission || 0), 0);
  const totalVisa = staff.reduce((s: any, c: any) => s + (c.visa || 0), 0);
  const totalAccom = staff.reduce((s: any, c: any) => s + (c.accommodation || 0), 0);
  const totalOT = staff.reduce((s: any, c: any) => s + (c.overtime || 0), 0);
  const totalOther = staff.reduce((s: any, c: any) => s + (c.other || 0), 0);
  const totalStaffCost = totalSalary + totalCommission + totalVisa + totalAccom + totalOT + totalOther;
  const avgTotal = totalStaffCost / staff.length;

  // Cost breakdown for pie
  const costBreakdown = [
    { name: 'Salary', value: totalSalary },
    { name: 'Commission', value: totalCommission },
    { name: 'Visa', value: totalVisa },
    { name: 'Accommodation', value: totalAccom },
    { name: 'Overtime', value: totalOT },
    { name: 'Other', value: totalOther },
  ].filter(d => d.value > 0);

  const costColors = [GOLD, SAGE, STEEL, AMBER, ROSE, T3];

  // Monthly trend
  const monthlyStaff = staff.map((s: any) => ({
    month: `${MN[s.month - 1]} ${String(s.year).slice(2)}`,
    salary: s.salary,
    commission: s.commission,
    overtime: s.overtime,
    total: s.total || s.salary + s.commission + s.visa + s.accommodation + s.overtime + s.other,
    otRatio: s.total > 0 ? (s.overtime / s.total) * 100 : 0,
  }));

  // Merge with transactions for revenue per staff hour
  const monthlyWithTx = monthlyStaff.map((ms: any) => {
    const tx = transactions.find((t: any) => {
      const [mo, yr] = ms.month.split(' ');
      const monthNum = MN.indexOf(mo) + 1;
      const year = parseInt('20' + yr);
      return t.month === monthNum && t.year === year;
    });
    const revenue = tx?.totalRevenue || 0;
    const receipts = tx?.receiptCount || 0;
    const avgTicket = tx?.avgTicketSize || 0;
    const staffHours = 2 * 26 * 9; // 2 staff, 26 working days, 9 hours each
    return { ...ms, revenue, receipts, avgTicket, revPerStaffHour: staffHours > 0 ? revenue / staffHours : 0, staffHours };
  });

  const totalRevenue = monthlyWithTx.reduce((s: any, m: any) => s + m.revenue, 0);
  const totalReceipts = monthlyWithTx.reduce((s: any, m: any) => s + m.receipts, 0);
  const avgRevPerHour = monthlyWithTx.reduce((s: any, m: any) => s + m.revPerStaffHour, 0) / monthlyWithTx.length;
  const commToRevenue = totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0;

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-3">
        <KpiCard label="Total Staff Cost" value={m(totalStaffCost)} sub={`${staff.length} months tracked`} badge={`avg ${m(avgTotal)}/mo`} badgeColor={GOLD} />
        <KpiCard label="Revenue / Staff Hour" value={m(Math.round(avgRevPerHour))} sub="2 staff × 9hrs × 26 days" badge="Productivity" badgeColor={SAGE} />
        <KpiCard label="Commission Ratio" value={pct(commToRevenue)} sub={`${m(totalCommission)} of ${m(totalRevenue)}`} badge={commToRevenue < 5 ? 'Efficient' : 'High'} badgeColor={commToRevenue < 5 ? SAGE : AMBER} />
        <KpiCard label="Avg Ticket Size" value={totalReceipts > 0 ? m(Math.round(totalRevenue / totalReceipts)) : '—'} sub={`${totalReceipts.toLocaleString()} total receipts`} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <ChartCard title="Staff Cost Breakdown">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={costBreakdown} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" stroke="none">
                {costBreakdown.map((_: any, i: number) => <Cell key={i} fill={costColors[i % costColors.length]} />)}
              </Pie>
              <Tooltip content={<AEDTooltip />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 9, color: T2 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Staff Costs">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyStaff} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={axisTick} fontSize={8} />
              <YAxis tick={axisTick} tickFormatter={v => mK(v)} fontSize={8} />
              <Tooltip content={<AEDTooltip />} />
              <Bar dataKey="salary" name="Salary" fill={GOLD} stackId="a" />
              <Bar dataKey="commission" name="Commission" fill={SAGE} stackId="a" />
              <Bar dataKey="overtime" name="Overtime" fill={ROSE} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue Per Staff Hour Trend">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyWithTx} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={axisTick} fontSize={8} />
              <YAxis tick={axisTick} tickFormatter={v => mK(v)} fontSize={8} />
              <Tooltip content={<AEDTooltip />} />
              <Line type="monotone" dataKey="revPerStaffHour" name="Rev/Staff Hr" stroke={SAGE} strokeWidth={2} dot={{ r: 3, fill: SAGE }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Monthly Staff Details">
        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Month', 'Salary', 'Commission', 'Visa', 'Accom.', 'Overtime', 'Total', 'Revenue', 'Rev/Staff Hr'].map(h => (
                  <th key={h} style={{ padding: '8px 6px', textAlign: 'right', color: T3, fontWeight: 500, textTransform: 'uppercase', fontSize: 8, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyWithTx.map((row: any, i: number) => (
                <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '6px', color: T1 }}>{row.month}</td>
                  {['salary', 'commission', 'visa', 'accommodation', 'overtime', 'total', 'revenue'].map(k => (
                    <td key={k} style={{ padding: '6px', textAlign: 'right', color: T2, fontFamily: 'Georgia, serif', fontSize: 10 }}>{m(row[k] || 0)}</td>
                  ))}
                  <td style={{ padding: '6px', textAlign: 'right', color: SAGE, fontFamily: 'Georgia, serif', fontSize: 10, fontWeight: 600 }}>{m(Math.round(row.revPerStaffHour))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE: MARKETING ROI
// ══════════════════════════════════════════════════════════════════
function MarketingPage({ data }: { data: StoreData }) {
  const { currency: cur } = data;
  const m = (n: number) => money(n, cur);
  const mK = (n: number) => moneyK(n, cur);
  const [marketing, setMarketing] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        let slug = DEFAULT_BRANCH_SLUG;
        try { const v = JSON.parse(localStorage.getItem('parfumix:selectedView') || '{}'); if (v.type === 'branch' && v.slug) slug = v.slug; } catch {}
        const qs = slug !== DEFAULT_BRANCH_SLUG ? `?branchSlug=${encodeURIComponent(slug)}` : '';
        const [mkRes, txRes] = await Promise.all([
          fetch(`/api/data/marketing${qs}`).then(r => r.json()).catch(() => []),
          fetch(`/api/data/transactions${qs}`).then(r => r.json()).catch(() => []),
        ]);
        setMarketing(mkRes || []);
        setTransactions(txRes || []);
      } finally { setLoading(false); }
    }
    setLoading(true);
    load();
  }, [data.dataVersion]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><RefreshCw size={20} style={{ color: GOLD, animation: 'spin 1s linear infinite' }} /></div>;
  if (marketing.length === 0) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <Megaphone size={32} style={{ color: T3, marginBottom: 12 }} />
      <div style={{ fontSize: 13, color: T2 }}>No marketing data loaded yet</div>
      <div style={{ fontSize: 10, color: T3, marginTop: 6 }}>Upload marketing spend data via Data Center or reseed the branch</div>
    </div>
  );

  const totalSpend = marketing.reduce((s: any, m: any) => s + (m.amount || 0), 0);
  const totalRevenue = transactions.reduce((s: any, t: any) => s + (t.totalRevenue || 0), 0);
  const totalReceipts = transactions.reduce((s: any, t: any) => s + (t.receiptCount || 0), 0);
  const marketingROI = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;
  const cac = totalReceipts > 0 ? totalSpend / totalReceipts : 0;
  const marketingToRevenue = totalRevenue > 0 ? (totalSpend / totalRevenue) * 100 : 0;

  // Channel totals
  const channelTotals = marketing.reduce((acc: Record<string, any>, mk: any) => {
    if (!acc[mk.channel]) acc[mk.channel] = { name: mk.channel, amount: 0, count: 0 };
    acc[mk.channel].amount += mk.amount || 0;
    acc[mk.channel].count += 1;
    return acc;
  }, {});
  const channelData = Object.values(channelTotals).sort((a: any, b: any) => b.amount - a.amount);
  const channelColors = [GOLD, STEEL, SAGE, AMBER, ROSE];

  // Monthly spend by channel
  const months = [...new Set(marketing.map((mk: any) => `${mk.month}-${mk.year}`))].sort();
  const channels = [...new Set(marketing.map((mk: any) => mk.channel))];
  const monthlyMarketing = months.map(mk => {
    const [mo, yr] = mk.split('-');
    const entry: any = { month: `${MN[parseInt(mo) - 1]} ${yr}` };
    channels.forEach(ch => {
      entry[ch] = marketing.filter((m: any) => `${m.month}-${m.year}` === mk && m.channel === ch).reduce((s: number, m: any) => s + (m.amount || 0), 0);
    });
    const tx = transactions.find((t: any) => t.month === parseInt(mo) && t.year === parseInt(yr));
    entry.revenue = tx?.totalRevenue || 0;
    entry.spend = Object.entries(entry).filter(([k]) => k !== 'month' && k !== 'revenue' && k !== 'spend').reduce((s: number, [_, v]: any) => s + v, 0);
    return entry;
  });

  const avgMonthlySpend = months.length > 0 ? totalSpend / months.length : 0;

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-3">
        <KpiCard label="Total Marketing Spend" value={m(totalSpend)} sub={`${marketing.length} campaigns across ${months.length} months`} />
        <KpiCard label="Marketing ROI" value={`${marketingROI.toFixed(1)}x`} sub={`${m(totalRevenue)} revenue on ${m(totalSpend)} spend`} badge={marketingROI > 20 ? 'Strong' : marketingROI > 0 ? 'Positive' : 'Negative'} badgeColor={marketingROI > 20 ? SAGE : marketingROI > 0 ? AMBER : ROSE} />
        <KpiCard label="Customer Acq. Cost" value={m(Math.round(cac))} sub={`${totalReceipts} total customers`} badge={cac < 30 ? 'Low CAC' : cac < 60 ? 'Moderate' : 'High CAC'} badgeColor={cac < 30 ? SAGE : cac < 60 ? AMBER : ROSE} />
        <KpiCard label="Spend / Revenue" value={pct(marketingToRevenue)} sub={`avg ${m(Math.round(avgMonthlySpend))}/month`} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <ChartCard title="Spend by Channel">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={channelData} cx="50%" cy="50%" outerRadius={95} innerRadius={50} dataKey="amount" stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: T3, strokeWidth: 1 }}>
                {channelData.map((_: any, i: number) => <Cell key={i} fill={channelColors[i % channelColors.length]} />)}
              </Pie>
              <Tooltip content={<AEDTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Channel Breakdown">
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {channelData.map((ch: any, i: number) => {
              const pctOfTotal = totalSpend > 0 ? (ch.amount / totalSpend) * 100 : 0;
              return (
                <div key={ch.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{ width: 4, height: 28, borderRadius: 2, background: channelColors[i % channelColors.length], flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: T1 }}>{ch.name}</span>
                      <span style={{ fontSize: 11, color: T1, fontFamily: 'Georgia, serif' }}>{m(ch.amount)}</span>
                    </div>
                    <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ width: `${pctOfTotal}%`, height: '100%', borderRadius: 2, background: channelColors[i % channelColors.length] }} />
                    </div>
                    <div style={{ fontSize: 9, color: T3, marginTop: 3 }}>{pctOfTotal.toFixed(0)}% of total &middot; {ch.count} campaign{ch.count !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Monthly Marketing Spend vs Revenue" wide>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={monthlyMarketing} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={axisTick} />
            <YAxis yAxisId="left" tick={axisTick} tickFormatter={v => mK(v)} />
            <YAxis yAxisId="right" orientation="right" tick={axisTick} tickFormatter={v => mK(v)} />
            <Tooltip content={<AEDTooltip />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 9, color: T2 }} />
            <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill={SAGE} radius={[4, 4, 0, 0]} barSize={24} opacity={0.7} />
            <Line yAxisId="right" type="monotone" dataKey="spend" name="Marketing Spend" stroke={ROSE} strokeWidth={2} dot={{ r: 4, fill: ROSE }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SUPPLY CHAIN PAGE
// ══════════════════════════════════════════════════════════════════

function SupplyChainPage({ data }: { data: StoreData }) {
  const [activeTab, setActiveTab] = useState<'stock' | 'smart-order' | 'orders'>('stock');
  const [inventory, setInventory] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [smartOrder, setSmartOrder] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [safetyFactor, setSafetyFactor] = useState(1.3);
  const [includeHealthy, setIncludeHealthy] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const branchSlug = useMemo(() => {
    try {
      const stored = localStorage.getItem(BRANCH_LS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.type === 'branch' && parsed.slug) return parsed.slug;
      }
    } catch {}
    return DEFAULT_BRANCH_SLUG;
  }, []);

  // Fetch inventory & summary
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      try {
        const [invRes, ordRes] = await Promise.all([
          fetch(`/api/supply-chain/inventory?branchSlug=${branchSlug}`),
          fetch(`/api/supply-chain/orders?branchSlug=${branchSlug}&limit=50`),
        ]);
        const invData = await invRes.json();
        const ordData = await ordRes.json();
        if (!cancelled) {
          setInventory(invData.items || []);
          setSummary(invData);
          setOrders(ordData.orders || []);
        }
      } catch (err) {
        console.error('Supply chain load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [branchSlug]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const generateSmartOrder = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/supply-chain/smart-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchSlug, safetyFactor, includeHealthy }),
      });
      const result = await res.json();
      if (result.order) {
        setSmartOrder(result);
        setActiveTab('smart-order');
      } else {
        setToast('No items require reordering right now.');
      }
    } catch {
      setToast('Failed to generate smart order.');
    } finally {
      setGenerating(false);
    }
  };

  const saveOrder = async () => {
    if (!smartOrder?.order) return;
    setSaving(true);
    try {
      const res = await fetch('/api/supply-chain/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchSlug, order: smartOrder.order }),
      });
      const result = await res.json();
      if (result.success) {
        setToast(`Order ${smartOrder.order.orderId} saved successfully!`);
        setSmartOrder(null);
        // Refresh orders
        const ordRes = await fetch(`/api/supply-chain/orders?branchSlug=${branchSlug}&limit=50`);
        const ordData = await ordRes.json();
        setOrders(ordData.orders || []);
      } else {
        setToast(result.error || 'Failed to save order.');
      }
    } catch {
      setToast('Failed to save order.');
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers ──
  const catColor = (cat: string) => {
    switch (cat) {
      case 'Oil': return SAGE;
      case 'Alcohol': return STEEL;
      case 'Combiner': return AMBER;
      case 'Accessories': return GOLD;
      default: return T2;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'draft': return T3;
      case 'submitted': return STEEL;
      case 'approved': return GOLD;
      case 'delivered': return SAGE;
      case 'partial': return AMBER;
      default: return T3;
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case 'CRITICAL': return ROSE;
      case 'LOW': return AMBER;
      case 'OPTIONAL': return SAGE;
      case 'HEALTHY': return SAGE;
      default: return T2;
    }
  };

  const daysColor = (d: number | null) => {
    if (d === null) return SAGE;
    if (d <= 5) return ROSE;
    if (d <= 14) return AMBER;
    return SAGE;
  };

  const filteredInventory = inventory.filter(
    (item) => filterCat === 'all' || item.category === filterCat
  );

  const filteredOrders = orders.filter(
    (o) => filterStatus === 'all' || o.status === filterStatus
  );

  // ── Tab bar ──
  const tabs = [
    { id: 'stock' as const, label: 'Stock Visibility', icon: Package },
    { id: 'smart-order' as const, label: 'Smart Order', icon: Zap },
    { id: 'orders' as const, label: 'Order History', icon: ClipboardList },
  ];

  const tabBtn = (tab: typeof tabs[0]) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
        borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11,
        fontWeight: 500, transition: 'all 0.15s',
        background: activeTab === tab.id ? `${GOLD}18` : 'transparent',
        color: activeTab === tab.id ? GOLD : T2,
        borderBottom: activeTab === tab.id ? `2px solid ${GOLD}` : '2px solid transparent',
      }}
    >
      <tab.icon size={13} />
      {tab.label}
    </button>
  );

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <RefreshCw size={24} style={{ color: GOLD, animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // TAB 1: STOCK VISIBILITY
  // ═══════════════════════════════════════════════════════════════
  const renderStockTab = () => {
    const kpis = [
      { label: 'Total Stock Value', value: aed(summary?.totalStockValueAED || 0), color: GOLD },
      { label: 'Items Tracked', value: String(summary?.itemCount || 0), color: STEEL },
      { label: 'Critical Items', value: String(summary?.criticalCount || 0), color: ROSE },
      { label: 'Slow Moving', value: String(summary?.slowMovingCount || 0), color: AMBER },
    ];

    const categories = ['all', 'Oil', 'Alcohol', 'Combiner', 'Accessories'];

    return (
      <div>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {kpis.map((kpi) => (
            <div key={kpi.label} style={{
              background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8,
              padding: '14px 16px',
            }}>
              <div style={{ fontSize: 9, color: T2, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: kpi.color, fontFamily: 'Georgia, serif' }}>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setFilterCat(cat)} style={{
              padding: '4px 12px', borderRadius: 20, border: `1px solid ${BORDER}`,
              background: filterCat === cat ? `${GOLD}20` : 'transparent',
              color: filterCat === cat ? GOLD : T2, fontSize: 10, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

        {/* Inventory table */}
        <div style={{
          background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8,
          overflow: 'hidden',
        }}>
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Item Name', 'Category', 'Current Stock', 'Min Threshold', 'Unit Cost', 'Stock Value', 'Days Left', 'Status'].map((h) => (
                    <th key={h} style={{
                      padding: '10px 12px', textAlign: 'left', fontWeight: 500,
                      color: T3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em',
                      position: 'sticky', top: 0, background: CARD_BG, zIndex: 1,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: T3, fontSize: 11 }}>
                      No inventory items found.
                    </td>
                  </tr>
                )}
                {filteredInventory.map((item) => {
                  const statusBorder = item.stockStatus === 'CRITICAL' ? ROSE
                    : item.stockStatus === 'LOW' ? AMBER : SAGE;
                  const pctOfThreshold = item.minThresholdL > 0
                    ? Math.min((item.currentQtyL / item.minThresholdL) * 100, 100) : 0;
                  return (
                    <tr key={item.id} style={{
                      borderBottom: `1px solid ${BORDER}`,
                      borderLeft: `3px solid ${statusBorder}`,
                    }}>
                      <td style={{ padding: '10px 12px', color: T1, fontWeight: 500 }}>
                        {item.itemName}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                          fontSize: 9, fontWeight: 600,
                          background: `${catColor(item.category)}18`, color: catColor(item.category),
                        }}>
                          {item.category}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ color: T1, fontWeight: 500 }}>{item.currentQtyL.toFixed(1)} L</span>
                          <div style={{
                            width: 60, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${pctOfThreshold}%`, height: '100%', borderRadius: 2,
                              background: statusBorder,
                            }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: T2 }}>
                        {item.minThresholdL.toFixed(1)} L
                      </td>
                      <td style={{ padding: '10px 12px', color: T2 }}>
                        {aed(item.unitCostAED)}
                      </td>
                      <td style={{ padding: '10px 12px', color: T1, fontWeight: 500 }}>
                        {aed(item.stockValueAED)}
                      </td>
                      <td style={{ padding: '10px 12px', color: daysColor(item.daysRemaining), fontWeight: 600 }}>
                        {item.daysRemaining === null ? '∞' : `${item.daysRemaining}d`}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                          fontSize: 8, fontWeight: 700, letterSpacing: '0.04em',
                          background: `${priorityColor(item.stockStatus)}20`, color: priorityColor(item.stockStatus),
                        }}>
                          {item.stockStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // TAB 2: SMART ORDER
  // ═══════════════════════════════════════════════════════════════
  const renderSmartOrderTab = () => {
    return (
      <div>
        {/* Header */}
        <div style={{
          background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8,
          padding: '20px 24px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Zap size={16} style={{ color: GOLD }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: T1 }}>AI Smart Order Generator</span>
          </div>
          <p style={{ fontSize: 11, color: T2, lineHeight: 1.5, marginBottom: 16 }}>
            Automatically generates a purchase order based on current stock levels, 30-day consumption averages,
            and supplier lead times. The safety factor adds buffer stock to prevent stockouts.
          </p>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
            {/* Safety Factor Slider */}
            <div style={{ flex: '0 0 240px' }}>
              <label style={{ fontSize: 10, color: T2, display: 'block', marginBottom: 6 }}>
                Safety Factor: <span style={{ color: GOLD, fontWeight: 600 }}>{safetyFactor.toFixed(1)}x</span>
              </label>
              <input
                type="range"
                min="1.0"
                max="2.0"
                step="0.1"
                value={safetyFactor}
                onChange={(e) => setSafetyFactor(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: GOLD }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: T3, marginTop: 2 }}>
                <span>1.0x (Lean)</span>
                <span>2.0x (Conservative)</span>
              </div>
            </div>

            {/* Include Healthy Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setIncludeHealthy(!includeHealthy)}
                style={{
                  width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: includeHealthy ? `${SAGE}40` : 'rgba(255,255,255,0.08)',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: 7,
                  background: includeHealthy ? SAGE : T3,
                  position: 'absolute', top: 3,
                  left: includeHealthy ? 19 : 3,
                  transition: 'left 0.2s',
                }} />
              </button>
              <span style={{ fontSize: 10, color: T2 }}>Include Healthy Items</span>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateSmartOrder}
              disabled={generating}
              style={{
                padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: generating ? 'rgba(255,255,255,0.06)' : `${GOLD}18`,
                color: generating ? T3 : GOLD, fontSize: 11, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
              }}
            >
              {generating ? (
                <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Zap size={12} />
              )}
              {generating ? 'Generating...' : 'Generate Order'}
            </button>
          </div>
        </div>

        {/* Generated Order */}
        {smartOrder?.order && (
          <div style={{
            background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8,
            overflow: 'hidden',
          }}>
            {/* Order Header */}
            <div style={{
              padding: '16px 24px', borderBottom: `1px solid ${BORDER}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T1 }}>{smartOrder.order.orderId}</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 8, fontWeight: 700,
                    background: `${GOLD}20`, color: GOLD, letterSpacing: '0.04em',
                  }}>DRAFT</span>
                </div>
                <div style={{ fontSize: 10, color: T2 }}>
                  {new Date(smartOrder.order.dateCreated).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  {' · '}{smartOrder.order.branchName}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, color: T2, marginBottom: 2 }}>Order Total</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: GOLD, fontFamily: 'Georgia, serif' }}>
                  {aed(smartOrder.order.orderTotalAED)}
                </div>
              </div>
            </div>

            {/* Priority Summary */}
            {smartOrder.summary && (
              <div style={{
                padding: '12px 24px', borderBottom: `1px solid ${BORDER}`,
                display: 'flex', gap: 16, flexWrap: 'wrap',
              }}>
                {[
                  { label: 'Critical', count: smartOrder.summary.criticalCount, color: ROSE },
                  { label: 'Low', count: smartOrder.summary.lowCount, color: AMBER },
                  { label: 'Optional', count: smartOrder.summary.healthyCount, color: SAGE },
                  { label: 'Urgent', count: smartOrder.summary.urgentCount, color: '#e04040' },
                ].map((p) => (
                  <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: 2,
                      background: p.color,
                    }} />
                    <span style={{ fontSize: 10, color: T2 }}>{p.label}:</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: p.color }}>{p.count}</span>
                  </div>
                ))}
                <span style={{ fontSize: 10, color: T3, marginLeft: 'auto' }}>
                  {smartOrder.summary.totalLineItems} items · Safety {safetyFactor.toFixed(1)}x
                </span>
              </div>
            )}

            {/* Line Items */}
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {['Item Name', 'Category', 'Current SOH', 'Order Qty', 'Unit Cost', 'Line Total', 'Priority', 'Urgent'].map((h) => (
                      <th key={h} style={{
                        padding: '10px 12px', textAlign: 'left', fontWeight: 500,
                        color: T3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em',
                        position: 'sticky', top: 0, background: CARD_BG, zIndex: 1,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {smartOrder.order.lineItems.map((line: any, idx: number) => (
                    <tr key={idx} style={{
                      borderBottom: `1px solid ${BORDER}`,
                      borderLeft: `3px solid ${priorityColor(line.priority)}`,
                    }}>
                      <td style={{ padding: '10px 12px', color: T1, fontWeight: 500 }}>{line.itemName}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                          fontSize: 9, fontWeight: 600,
                          background: `${catColor(line.category)}18`, color: catColor(line.category),
                        }}>
                          {line.category}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: T2 }}>{line.currentSohL.toFixed(1)} L</td>
                      <td style={{ padding: '10px 12px', color: T1, fontWeight: 600 }}>{line.orderQtyL.toFixed(1)} L</td>
                      <td style={{ padding: '10px 12px', color: T2 }}>{aed(line.unitCostAED)}</td>
                      <td style={{ padding: '10px 12px', color: T1, fontWeight: 600 }}>{aed(line.lineTotalAED)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                          fontSize: 8, fontWeight: 700, letterSpacing: '0.04em',
                          background: `${priorityColor(line.priority)}20`, color: priorityColor(line.priority),
                        }}>
                          {line.priority}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {line.urgent && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '2px 8px', borderRadius: 4, fontSize: 8, fontWeight: 700,
                            background: 'rgba(224,64,64,0.15)', color: '#e04040',
                          }}>
                            <AlertCircle size={9} /> URGENT
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 24px', borderTop: `1px solid ${BORDER}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ fontSize: 9, color: T3, lineHeight: 1.6 }}>
                <span style={{ color: T2 }}>Rules applied:</span> 45-day stock cap · Safety factor {safetyFactor.toFixed(1)}x
                · Rounded to 0.5L increments · Supplier lead time: 3 days
              </div>
              <button
                onClick={saveOrder}
                disabled={saving}
                style={{
                  padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: saving ? 'rgba(255,255,255,0.06)' : `${SAGE}20`,
                  color: saving ? T3 : SAGE, fontSize: 11, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                }}
              >
                {saving ? (
                  <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <CheckCircle2 size={12} />
                )}
                {saving ? 'Saving...' : 'Save Order'}
              </button>
            </div>
          </div>
        )}

        {!smartOrder && (
          <div style={{
            background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8,
            padding: 48, textAlign: 'center',
          }}>
            <Package size={32} style={{ color: T3, marginBottom: 12 }} />
            <div style={{ fontSize: 12, color: T2, marginBottom: 4 }}>No order generated yet</div>
            <div style={{ fontSize: 10, color: T3 }}>
              Adjust the safety factor and click &quot;Generate Order&quot; to create an AI-optimized purchase order.
            </div>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // TAB 3: ORDER HISTORY
  // ═══════════════════════════════════════════════════════════════
  const renderOrdersTab = () => {
    const statuses = ['all', 'draft', 'submitted', 'approved', 'delivered', 'partial'];

    return (
      <div>
        {/* Status Filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {statuses.map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: '4px 12px', borderRadius: 20, border: `1px solid ${BORDER}`,
              background: filterStatus === s ? `${GOLD}20` : 'transparent',
              color: filterStatus === s ? GOLD : T2, fontSize: 10, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 && (
          <div style={{
            background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8,
            padding: 48, textAlign: 'center',
          }}>
            <ClipboardList size={32} style={{ color: T3, marginBottom: 12 }} />
            <div style={{ fontSize: 12, color: T2, marginBottom: 4 }}>No orders found</div>
            <div style={{ fontSize: 10, color: T3 }}>
              Orders generated from Smart Order will appear here.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrder === order.id;
            return (
              <div key={order.id} style={{
                background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8,
                overflow: 'hidden',
              }}>
                {/* Order Row */}
                <div
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  style={{
                    padding: '14px 20px', cursor: 'pointer', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ChevronRight
                      size={14}
                      style={{
                        color: T3, transition: 'transform 0.2s',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: T1 }}>{order.orderId}</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 8, fontWeight: 700,
                          letterSpacing: '0.04em', textTransform: 'uppercase',
                          background: `${statusColor(order.status)}20`, color: statusColor(order.status),
                        }}>
                          {order.status}
                        </span>
                        {order.generatedBy === 'AI' && (
                          <span style={{
                            padding: '1px 6px', borderRadius: 3, fontSize: 7, fontWeight: 600,
                            background: `${GOLD}18`, color: GOLD,
                          }}>AI</span>
                        )}
                      </div>
                      <div style={{ fontSize: 9, color: T3 }}>
                        {new Date(order.dateCreated).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                        {' · '}{order.branchName}
                        {order.notes && ` · ${order.notes}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: GOLD, fontFamily: 'Georgia, serif' }}>
                        {aed(order.orderTotalAED)}
                      </div>
                      <div style={{ fontSize: 9, color: T3 }}>
                        {order.lineItems?.length || 0} items
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Line Items */}
                {isExpanded && order.lineItems && order.lineItems.length > 0 && (
                  <div style={{
                    borderTop: `1px solid ${BORDER}`, maxHeight: 300, overflowY: 'auto',
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                          {['Item', 'Category', 'SOH', 'Qty', 'Cost', 'Total', 'Priority'].map((h) => (
                            <th key={h} style={{
                              padding: '8px 12px', textAlign: 'left', fontWeight: 500,
                              color: T3, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.05em',
                            }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {order.lineItems.map((line: any, idx: number) => (
                          <tr key={idx} style={{ borderBottom: `1px solid ${BORDER}` }}>
                            <td style={{ padding: '8px 12px', color: T1 }}>{line.itemName}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{
                                padding: '1px 6px', borderRadius: 8, fontSize: 8, fontWeight: 600,
                                background: `${catColor(line.category)}18`, color: catColor(line.category),
                              }}>
                                {line.category}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', color: T2 }}>{line.currentSohL?.toFixed(1)} L</td>
                            <td style={{ padding: '8px 12px', color: T1, fontWeight: 500 }}>{line.orderQtyL.toFixed(1)} L</td>
                            <td style={{ padding: '8px 12px', color: T2 }}>{aed(line.unitCostAED)}</td>
                            <td style={{ padding: '8px 12px', color: T1, fontWeight: 600 }}>{aed(line.lineTotalAED)}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{
                                padding: '1px 6px', borderRadius: 3, fontSize: 7, fontWeight: 700,
                                letterSpacing: '0.04em',
                                background: `${priorityColor(line.priority)}20`, color: priorityColor(line.priority),
                              }}>
                                {line.priority}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 60, right: 28, padding: '12px 20px',
          borderRadius: 8, background: '#1a1a22', border: `1px solid ${BORDER}`,
          color: T1, fontSize: 11, fontWeight: 500, zIndex: 1000,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <CheckCircle2 size={14} style={{ color: SAGE }} />
          {toast}
        </div>
      )}

      {/* Tab Bar */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 20,
        borderBottom: `1px solid ${BORDER}`, paddingBottom: 0,
      }}>
        {tabs.map(tabBtn)}
      </div>

      {/* Tab Content */}
      {activeTab === 'stock' && renderStockTab()}
      {activeTab === 'smart-order' && renderSmartOrderTab()}
      {activeTab === 'orders' && renderOrdersTab()}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE: INTEGRATIONS (POS/ERP CONNECTORS)
// ══════════════════════════════════════════════════════════════════

const CONNECTOR_TEMPLATES = [
  { type: 'pos', system: 'magnati', label: 'Magnati POS', desc: 'Magnati (Network Intl) card terminal API', icon: '💳', color: '#1a73e8', fields: ['endpoint', 'apiKey', 'merchantId'], tier: 2, supportedCategories: ['sales', 'transactions'], direction: 'pull', setupGuide: 'Magnati POS Setup Guide',
    setupSteps: [
      'Log in to your Magnati Merchant Portal (portal.magnati.ae)',
      'Navigate to API Settings → Generate API Key',
      'Copy your Merchant ID from the dashboard',
      'Note the API endpoint URL (usually provided by Magnati support)',
      'Enter all three values in the config fields below',
      'Click "Test Connection" to verify',
      'Click "Sync Now" to pull card transaction data',
      'Note: Magnati only provides CARD payments. Cash must be tracked separately via Google Sheets or manual entry.',
    ],
  },
  { type: 'pos', system: 'square', label: 'Square POS', desc: 'Square point-of-sale system', icon: '▣', color: '#006aff', fields: ['accessToken', 'locationId'], tier: 2, supportedCategories: ['sales', 'transactions', 'inventory', 'products'], direction: 'pull', setupGuide: 'Square POS Setup Guide',
    setupSteps: [
      'Go to Square Developer Dashboard (developer.squareup.com)',
      'Create a new application for your perfume business',
      'Generate Personal Access Token or set up OAuth',
      'Find your Location ID in Square Dashboard → Locations',
      'Enter the Access Token and Location ID below',
      'Click "Test Connection" to verify',
      'Click "Sync Now" to pull sales, inventory, and product data',
    ],
  },
  { type: 'pos', system: 'custom', label: 'Custom POS', desc: 'Any REST-based POS system', icon: '🖥️', color: T3, fields: ['endpoint', 'authHeader'], tier: 3, supportedCategories: ['sales', 'inventory', 'transactions', 'products', 'staff', 'expenses'], direction: 'pull', setupGuide: 'Custom POS Setup Guide',
    setupSteps: [
      'Ensure your POS system exposes a REST API',
      'The API should return data in the Parfumix ingest format (see docs)',
      'Enter the API endpoint URL',
      'If auth is required, enter the Authorization header value',
      'Supported endpoints: /sales, /inventory, /transactions, /products, /staff, /expenses',
      'Click "Test Connection" to verify reachability',
      'Click "Sync Now" to pull data',
    ],
  },
  { type: 'erp', system: 'odoo', label: 'Odoo ERP', desc: 'Odoo inventory & sales modules', icon: '📦', color: '#714B67', fields: ['url', 'database', 'username', 'apiKey'], tier: 3, supportedCategories: ['sales', 'inventory', 'products', 'staff', 'expenses'], direction: 'pull', setupGuide: 'Odoo ERP Setup Guide',
    setupSteps: [
      'Enable External API in Odoo: Settings → General → External API',
      'Create a dedicated API user with appropriate module permissions',
      'Install relevant modules: sale, stock, purchase, hr, account',
      'Enter your Odoo URL, Database name, Username, and API Key',
      'Click "Test Connection" to verify authentication',
      'Click "Sync Now" to pull data from all enabled modules',
      'Recommended: sync inventory first, then sales, then staff/expenses',
    ],
  },
  { type: 'erp', system: 'sap', label: 'SAP B1', desc: 'SAP Business One integration', icon: '🔵', color: '#0FAAFF', fields: ['endpoint', 'username', 'password'], tier: 3, supportedCategories: ['sales', 'inventory', 'products'], direction: 'pull', setupGuide: 'SAP B1 Setup Guide',
    setupSteps: [
      'Enable Service Layer in SAP B1: Administration → System Initialization → Service Layer',
      'Create a dedicated API user with appropriate authorizations',
      'Note the Service Layer URL (typically https://server:50001/b1s/v1)',
      'Enter the endpoint URL, username, and password',
      'Click "Test Connection" to verify',
      'Click "Sync Now" to pull inventory and sales data',
    ],
  },
  { type: 'erp', system: 'zoho', label: 'Zoho Books', desc: 'Zoho inventory & financials', icon: '📊', color: '#D7282D', fields: ['clientId', 'clientSecret', 'orgId', 'accessToken'], tier: 3, supportedCategories: ['sales', 'inventory', 'products', 'expenses'], direction: 'pull', setupGuide: 'Zoho Setup Guide',
    setupSteps: [
      'Go to Zoho Developer Console (developer.zoho.com)',
      'Create a Self-Client application',
      'Generate access/refresh tokens via the authorization flow',
      'Find your Organization ID in Zoho Books → Settings',
      'Enter Client ID, Client Secret, Org ID, and Access Token',
      'Click "Test Connection" to verify',
      'Note: Access tokens expire. You may need to refresh periodically.',
    ],
  },
  { type: 'google_sheets', system: 'google_sheets', label: 'Google Sheets', desc: 'Pull data from shared spreadsheets', icon: '📋', color: '#0F9D58', fields: ['spreadsheetId', 'apiKey', 'sheetName'], tier: 1, supportedCategories: ['sales', 'inventory', 'consumption', 'transactions', 'products', 'staff', 'expenses'], direction: 'pull', setupGuide: 'Google Sheets Setup Guide (Recommended First Step)',
    setupSteps: [
      'Go to Google Cloud Console (console.cloud.google.com)',
      'Create a project or use existing one',
      'Enable Google Sheets API: APIs & Services → Library → Sheets API → Enable',
      'Create API Key: APIs & Services → Credentials → Create Credentials → API Key',
      'Restrict the API key to Google Sheets API only',
      'Create a Google Sheet with these tabs: Sales, Inventory, Products, Staff, Expenses',
      'Share the spreadsheet: Click Share → "Anyone with the link" → Viewer',
      'Copy the Sheet ID from the URL: docs.google.com/spreadsheets/d/{SHEET_ID}/edit',
      'Enter the Sheet ID, API Key, and tab name below',
      'Click "Test Connection" to verify and see available tabs',
      'Click "Sync Now" to pull data into the dashboard',
    ],
  },
  { type: 'webhook', system: 'webhook', label: 'Generic Webhook', desc: 'Receive POST webhooks from any system', icon: '🔗', color: GOLD, fields: ['authHeader', 'defaultBranchSlug'], tier: 1, supportedCategories: ['sales', 'inventory', 'consumption', 'transactions', 'products', 'staff', 'expenses'], direction: 'push', setupGuide: 'Webhook Setup Guide',
    setupSteps: [
      'Create a new webhook connector below',
      'Optionally set an auth header for security (any POST must include it)',
      'Set the default branch slug (e.g., "adcb") if all data goes to one branch',
      'After creating, copy the Webhook URL shown on the connector detail page',
      'Configure your POS/ERP to POST data to that URL',
      'Supported payload format: { "type": "sales", "data": { "sales": [...] } }',
      'Types: sales, inventory, transactions, products, staff, expenses',
      'Each webhook push is logged in the sync history',
    ],
  },
];

function IntegrationsPage() {
  const [connectors, setConnectors] = useState<any[]>([]);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'add' | 'detail' | 'setup'>('overview');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedConnector, setSelectedConnector] = useState<any>(null);

  // Add connector form state
  const [formType, setFormType] = useState('pos');
  const [formSystem, setFormSystem] = useState('magnati');
  const [formName, setFormName] = useState('');
  const [formBranch, setFormBranch] = useState('');
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Setup guide state
  const [setupTemplate, setSetupTemplate] = useState<typeof CONNECTOR_TEMPLATES[number] | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [syncCategory, setSyncCategory] = useState('sales');

  // Test result state
  const [testResult, setTestResult] = useState<any>(null);

  const branchSlug = useMemo(() => {
    try { const v = JSON.parse(localStorage.getItem(BRANCH_LS_KEY) || '{}'); if (v.type === 'branch' && v.slug) return v.slug; } catch {}
    return DEFAULT_BRANCH_SLUG;
  }, []);

  // Load connectors
  const loadConnectors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/connectors');
      const data = await res.json();
      setConnectors(data.connectors || []);
    } catch (e) { console.error('Failed to load connectors:', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadConnectors(); }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }
  }, [toast]);

  // System templates filtered by type
  const templates = CONNECTOR_TEMPLATES.filter(t => t.type === formType);
  const selectedTemplate = CONNECTOR_TEMPLATES.find(t => t.system === formSystem);

  // When system changes, reset config fields
  useEffect(() => {
    if (selectedTemplate) {
      const newConfig: Record<string, string> = {};
      selectedTemplate.fields.forEach(f => { newConfig[f] = formConfig[f] || ''; });
      setFormConfig(newConfig);
      if (!formName) setFormName(`${selectedTemplate.label} — ${BRANCHES.find(b => b.slug === (formBranch || branchSlug))?.name || 'Branch'}`);
    }
  }, [formSystem]);

  // Create connector
  const handleCreate = async () => {
    if (!formName || !formSystem) return;
    setSaving(true);
    try {
      const res = await fetch('/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, type: formType, system: formSystem, branchSlug: formBranch || branchSlug, config: formConfig }),
      });
      const data = await res.json();
      if (data.connector) {
        setToast(`Connector "${formName}" created!`);
        setFormName('');
        setFormConfig({});
        setActiveView('overview');
        loadConnectors();
      } else {
        setToast(data.error || 'Failed to create connector');
      }
    } catch { setToast('Error creating connector'); }
    finally { setSaving(false); }
  };

  // Test connector (store result in state)
  const handleTest = async (id: string) => {
    setTestResult(null);
    try {
      const res = await fetch(`/api/connectors/${id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
      setToast(data.message || (data.success ? 'Connection test passed!' : 'Connection test failed'));
      loadConnectors();
    } catch { setTestResult({ success: false, message: 'Network error' }); setToast('Test failed'); }
  };

  // Sync connector
  const handleSync = async () => {
    if (!selectedConnector) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/connectors/${selectedConnector.id}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: syncCategory }),
      });
      const data = await res.json();
      setSyncResult(data);
      setToast(data.message || (data.success ? 'Sync completed!' : 'Sync failed'));
      loadConnectors();
      if (selectedId) loadDetail(selectedId);
    } catch { setSyncResult({ success: false, message: 'Sync error' }); setToast('Sync failed'); }
    finally { setSyncing(false); }
  };

  // Toggle connector
  const handleToggle = async (conn: any) => {
    try {
      await fetch(`/api/connectors/${conn.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !conn.enabled }),
      });
      loadConnectors();
    } catch { setToast('Failed to toggle connector'); }
  };

  // Delete connector
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this connector and all sync logs?')) return;
    try {
      await fetch(`/api/connectors/${id}`, { method: 'DELETE' });
      setToast('Connector deleted');
      loadConnectors();
      if (selectedId === id) { setSelectedId(null); setSelectedConnector(null); setActiveView('overview'); }
    } catch { setToast('Failed to delete'); }
  };

  // Load connector detail + logs
  const loadDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/connectors/${id}`);
      const data = await res.json();
      setSelectedConnector(data.connector);
      setSyncLogs(data.connector.syncLogs || []);
      setSelectedId(id);
      setActiveView('detail');
      setTestResult(null);
      setSyncResult(null);
    } catch { setToast('Failed to load connector detail'); }
  };

  const webhookBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // ── TierBadge helper ──
  const TierBadge = ({ tier }: { tier: number }) => {
    const colors: Record<number, { bg: string; color: string; label: string }> = {
      1: { bg: `${SAGE}22`, color: SAGE, label: 'T1 Simple' },
      2: { bg: `${AMBER}22`, color: AMBER, label: 'T2 Standard' },
      3: { bg: `${ROSE}22`, color: ROSE, label: 'T3 Advanced' },
    };
    const cfg = colors[tier] || colors[1];
    return (
      <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 8, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
        {cfg.label}
      </span>
    );
  };

  // ── Toast banner ──
  const toastBanner = toast ? (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, padding: '10px 18px', borderRadius: 8, background: toast.includes('failed') || toast.includes('Failed') || toast.includes('Error') ? `${ROSE}22` : `${SAGE}22`, border: `1px solid ${toast.includes('failed') || toast.includes('Failed') ? ROSE : SAGE}`, color: toast.includes('failed') || toast.includes('Failed') ? ROSE : SAGE, fontSize: 11, fontWeight: 500, maxWidth: 400 }}>
      {toast}
    </div>
  ) : null;

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><RefreshCw size={20} style={{ color: GOLD, animation: 'spin 1s linear infinite' }} /></div>;

  return (
    <div>
      {toastBanner}

      {/* ── OVERVIEW VIEW ── */}
      {activeView === 'overview' && (
        <div>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <KpiCard label="Connected Systems" value={`${connectors.filter(c => c.enabled).length}`} sub={`${connectors.length} total connectors`} badge={connectors.some(c => c.enabled) ? 'LIVE' : 'NONE'} badgeColor={connectors.some(c => c.enabled) ? SAGE : T3} />
            <KpiCard label="Data Sources" value={`${new Set(connectors.map(c => c.type)).size}`} sub={`${new Set(connectors.map(c => c.system)).size} unique systems`} />
            <KpiCard label="Total Syncs" value={connectors.reduce((s: number, c: any) => s + (c._count?.syncLogs || 0), 0).toLocaleString()} sub="All time" />
            <KpiCard label="Integration Tier" value={connectors.length > 0 ? `T${Math.max(...connectors.map(c => CONNECTOR_TEMPLATES.find(t => t.system === c.system)?.tier || 1))}` : '—'} sub={connectors.length > 0 ? 'Highest connected tier' : 'No connectors yet'} badge={connectors.some(c => { const t = CONNECTOR_TEMPLATES.find(x => x.system === c.system); return t && t.tier >= 3; }) ? 'Advanced' : connectors.some(c => { const t = CONNECTOR_TEMPLATES.find(x => x.system === c.system); return t && t.tier >= 2; }) ? 'Standard' : 'Basic'} badgeColor={connectors.some(c => { const t = CONNECTOR_TEMPLATES.find(x => x.system === c.system); return t && t.tier >= 3; }) ? ROSE : connectors.some(c => { const t = CONNECTOR_TEMPLATES.find(x => x.system === c.system); return t && t.tier >= 2; }) ? AMBER : SAGE} />
          </div>

          <ChartCard title="Registered Connectors" wide>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: T2 }}>Connect your POS, ERP, or any system to push data directly</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setSetupTemplate(null); setActiveView('setup'); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, border: `1px solid ${STEEL}33`, background: `${STEEL}15`, color: STEEL, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                  <BookOpen size={13} /> View Setup Guides
                </button>
                <button onClick={() => setActiveView('add')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, border: `1px solid ${GOLD}33`, background: `${GOLD}15`, color: GOLD, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                  <Plus size={13} /> Add Connector
                </button>
              </div>
            </div>

            {connectors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Cable size={32} style={{ color: T3, marginBottom: 12 }} />
                <div style={{ fontSize: 13, color: T2, marginBottom: 6 }}>No connectors configured yet</div>
                <div style={{ fontSize: 11, color: T3, marginBottom: 16 }}>Connect your POS, ERP, or any external system to start pushing real data</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button onClick={() => { setSetupTemplate(null); setActiveView('setup'); }} style={{ padding: '8px 18px', borderRadius: 6, border: `1px solid ${STEEL}33`, background: `${STEEL}12`, color: STEEL, fontSize: 11, cursor: 'pointer' }}>
                    <BookOpen size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> View Setup Guides
                  </button>
                  <button onClick={() => setActiveView('add')} style={{ padding: '8px 18px', borderRadius: 6, border: `1px solid ${GOLD}33`, background: `${GOLD}12`, color: GOLD, fontSize: 11, cursor: 'pointer' }}>
                    <Plus size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> Add Your First Connector
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {connectors.map(conn => {
                  const template = CONNECTOR_TEMPLATES.find(t => t.system === conn.system);
                  const statusColor = !conn.enabled ? T3 : conn.lastStatus === 'success' ? SAGE : conn.lastStatus === 'error' ? ROSE : AMBER;
                  return (
                    <div key={conn.id} onClick={() => loadDetail(conn.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, cursor: 'pointer', transition: 'background 0.15s' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${(template?.color || T3)}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                        {template?.icon || '🔌'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, color: T1, fontWeight: 500 }}>{conn.name}</span>
                          {template && <TierBadge tier={template.tier} />}
                          {template && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: `${template.direction === 'push' ? AMBER : STEEL}22`, color: template.direction === 'push' ? AMBER : STEEL, fontWeight: 600 }}>{template.direction.toUpperCase()}</span>}
                        </div>
                        <div style={{ fontSize: 10, color: T3, marginTop: 2 }}>
                          {template?.label || conn.system} &middot; {conn.branch?.name || 'All branches'} &middot; {conn._count?.syncLogs || 0} syncs
                          {conn.lastSyncAt && <span> &middot; Last: {new Date(conn.lastSyncAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}44` }} />
                        <span style={{ fontSize: 9, color: statusColor, fontWeight: 500, textTransform: 'uppercase' }}>
                          {!conn.enabled ? 'OFF' : conn.lastStatus}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); handleToggle(conn); }} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BORDER}`, background: conn.enabled ? `${SAGE}15` : 'transparent', color: conn.enabled ? SAGE : T3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {conn.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleTest(conn.id); }} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: T2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Test connection">
                          <Radio size={13} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(conn.id); }} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: T3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartCard>

          {/* API Reference Card */}
          <ChartCard title="Integration Endpoints" wide>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { label: 'Sales Ingest', url: '/api/ingest/sales', method: 'POST', desc: 'Push daily sales from POS', color: SAGE },
                { label: 'Inventory Ingest', url: '/api/ingest/inventory', method: 'POST', desc: 'Push stock levels from ERP', color: STEEL },
                { label: 'Webhook Receiver', url: '/api/webhook/[id]', method: 'POST/GET', desc: 'Auto-receive data pushes', color: GOLD },
              ].map(ep => (
                <div key={ep.url} style={{ padding: 14, borderRadius: 8, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 8, fontWeight: 700, background: `${ep.color}22`, color: ep.color }}>{ep.method}</span>
                    <span style={{ fontSize: 11, color: T1, fontWeight: 500 }}>{ep.label}</span>
                  </div>
                  <code style={{ fontSize: 9, color: GOLD, wordBreak: 'break-all', display: 'block', marginBottom: 4 }}>{ep.url}</code>
                  <div style={{ fontSize: 9, color: T3 }}>{ep.desc}</div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      )}

      {/* ── SETUP GUIDES VIEW ── */}
      {activeView === 'setup' && (
        <div>
          <ChartCard title="Integration Setup Guides" wide>
            <button onClick={() => setActiveView('overview')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: T2, fontSize: 10, cursor: 'pointer', marginBottom: 16 }}>
              <ChevronLeft size={12} /> Back to Connectors
            </button>

            {!setupTemplate ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {CONNECTOR_TEMPLATES.map(t => (
                  <div key={t.system} onClick={() => setSetupTemplate(t)} style={{ padding: 16, borderRadius: 10, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.015)', cursor: 'pointer', transition: 'border-color 0.15s', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${t.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                      {t.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: T1, fontWeight: 600 }}>{t.label}</span>
                        <TierBadge tier={t.tier} />
                        <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: `${t.direction === 'push' ? AMBER : STEEL}22`, color: t.direction === 'push' ? AMBER : STEEL, fontWeight: 600 }}>{t.direction.toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize: 10, color: T3, marginBottom: 6 }}>{t.desc}</div>
                      <div style={{ fontSize: 9, color: T2 }}>
                        Categories: {t.supportedCategories.join(', ')}
                      </div>
                      <div style={{ fontSize: 9, color: T2, marginTop: 2 }}>
                        {t.setupSteps.length} setup steps
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <button onClick={() => setSetupTemplate(null)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: T2, fontSize: 10, cursor: 'pointer', marginBottom: 16 }}>
                  <ChevronLeft size={12} /> All Guides
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${setupTemplate.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                    {setupTemplate.icon}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16, color: T1, fontWeight: 700 }}>{setupTemplate.setupGuide}</span>
                      <TierBadge tier={setupTemplate.tier} />
                    </div>
                    <div style={{ fontSize: 10, color: T3, marginTop: 2 }}>{setupTemplate.desc} &middot; Direction: {setupTemplate.direction.toUpperCase()} &middot; Categories: {setupTemplate.supportedCategories.join(', ')}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: T2, marginBottom: 12 }}>Step-by-Step Setup</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {setupTemplate.setupSteps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.015)' }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: `${setupTemplate.color}22`, color: setupTemplate.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <div style={{ fontSize: 11, color: T1, lineHeight: 1.5 }}>{step}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={() => { setFormType(setupTemplate.type); setFormSystem(setupTemplate.system); setSetupTemplate(null); setActiveView('add'); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, border: 'none', background: GOLD, color: '#000', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  <Plus size={14} /> Set Up {setupTemplate.label}
                </button>
              </div>
            )}
          </ChartCard>
        </div>
      )}

      {/* ── ADD CONNECTOR VIEW ── */}
      {activeView === 'add' && (
        <div>
          <ChartCard title="Add New Connector" wide>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button onClick={() => setActiveView('overview')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: T2, fontSize: 10, cursor: 'pointer' }}>
                <ChevronLeft size={12} /> Back
              </button>
            </div>

            {/* Type selector */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: T2, marginBottom: 8 }}>Connector Type</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['pos', 'erp', 'google_sheets', 'webhook'].map(t => (
                  <button key={t} onClick={() => { setFormType(t); setFormSystem(CONNECTOR_TEMPLATES.find(ct => ct.type === t)?.system || t); }} style={{ padding: '8px 16px', borderRadius: 6, border: `1px solid ${formType === t ? GOLD : BORDER}`, background: formType === t ? `${GOLD}15` : 'transparent', color: formType === t ? GOLD : T2, fontSize: 11, cursor: 'pointer', fontWeight: 500, textTransform: 'capitalize' }}>
                    {t === 'google_sheets' ? 'Google Sheets' : t === 'pos' ? 'POS' : t === 'erp' ? 'ERP' : 'Webhook'}
                  </button>
                ))}
              </div>
            </div>

            {/* System selector */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: T2 }}>System</div>
                <button onClick={() => { setSetupTemplate(null); setActiveView('setup'); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 5, border: `1px solid ${STEEL}33`, background: `${STEEL}12`, color: STEEL, fontSize: 9, cursor: 'pointer', fontWeight: 500 }}>
                  <BookOpen size={11} /> Setup Guide
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {templates.map(t => (
                  <button key={t.system} onClick={() => setFormSystem(t.system)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, border: `1px solid ${formSystem === t.system ? `${t.color}55` : BORDER}`, background: formSystem === t.system ? `${t.color}12` : 'transparent', color: formSystem === t.system ? T1 : T2, fontSize: 11, cursor: 'pointer', textAlign: 'left', minWidth: 180 }}>
                    <span style={{ fontSize: 18 }}>{t.icon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontWeight: 500 }}>{t.label}</span>
                        <TierBadge tier={t.tier} />
                      </div>
                      <div style={{ fontSize: 9, color: T3, marginTop: 1 }}>{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Config fields */}
            {selectedTemplate && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: T2, marginBottom: 8 }}>Configuration</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 10, color: T3, display: 'block', marginBottom: 4 }}>Connector Name</label>
                    <input value={formName} onChange={e => setFormName(e.target.value)} placeholder={`${selectedTemplate.label} — Branch Name`} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.03)', color: T1, fontSize: 11, outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: T3, display: 'block', marginBottom: 4 }}>Branch</label>
                    <select value={formBranch || branchSlug} onChange={e => setFormBranch(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${BORDER}`, background: CARD_BG, color: T1, fontSize: 11, outline: 'none', fontFamily: 'inherit' }}>
                      {BRANCHES.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
                    </select>
                  </div>
                  {selectedTemplate.fields.map(field => (
                    <div key={field}>
                      <label style={{ fontSize: 10, color: T3, display: 'block', marginBottom: 4 }}>{field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>
                      <input type={field.toLowerCase().includes('key') || field.toLowerCase().includes('secret') || field.toLowerCase().includes('password') ? 'password' : 'text'} value={formConfig[field] || ''} onChange={e => setFormConfig({ ...formConfig, [field]: e.target.value })} placeholder={field} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.03)', color: T1, fontSize: 11, outline: 'none', fontFamily: 'inherit' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setActiveView('overview')} style={{ padding: '8px 16px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: T2, fontSize: 11, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreate} disabled={saving || !formName} style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: saving ? T3 : GOLD, color: '#000', fontSize: 11, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                {saving ? 'Creating...' : 'Create Connector'}
              </button>
            </div>
          </ChartCard>
        </div>
      )}

      {/* ── DETAIL VIEW ── */}
      {activeView === 'detail' && selectedConnector && (
        <div>
          <ChartCard title="Connector Details" wide>
            <button onClick={() => setActiveView('overview')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: T2, fontSize: 10, cursor: 'pointer', marginBottom: 16 }}>
              <ChevronLeft size={12} /> All Connectors
            </button>

            {(() => {
              const detailTemplate = CONNECTOR_TEMPLATES.find(t => t.system === selectedConnector.system);
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${detailTemplate?.color || T3}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                          {detailTemplate?.icon || '🔌'}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 14, color: T1, fontWeight: 600 }}>{selectedConnector.name}</span>
                            {detailTemplate && <TierBadge tier={detailTemplate.tier} />}
                            {detailTemplate && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: `${detailTemplate.direction === 'push' ? AMBER : STEEL}22`, color: detailTemplate.direction === 'push' ? AMBER : STEEL, fontWeight: 600 }}>{detailTemplate.direction.toUpperCase()}</span>}
                          </div>
                          <div style={{ fontSize: 10, color: T3, marginTop: 2 }}>
                            {detailTemplate?.label || selectedConnector.system} &middot;
                            {selectedConnector.type} &middot;
                            {selectedConnector.branch?.name || 'All branches'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => handleToggle(selectedConnector)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, border: `1px solid ${selectedConnector.enabled ? SAGE : BORDER}`, background: selectedConnector.enabled ? `${SAGE}15` : 'transparent', color: selectedConnector.enabled ? SAGE : T2, fontSize: 11, cursor: 'pointer' }}>
                          {selectedConnector.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          {selectedConnector.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                        <button onClick={() => handleTest(selectedConnector.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: T2, fontSize: 11, cursor: 'pointer' }}>
                          <Radio size={13} /> Test Connection
                        </button>
                        {detailTemplate && detailTemplate.direction === 'pull' && (
                          <button onClick={handleSync} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, border: `1px solid ${SAGE}55`, background: `${SAGE}15`, color: SAGE, fontSize: 11, cursor: syncing ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
                            <RefreshCw size={13} style={syncing ? { animation: 'spin 1s linear infinite' } : undefined} />
                            {syncing ? 'Syncing...' : 'Sync Now'}
                          </button>
                        )}
                        {detailTemplate && (
                          <button onClick={() => { setSetupTemplate(detailTemplate); setActiveView('setup'); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, border: `1px solid ${STEEL}33`, background: `${STEEL}12`, color: STEEL, fontSize: 11, cursor: 'pointer' }}>
                            <BookOpen size={13} /> Guide
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ padding: 14, borderRadius: 8, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.01)' }}>
                      <div style={{ fontSize: 9, color: T3, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Webhook URL</div>
                      <code style={{ fontSize: 9, color: GOLD, wordBreak: 'break-all', display: 'block' }}>{webhookBaseUrl}/api/webhook/{selectedConnector.id}</code>
                      <button onClick={() => { navigator.clipboard?.writeText(`${webhookBaseUrl}/api/webhook/${selectedConnector.id}`); setToast('Webhook URL copied!'); }} style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 4, border: `1px solid ${BORDER}`, background: 'transparent', color: T2, fontSize: 9, cursor: 'pointer' }}>
                        <Copy size={10} /> Copy URL
                      </button>
                    </div>
                  </div>

                  {/* Test result display */}
                  {testResult && (
                    <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 8, border: `1px solid ${testResult.success ? `${SAGE}44` : `${ROSE}44`}`, background: testResult.success ? `${SAGE}08` : `${ROSE}08` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: testResult.details ? 8 : 0 }}>
                        {testResult.success ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, background: `${SAGE}22`, color: SAGE, fontSize: 10, fontWeight: 700 }}>
                            <CheckCircle2 size={12} /> PASS
                          </span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, background: `${ROSE}22`, color: ROSE, fontSize: 10, fontWeight: 700 }}>
                            <XCircle size={12} /> FAIL
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: T1 }}>{testResult.message || (testResult.success ? 'Connection successful' : 'Connection failed')}</span>
                      </div>
                      {testResult.details && (
                        <pre style={{ fontSize: 9, color: T3, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, maxHeight: 100, overflowY: 'auto' }}>{typeof testResult.details === 'string' ? testResult.details : JSON.stringify(testResult.details, null, 2)}</pre>
                      )}
                    </div>
                  )}

                  {/* Sync category selector + result (pull only) */}
                  {detailTemplate && detailTemplate.direction === 'pull' && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: T2 }}>Sync Category</div>
                        <select value={syncCategory} onChange={e => setSyncCategory(e.target.value)} style={{ padding: '5px 10px', borderRadius: 5, border: `1px solid ${BORDER}`, background: CARD_BG, color: T1, fontSize: 10, outline: 'none', fontFamily: 'inherit' }}>
                          {detailTemplate.supportedCategories.map(cat => (
                            <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      {syncResult && (
                        <div style={{ padding: '12px 14px', borderRadius: 8, border: `1px solid ${syncResult.success ? `${SAGE}44` : `${ROSE}44`}`, background: syncResult.success ? `${SAGE}08` : `${ROSE}08` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {syncResult.success ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, background: `${SAGE}22`, color: SAGE, fontSize: 10, fontWeight: 700 }}>
                                <CheckCircle2 size={12} /> SYNC OK
                              </span>
                            ) : (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, background: `${ROSE}22`, color: ROSE, fontSize: 10, fontWeight: 700 }}>
                                <XCircle size={12} /> SYNC FAILED
                              </span>
                            )}
                            <span style={{ fontSize: 11, color: T1 }}>{syncResult.message || (syncResult.success ? 'Sync completed' : 'Sync failed')}</span>
                            {syncResult.recordCount !== undefined && <span style={{ fontSize: 10, color: T3 }}>({syncResult.recordCount} records)</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Supported categories display */}
                  {detailTemplate && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: T2, marginBottom: 6 }}>Supported Categories</div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {detailTemplate.supportedCategories.map(cat => (
                          <span key={cat} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, background: 'rgba(255,255,255,0.04)', color: T2, border: `1px solid ${BORDER}` }}>{cat}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Config display */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: T2, marginBottom: 8 }}>Configuration</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {Object.entries(selectedConnector.config || {}).filter(([, v]) => v).map(([key, val]) => (
                  <div key={key} style={{ padding: '8px 12px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ fontSize: 9, color: T3, marginBottom: 2 }}>{key}</div>
                    <code style={{ fontSize: 10, color: T2 }}>{typeof val === 'string' && val.length > 20 ? val.slice(0, 8) + '•••••••' + val.slice(-4) : String(val)}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Sync logs */}
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: T2, marginBottom: 8 }}>Sync History ({syncLogs.length})</div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {syncLogs.length === 0 ? (
                  <div style={{ fontSize: 11, color: T3, padding: 20, textAlign: 'center' }}>No sync activity yet</div>
                ) : (
                  syncLogs.map((log: any) => {
                    const logColor = log.status === 'success' ? SAGE : log.status === 'error' ? ROSE : AMBER;
                    return (
                      <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: logColor, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: T1 }}>{log.summary || `${log.category} — ${log.method}`}</div>
                          <div style={{ fontSize: 9, color: T3 }}>
                            {new Date(log.createdAt).toLocaleString()} &middot; {log.durationMs}ms &middot; {log.recordCount} records
                          </div>
                        </div>
                        <span style={{ fontSize: 9, color: logColor, fontWeight: 500, textTransform: 'uppercase' }}>{log.status}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

const pageComponents: Record<PageId, React.FC<{ data: StoreData }>> = {
  dashboard: (props) => <DashboardPage {...props} />,
  alerts: (props) => <AlertsPage {...props} />,
  pnl: (props) => <PnlPage {...props} />,
  capex: (props) => <CapexPage {...props} />,
  payback: (props) => <PaybackPage {...props} />,
  breakeven: (props) => <BreakevenPage {...props} />,
  revenue: (props) => <RevenuePage {...props} />,
  heatmap: (props) => <HeatmapPage {...props} />,
  weekly: (props) => <WeeklyPage {...props} />,
  returns: (props) => <ReturnsPage {...props} />,
  payments: (props) => <PaymentsPage {...props} />,
  'supply-chain': (props) => <SupplyChainPage {...props} />,
  forecast: (props) => <ForecastPage {...props} />,
  simulator: (props) => <SimulatorPage {...props} />,
  gaps: (props) => <GapsPage {...props} />,
  products: (props) => <ProductsPage {...props} />,
  staff: (props) => <StaffPage {...props} />,
  marketing: (props) => <MarketingPage {...props} />,
  'daily-ops': (props) => <DailyOpsPage {...props} />,
  'cash-flow': (props) => <CashFlowPage {...props} />,
  customers: (props) => <CustomerInsightsPage {...props} />,
  'data-center': (props) => <DataCenterPage {...props} />,
  'integrations': (props) => <IntegrationsPage {...props} />,
};

// ══════════════════════════════════════════════════════════════════
// HYDRATION-SAFE VIEW MODE HOOK
// ══════════════════════════════════════════════════════════════════
const SERVER_SNAPSHOT: ViewMode = { type: 'branch', slug: DEFAULT_BRANCH_SLUG };

function useHydratedViewMode(): ViewMode {
  // Cache snapshot so useSyncExternalStore gets stable references
  const cachedRef = useRef<{ raw: string; parsed: ViewMode }>({
    raw: '',
    parsed: SERVER_SNAPSHOT,
  });

  const subscribe = useCallback((callback: () => void) => {
    // Listen for storage events (cross-tab) and custom event (same-tab updates)
    const handler = (e: StorageEvent | Event) => {
      if (e instanceof StorageEvent && e.key !== BRANCH_LS_KEY) return;
      callback();
    };
    window.addEventListener('storage', handler);
    window.addEventListener('parfumix:view-change', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('parfumix:view-change', handler);
    };
  }, []);

  const getSnapshot = useCallback((): ViewMode => {
    try {
      const stored = localStorage.getItem(BRANCH_LS_KEY);
      if (stored === cachedRef.current.raw) return cachedRef.current.parsed;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.type === 'branch' && parsed.slug) {
          cachedRef.current = { raw: stored, parsed };
          return parsed;
        }
        if (parsed.type === 'all') {
          const v: ViewMode = { type: 'all' };
          cachedRef.current = { raw: stored, parsed: v };
          return v;
        }
        if (parsed.type === 'country' || parsed.type === 'city') {
          cachedRef.current = { raw: stored, parsed };
          return parsed;
        }
      }
    } catch {}
    cachedRef.current = { raw: '', parsed: SERVER_SNAPSHOT };
    return SERVER_SNAPSHOT;
  }, []);

  const getServerSnapshot = useCallback((): ViewMode => SERVER_SNAPSHOT, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function Home() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const viewFromStore = useHydratedViewMode();
  const [view, setView] = useState<ViewMode>(viewFromStore);
  const [dataVersion, setDataVersion] = useState(0);

  // Keep local state in sync with store changes (e.g. from another tab)
  useEffect(() => {
    setView(viewFromStore);
  }, [viewFromStore]);

  // Listen for data mutations from Data Center (seed, upload, reset, manual save)
  useEffect(() => {
    const handler = () => setDataVersion(v => v + 1);
    window.addEventListener('parfumix:data-changed', handler);
    return () => window.removeEventListener('parfumix:data-changed', handler);
  }, []);

  const handleViewChange = useCallback((newView: ViewMode) => {
    setView(newView);
    saveViewMode(newView);
  }, []);

  const storeData = useStoreData(view, dataVersion);
  const PageComponent = pageComponents[activePage];

  const sidebarLabel = useMemo(() => {
    if (view.type === 'branch') {
      const b = getBranchBySlug(view.slug);
      return b ? `${b.name.replace('Parfumix ', '')} · ${b.city}, ${b.country}` : 'Select Branch';
    }
    return getViewLabel(view);
  }, [view]);

  // Only show NoDataPage if branch has no data (not for aggregate views which now work)
  const showNoData = !storeData.loading && !storeData.hasData;

  if (storeData.loading) {
    return (
      <div>
        <BranchSelectorBar view={view} onChange={handleViewChange} />
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 44px)' }}>
          <Sidebar active={activePage} onChange={setActivePage} branchLabel={sidebarLabel} alertCount={computeAlertCount(storeData)} />
          <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <RefreshCw size={28} style={{ color: GOLD, animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: 12, color: T3, marginTop: 16 }}>Loading dashboard data…</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <BranchSelectorBar view={view} onChange={handleViewChange} />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 44px)' }}>
        <Sidebar active={activePage} onChange={setActivePage} branchLabel={sidebarLabel} alertCount={computeAlertCount(storeData)} />
        <main style={{
          flex: 1, padding: '24px 28px', maxWidth: 1200, minWidth: 0,
          overflowX: 'hidden',
        }}>
          {/* Page header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {navSections.flatMap(s => s.items).find(i => i.id === activePage) && (() => {
                const navItem = navSections.flatMap(s => s.items).find(i => i.id === activePage)!;
                return <navItem.icon size={14} style={{ color: GOLD, opacity: 0.7 }} />;
              })()}
              <h1 style={{ fontSize: 16, color: T1, fontWeight: 500 }}>
                {navSections.flatMap(s => s.items).find(i => i.id === activePage)?.label || 'Dashboard'}
              </h1>
              {isAggregateView(view) && (
                <span style={{
                  marginLeft: 8, padding: '2px 8px', borderRadius: 4, fontSize: 8, fontWeight: 600,
                  background: `${GOLD}22`, color: GOLD, letterSpacing: '0.06em',
                }}>
                  {view.type === 'all' ? 'ALL BRANCHES' : view.type === 'country' ? view.country.toUpperCase() : view.city.toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ width: 40, height: 2, background: GOLD, borderRadius: 1, opacity: 0.4 }} />
          </div>

          {showNoData ? <NoDataPage view={view} /> : <PageComponent data={storeData} />}
        </main>
      </div>
    </div>
  );
}
