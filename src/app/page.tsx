'use client';

import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  LayoutDashboard, AlertTriangle, DollarSign, PieChartIcon, TrendingUp,
  CalendarDays, RotateCcw, CreditCard, BarChart3, Database, ChevronRight,
  Activity, Target, Zap, Eye, Clock, ShoppingCart, ArrowUpRight, ArrowDownRight,
  CheckCircle2, XCircle, AlertCircle, Users, Package, BarChart2, Receipt,
  Store, Calculator, ClipboardList, ArrowRight, Upload, FileSpreadsheet, RefreshCw, Download,
} from 'lucide-react';

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

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════
const aed = (n: number) => `AED ${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const aedK = (n: number) => `AED ${(n / 1000).toFixed(0)}K`;
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
type PageId = 'dashboard' | 'alerts' | 'pnl' | 'capex' | 'payback' | 'breakeven' | 'revenue' | 'heatmap' | 'weekly' | 'returns' | 'payments' | 'forecast' | 'simulator' | 'gaps' | 'data-center';

const navSections = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard' as PageId, label: 'Dashboard', icon: LayoutDashboard },
      { id: 'alerts' as PageId, label: 'Alerts', icon: AlertTriangle, badge: '4' },
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
      { id: 'returns' as PageId, label: 'Returns', icon: RotateCcw },
      { id: 'payments' as PageId, label: 'Payment Mix', icon: CreditCard },
    ],
  },
  {
    title: 'Strategy',
    items: [
      { id: 'forecast' as PageId, label: 'Forecast', icon: BarChart3 },
      { id: 'simulator' as PageId, label: 'What-If', icon: Zap },
      { id: 'gaps' as PageId, label: 'Data Gaps', icon: Database },
    ],
  },
  {
    title: 'System',
    items: [
      { id: 'data-center' as PageId, label: 'Data Center', icon: Upload, badge: 'NEW' },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════════════════════════════
function Sidebar({ active, onChange }: { active: PageId; onChange: (p: PageId) => void }) {
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
          branch intelligence &middot; adcb
        </div>
      </div>

      {/* Branch pill */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{
          display: 'inline-block', padding: '4px 10px', borderRadius: 6,
          background: 'rgba(201,165,90,0.08)', fontSize: 9, color: GOLD,
        }}>
          ADCB Mall &middot; Dubai, UAE
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
                      background: ROSE, color: '#fff', fontSize: 8, fontWeight: 700,
                      padding: '1px 6px', borderRadius: 999, lineHeight: '16px',
                    }}>
                      {item.badge}
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
function DashboardPage() {
  const bestMonthIdx = NET.indexOf(Math.max(...NET));
  const keyMoneyBurden = ((CAPEX_ITEMS[0].amount / TOTAL_INVESTMENT) * 100).toFixed(1);

  return (
    <div>
      {/* Row 1: 4 KPI */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <KpiCard label="Total Investment" value={aed(TOTAL_INVESTMENT)} sub="CAPEX + Overheads" badge="All-in" badgeColor={GOLD} />
        <KpiCard label="6-Month Net Revenue" value={aed(totalNet)} sub={`${MONTHS[0]} – ${MONTHS[5]}`} badge="Net of returns" badgeColor={SAGE} />
        <KpiCard label="Avg Monthly Net" value={aed(Math.round(avgMonthlyNet))} sub="6-month average" />
        <KpiCard label="Capital Recovered" value={pct(capitalRecovered)} sub={`${aed(totalNet)} of ${aed(TOTAL_INVESTMENT)}`} badge={`${Math.round(capitalRecovered)}%`} badgeColor={capitalRecovered > 40 ? SAGE : AMBER} />
      </div>

      {/* Row 2: 4 KPI */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <KpiCard label="Total Returns" value={aed(totalReturns)} sub={`Avg rate: ${pct(avgReturnRate)}`} badge={pct(avgReturnRate)} badgeColor={ROSE} />
        <KpiCard label="Best Month" value={aed(NET[bestMonthIdx])} sub={MONTHS_FULL[bestMonthIdx]} badge="Peak" badgeColor={SAGE} />
        <KpiCard label="Card Revenue Share" value={pct(cardShare)} sub={`${aed(totalCard)} card / ${aed(totalCash)} cash`} badge="81%+" badgeColor={STEEL} />
        <KpiCard label="Key Money Burden" value={`${keyMoneyBurden}%`} sub={aed(CAPEX_ITEMS[0].amount)} badge="Sunk cost" badgeColor={ROSE} />
      </div>

      {/* Revenue vs Investment Recovery */}
      <ChartCard title="Revenue vs Investment Recovery" wide className="mb-3">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={axisTick} />
            <YAxis yAxisId="left" tick={axisTick} tickFormatter={v => aedK(v)} />
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
              <YAxis tick={axisTick} tickFormatter={v => aedK(v)} fontSize={8} />
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
              <Tooltip formatter={(v: number) => aed(v)} contentStyle={ttStyle} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 9, color: T2 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE 2: ALERTS
// ══════════════════════════════════════════════════════════════════
function AlertsPage() {
  const paybackMonths73 = Math.ceil(TOTAL_INVESTMENT / (avgMonthlyNet * (PNL.grossMargin / 100)));
  const paybackMonths62 = Math.ceil(TOTAL_INVESTMENT / (avgMonthlyNet * 0.62));

  const alerts = [
    {
      severity: 'red' as const,
      title: 'Capital Payback Timeline Exceeds 24 Months',
      body: `At 73% gross margin, payback requires ~${paybackMonths73} months (${(paybackMonths73 / 12).toFixed(1)} years). At 62% margin, it extends to ~${paybackMonths62} months. The AED 190K key money significantly inflates the capital base.`,
      icon: Clock,
    },
    {
      severity: 'red' as const,
      title: 'Key Money is 35.7% Sunk Cost',
      body: `${aed(CAPEX_ITEMS[0].amount)} of the ${aed(TOTAL_INVESTMENT)} total investment is non-recoverable key money. This is the single largest risk factor and has zero residual value.`,
      icon: AlertTriangle,
    },
    {
      severity: 'gold' as const,
      title: 'December Returns Spike to 4.3%',
      body: `Returns reached ${aed(RETURNS[2])} in December — the highest value and rate (${pct(returnRates[2])}). This coincides with peak sales volume and may indicate gifting-related impulse purchases being returned.`,
      icon: RotateCcw,
    },
    {
      severity: 'gold' as const,
      title: 'January Revenue Surge (+19.9% MoM)',
      body: `January net revenue of ${aed(NET[3])} represents a +${pct(momGrowth[3])} jump from December. This could be driven by post-holiday restocking or seasonal demand. Needs sustained monitoring.`,
      icon: TrendingUp,
    },
    {
      severity: 'green' as const,
      title: 'Card Payment Loyalty Potential',
      body: `${pct(cardShare)} of revenue comes via card payments — strong indicator of repeat customers. A loyalty programme integrated with card transactions could significantly boost retention and basket size.`,
      icon: CreditCard,
    },
  ];

  const sevColors = { red: ROSE, gold: GOLD, green: SAGE };
  const sevBg = { red: 'rgba(191,95,89,0.06)', gold: 'rgba(201,165,90,0.06)', green: 'rgba(88,152,122,0.06)' };
  const sevLabel = { red: 'CRITICAL', gold: 'WARNING', green: 'OPPORTUNITY' };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, color: T1, marginBottom: 4 }}>Active Alerts</h2>
        <p style={{ fontSize: 11, color: T3 }}>4 issues identified across financial, operational, and strategic dimensions</p>
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
function PnlPage() {
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
function CapexPage() {
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
function PaybackPage() {
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
function RevenuePage() {
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
function HeatmapPage() {
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
function ReturnsPage() {
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
function PaymentsPage() {
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
function ForecastPage() {
  const forecastMonths = [
    { month: 'Apr 26', ...FORECAST.apr, type: 'forecast' as const },
    { month: 'May 26', ...FORECAST.may, type: 'forecast' as const },
    { month: 'Jun 26', ...FORECAST.jun, type: 'forecast' as const },
  ];

  const nineMonthData = [
    ...monthlyData.map(d => ({ month: d.month, net: d.net, type: 'actual' })),
    ...forecastMonths.map(d => ({ month: d.month, net: d.base, bear: d.bear, bull: d.bull, type: 'forecast' })),
  ];

  // Cumulative projection
  const cumForecast = [...cumulativeNet];
  const lastCum = cumulativeNet[5];
  [FORECAST.apr.base, FORECAST.may.base, FORECAST.jun.base].forEach(v => {
    cumForecast.push(cumForecast[cumForecast.length - 1] + v);
  });

  return (
    <div>
      {/* Info card */}
      <div style={{
        background: 'rgba(201,165,90,0.06)', border: `1px solid rgba(201,165,90,0.15)`,
        borderRadius: 10, padding: 16, marginBottom: 16,
      }}>
        <div style={{ fontSize: 10, color: GOLD, fontWeight: 600, marginBottom: 4 }}>Methodology</div>
        <p style={{ fontSize: 11, color: T2, lineHeight: 1.6 }}>
          Forecasts based on 6-month trailing average ({aed(Math.round(avgMonthlyNet))}/mo) with ±15% confidence band.
          Bear case accounts for seasonal dip; bull case assumes marketing-driven uplift.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <KpiCard label="April Forecast" value={aed(FORECAST.apr.base)} sub={`${aed(FORECAST.apr.bear)} – ${aed(FORECAST.apr.bull)}`} badge="Base ±15%" badgeColor={GOLD} />
        <KpiCard label="May Forecast" value={aed(FORECAST.may.base)} sub={`${aed(FORECAST.may.bear)} – ${aed(FORECAST.may.bull)}`} badge="Base ±15%" badgeColor={GOLD} />
        <KpiCard label="June Forecast" value={aed(FORECAST.jun.base)} sub={`${aed(FORECAST.jun.bear)} – ${aed(FORECAST.jun.bull)}`} badge="Base ±15%" badgeColor={GOLD} />
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
                {aed(FORECAST.apr.bear + FORECAST.may.bear + FORECAST.jun.bear)}
              </td>
              <td style={{ padding: '8px 6px', color: GOLD, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {aed(FORECAST.apr.base + FORECAST.may.base + FORECAST.jun.base)}
              </td>
              <td style={{ padding: '8px 6px', color: SAGE, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {aed(FORECAST.apr.bull + FORECAST.may.bull + FORECAST.jun.bull)}
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
function BreakevenPage() {
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
// PAGE 13: WHAT-IF SIMULATOR
// ══════════════════════════════════════════════════════════════════
function SimulatorPage() {
  const [activeScenarios, setActiveScenarios] = useState<Set<number>>(new Set());

  const currentNetProfit = Math.round(avgMonthlyNet * (PNL.grossMargin / 100) - EST_MONTHLY_COSTS.total);
  const currentCosts = EST_MONTHLY_COSTS.total;

  const scenarios = [
    {
      title: 'Rent Increase to AED 15,000/mo',
      tag: 'RISK', tagColor: ROSE,
      icon: Store,
      before: { costs: currentCosts, netProfit: currentNetProfit },
      after: {
        costs: currentCosts + 4000,
        netProfit: currentNetProfit - 4000,
      },
      impact: `Costs rise ${aed(4000)}/mo. New monthly net: ${aed(currentNetProfit - 4000)}`,
    },
    {
      title: 'Reduce Returns by 50%',
      tag: 'OPPORTUNITY', tagColor: SAGE,
      icon: RotateCcw,
      before: { annualReturns: totalReturns },
      after: { annualReturns: Math.round(totalReturns * 0.5) },
      impact: `Recover ~${aed(Math.round(totalReturns * 0.5))}/yr in saved returns`,
    },
    {
      title: 'Add 3rd Staff Member',
      tag: 'COST', tagColor: AMBER,
      icon: Users,
      before: { costs: currentCosts, netProfit: currentNetProfit },
      after: { costs: currentCosts + 3000, netProfit: currentNetProfit - 3000 },
      impact: `+${aed(3000)}/mo salary. Revenue needed: ${aed(currentCosts + 3000 + currentNetProfit)} to maintain profit`,
    },
    {
      title: 'Increase Avg Revenue by 15%',
      tag: 'GROWTH', tagColor: SAGE,
      icon: ArrowUpRight,
      before: { avgNet: Math.round(avgMonthlyNet), netProfit: currentNetProfit },
      after: {
        avgNet: Math.round(avgMonthlyNet * 1.15),
        netProfit: Math.round(avgMonthlyNet * 1.15 * (PNL.grossMargin / 100) - EST_MONTHLY_COSTS.total),
      },
      impact: `New monthly net profit: ${aed(Math.round(avgMonthlyNet * 1.15 * (PNL.grossMargin / 100) - EST_MONTHLY_COSTS.total))}`,
    },
    {
      title: 'Cut Marketing to AED 5,000/mo',
      tag: 'SAVINGS', tagColor: GOLD,
      icon: Target,
      before: { costs: currentCosts, netProfit: currentNetProfit },
      after: { costs: currentCosts - 5000, netProfit: currentNetProfit + 5000 },
      impact: `Save ${aed(5000)}/mo but risk losing visibility. Net: ${aed(currentNetProfit + 5000)}/mo`,
    },
    {
      title: 'Double the Foot Traffic',
      tag: 'OPTIMISTIC', tagColor: STEEL,
      icon: TrendingUp,
      before: { avgNet: Math.round(avgMonthlyNet) },
      after: { avgNet: Math.round(avgMonthlyNet * 2) },
      impact: `Projected monthly revenue: ${aed(Math.round(avgMonthlyNet * 2))}. Annual: ${aed(Math.round(avgMonthlyNet * 2 * 12))}`,
    },
  ];

  const toggleScenario = (idx: number) => {
    setActiveScenarios(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // Comparison chart: current vs best case
  const bestCaseGP = Math.round(avgMonthlyNet * 1.15 * (PNL.grossMargin / 100));
  const bestCaseCosts = currentCosts - 5000;
  const bestCaseNet = bestCaseGP - bestCaseCosts;
  const comparisonData = MONTHS.map((m, i) => ({
    month: m,
    current: NET[i],
    bestCase: Math.round(NET[i] * 1.15),
  }));

  return (
    <div>
      {/* 6 scenario cards */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {scenarios.map((s, i) => (
          <div key={i} style={{
            background: CARD_BG, border: `1px solid ${activeScenarios.has(i) ? `${s.tagColor}44` : BORDER}`,
            borderRadius: 10, padding: 16, cursor: 'pointer', transition: 'border-color 0.2s',
          }} onClick={() => toggleScenario(i)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <s.icon size={14} style={{ color: s.tagColor, opacity: 0.8 }} />
              <span style={{
                padding: '2px 6px', borderRadius: 4, fontSize: 7, fontWeight: 700, letterSpacing: '0.06em',
                background: `${s.tagColor}22`, color: s.tagColor,
              }}>{s.tag}</span>
            </div>
            <div style={{ fontSize: 11, color: T1, fontWeight: 500, marginBottom: 8, lineHeight: 1.4 }}>{s.title}</div>
            <div style={{ fontSize: 9, color: T2, lineHeight: 1.6, marginBottom: 10 }}>{s.impact}</div>
            <div style={{
              padding: '4px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600, textAlign: 'center',
              background: activeScenarios.has(i) ? `${s.tagColor}22` : 'rgba(255,255,255,0.03)',
              color: activeScenarios.has(i) ? s.tagColor : T3, border: `1px solid ${activeScenarios.has(i) ? `${s.tagColor}44` : BORDER}`,
            }}>
              {activeScenarios.has(i) ? 'Applied' : 'Apply Scenario'}
            </div>
          </div>
        ))}
      </div>

      {/* Comparison chart */}
      <ChartCard title="Current vs Best-Case Scenario (6 Months)" className="mb-3">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={comparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={axisTick} />
            <YAxis tick={axisTick} tickFormatter={v => aedK(v)} />
            <Tooltip content={<AEDTooltip />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: T2 }} />
            <Bar dataKey="current" name="Current" fill={GOLD} radius={[3, 3, 0, 0]} barSize={20} />
            <Line dataKey="bestCase" name="Best Case (+15%)" stroke={SAGE} strokeWidth={2} dot={{ r: 3, fill: SAGE }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Net impact scorecard */}
      <ChartCard title="Net Impact Scorecard" wide>
        <div className="grid grid-cols-3 gap-3">
          <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: T3, marginBottom: 8 }}>Current Monthly Net Profit</div>
            <div style={{ fontSize: 28, fontFamily: 'Georgia, serif', color: T1, lineHeight: 1 }}>{aed(currentNetProfit)}</div>
            <div style={{ fontSize: 10, color: T2, marginTop: 4 }}>At {PNL.grossMargin}% margin, {aed(currentCosts)} costs</div>
          </div>
          <div style={{ padding: 20, background: 'rgba(88,152,122,0.04)', borderRadius: 8, textAlign: 'center', border: `1px solid rgba(88,152,122,0.15)` }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: SAGE, marginBottom: 8 }}>Best Case (All Improvements)</div>
            <div style={{ fontSize: 28, fontFamily: 'Georgia, serif', color: SAGE, lineHeight: 1 }}>{aed(bestCaseNet)}</div>
            <div style={{ fontSize: 10, color: T2, marginTop: 4 }}>+15% revenue, {aed(5000)} marketing cut</div>
          </div>
          <div style={{ padding: 20, background: 'rgba(191,95,89,0.04)', borderRadius: 8, textAlign: 'center', border: `1px solid rgba(191,95,89,0.15)` }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: ROSE, marginBottom: 8 }}>Worst Case (All Deteriorations)</div>
            <div style={{ fontSize: 28, fontFamily: 'Georgia, serif', color: ROSE, lineHeight: 1 }}>{aed(currentNetProfit - 7000)}</div>
            <div style={{ fontSize: 10, color: T2, marginTop: 4 }}>+{aed(4000)} rent, +{aed(3000)} staff</div>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE 14: WEEKLY PERFORMANCE
// ══════════════════════════════════════════════════════════════════
function WeeklyPage() {
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
// PAGE 11: DATA INTELLIGENCE & RECOMMENDATIONS
// ══════════════════════════════════════════════════════════════════
function GapsPage() {
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
// MAIN PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════
const pageComponents: Record<PageId, React.FC> = {
  dashboard: DashboardPage,
  alerts: AlertsPage,
  pnl: PnlPage,
  capex: CapexPage,
  payback: PaybackPage,
  breakeven: BreakevenPage,
  revenue: RevenuePage,
  heatmap: HeatmapPage,
  weekly: WeeklyPage,
  returns: ReturnsPage,
  payments: PaymentsPage,
  forecast: ForecastPage,
  simulator: SimulatorPage,
  gaps: GapsPage,
};

export default function Home() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const PageComponent = pageComponents[activePage];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar active={activePage} onChange={setActivePage} />
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
          </div>
          <div style={{ width: 40, height: 2, background: GOLD, borderRadius: 1, opacity: 0.4 }} />
        </div>

        <PageComponent />
      </main>
    </div>
  );
}
