'use client';

import { useEffect, useMemo, useState } from 'react';
import { dashboardService, DashboardKPIs, RecentActivity, LowStockProduct, MovementValueTrend, InventoryValueByHealth } from '@/lib/dashboard';
import { productService, Warehouse } from '@/lib/products';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Package,
  AlertTriangle,
  Receipt,
  Truck,
  ArrowLeftRight,
  Activity,
  Sparkles,
  Bot,
  Brain,
  Radar,
  Clock,
  Workflow,
  Target,
  Users,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [kpis, setKPIs] = useState<DashboardKPIs | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [movementTrend, setMovementTrend] = useState<MovementValueTrend[]>([]);
  const [valueByHealth, setValueByHealth] = useState<InventoryValueByHealth | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [timeRange, setTimeRange] = useState<number>(30);
  const [showStatusBreakdown, setShowStatusBreakdown] = useState<boolean>(true);

  useEffect(() => {
    loadDashboardData();
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const data = await productService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [kpisData, activitiesData, lowStockData, movementTrendData, valueByHealthData] = await Promise.all([
        dashboardService.getKPIs(),
        dashboardService.getRecentActivities(5),
        dashboardService.getLowStockProducts(),
        dashboardService.getMovementValueTrend(timeRange, selectedWarehouse, showStatusBreakdown),
        dashboardService.getInventoryValueByHealth(selectedWarehouse),
      ]);
      setKPIs(kpisData);
      setActivities(activitiesData);
      setLowStock(lowStockData);
      setMovementTrend(movementTrendData.trend);
      setValueByHealth(valueByHealthData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeRange) {
      loadMovementTrend();
    }
  }, [timeRange, selectedWarehouse, showStatusBreakdown]);

  useEffect(() => {
    if (selectedWarehouse !== undefined) {
      loadValueByHealth();
    }
  }, [selectedWarehouse]);

  const loadMovementTrend = async () => {
    try {
      const data = await dashboardService.getMovementValueTrend(timeRange, selectedWarehouse, showStatusBreakdown);
      setMovementTrend(data.trend);
    } catch (error) {
      console.error('Failed to load movement trend:', error);
    }
  };

  const loadValueByHealth = async () => {
    try {
      const data = await dashboardService.getInventoryValueByHealth(selectedWarehouse);
      setValueByHealth(data);
    } catch (error) {
      console.error('Failed to load value by health:', error);
    }
  };

  const handleStockInfoAiAsk = async () => {
    if (!aiQuestion.trim()) return;
    setAiThinking(true);
    // Simple, frontend-only simulated response for now.
    // This is designed as an obvious placeholder for a future AI backend.
    const question = aiQuestion.toLowerCase();
    let response =
      "I'm StockInfo-AI, your early preview warehouse co-pilot. In a full deployment I would analyze live KPIs, movements, and historical patterns to suggest actions in plain language.";

    if (question.includes('stockout') || question.includes('out of stock')) {
      response =
        'Stockouts this week are typically driven by A‑class items with tight safety stock and volatile demand. Consider increasing safety stock on fast‑moving SKUs and tightening inbound lead-time monitoring for the top 10 risky suppliers.';
    } else if (question.includes('safety stock') || question.includes('fill rate')) {
      response =
        'Reducing safety stock by 10% on A‑class SKUs will likely improve space utilization but may reduce fill rate by 2‑5% depending on demand variability. A safer play is to reduce buffer first on C‑class and slow movers while you monitor service levels.';
    } else if (question.includes('returns')) {
      response =
        'The spike in returns is usually linked to mis-picks or product data issues. Focus on locations with the highest pick frequency, validate barcodes, and audit 1–2 waves with the highest error rate.';
    }

    // Small delay to make the interaction feel intentional without any backend.
    await new Promise((resolve) => setTimeout(resolve, 500));
    setAiAnswer(response);
    setAiThinking(false);
  };

  const inventoryHealthScore = useMemo(() => {
    if (!kpis) return 72;
    // Very rough heuristic: more low/out-of-stock items reduce the score.
    const penalties = (kpis.low_stock_items || 0) * 0.3 + (kpis.out_of_stock_items || 0) * 0.8;
    const base = 95;
    return Math.max(35, Math.min(99, Math.round(base - penalties)));
  }, [kpis]);

  const riskItems = useMemo(
    () => [
      {
        label: 'Upcoming stockouts',
        probability: 'High',
        impact: 'Severe',
        window: 'Next 3 days',
        icon: AlertTriangle,
        tone: 'border-red-200 bg-red-50 text-red-800',
      },
      {
        label: 'Aging inventory',
        probability: 'Medium',
        impact: 'Moderate',
        window: 'Next 2 weeks',
        icon: Package,
        tone: 'border-amber-200 bg-amber-50 text-amber-800',
      },
      {
        label: 'Inbound congestion',
        probability: 'Medium',
        impact: 'High',
        window: 'Tomorrow morning',
        icon: Truck,
        tone: 'border-sky-200 bg-sky-50 text-sky-800',
      },
      {
        label: 'Supplier delay risk',
        probability: 'Low',
        impact: 'High',
        window: 'Next 30 days',
        icon: Receipt,
        tone: 'border-indigo-200 bg-indigo-50 text-indigo-800',
      },
    ],
    []
  );

  const anomalyFeed = useMemo(
    () => [
      {
        id: 1,
        title: 'Returns spike on SKU cluster R‑12',
        hint: 'Likely labeling or description mismatch',
        severity: 'High',
      },
      {
        id: 2,
        title: 'Pick time anomaly in Zone B',
        hint: 'Travel distance and congestion above normal baseline',
        severity: 'Medium',
      },
      {
        id: 3,
        title: 'Unusual transfer pattern between WH‑01 and WH‑03',
        hint: 'Potential re‑slotting opportunity',
        severity: 'Medium',
      },
      {
        id: 4,
        title: 'Cycle count variance cluster in A‑rack',
        hint: 'Consider focused audit on A‑03 to A‑07',
        severity: 'Low',
      },
    ],
    []
  );

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </>
    );
  }

  const kpiCards = [
    {
      title: 'Total Products',
      value: kpis?.total_products || 0,
      icon: Package,
      color: 'bg-blue-500',
      href: '/products',
    },
    {
      title: 'Low Stock Items',
      value: kpis?.low_stock_items || 0,
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      href: '/products?filter=low_stock',
    },
    {
      title: 'Out of Stock',
      value: kpis?.out_of_stock_items || 0,
      icon: AlertTriangle,
      color: 'bg-red-500',
      href: '/products?filter=out_of_stock',
    },
    {
      title: 'Pending Receipts',
      value: kpis?.pending_receipts || 0,
      icon: Receipt,
      color: 'bg-green-500',
      href: '/receipts?status=draft,waiting,ready',
    },
    {
      title: 'Pending Deliveries',
      value: kpis?.pending_deliveries || 0,
      icon: Truck,
      color: 'bg-purple-500',
      href: '/deliveries?status=draft,waiting,ready',
    },
    {
      title: 'Scheduled Transfers',
      value: kpis?.scheduled_transfers || 0,
      icon: ArrowLeftRight,
      color: 'bg-indigo-500',
      href: '/transfers?status=draft,waiting,ready',
    },
  ];

  // Format movement trend data for chart
  const movementChartData = movementTrend.length > 0 
    ? movementTrend.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        receipts: item.receipts_value,
        deliveries: item.deliveries_value,
        transfers: item.transfers_value,
      }))
    : [];

  // Format stock health value data for chart
  const stockHealthData = valueByHealth
    ? [
        {
          name: 'Healthy',
          value: valueByHealth.healthy.value,
          count: valueByHealth.healthy.count,
        },
        {
          name: 'Low stock',
          value: valueByHealth.low_stock.value,
          count: valueByHealth.low_stock.count,
        },
        {
          name: 'Out of stock',
          value: valueByHealth.out_of_stock.value,
          count: valueByHealth.out_of_stock.count,
        },
      ]
    : [
        { name: 'Healthy', value: 0, count: 0 },
        { name: 'Low stock', value: 0, count: 0 },
        { name: 'Out of stock', value: 0, count: 0 },
      ];

  const stockHealthColors = ['#22c55e', '#eab308', '#ef4444'];

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Operations Command Center</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              A warehouse command center with StockInfo-AI giving you an intelligent view of inventory, flows, and risk.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 px-3 sm:px-4 py-1.5 text-xs font-medium text-white shadow-sm">
            <Sparkles size={14} className="sm:w-4 sm:h-4 animate-pulse" />
            <span className="hidden xs:inline">Next‑Gen Dashboard Preview</span>
            <span className="xs:hidden">Next‑Gen</span>
          </div>
        </div>

        {/* Top: StockInfo-AI + Inventory Health / Risk Snapshot */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* StockInfo-AI */}
          <div className="xl:col-span-2 bg-white rounded-2xl shadow border border-slate-100/80 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100/80 px-5 py-3 bg-slate-50/80">
              <StockInfoLogo />
              <div>
                <p className="text-sm font-semibold text-slate-900">StockInfo-AI</p>
                <p className="text-xs text-slate-500">
                  Ask natural‑language questions and explore “what‑if” scenarios.
                </p>
              </div>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap gap-2 text-[10px] sm:text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                  <Activity size={10} className="sm:w-3 sm:h-3" /> <span className="hidden xs:inline">Why are stockouts up this week?</span><span className="xs:hidden">Stockouts?</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                  <Brain size={10} className="sm:w-3 sm:h-3" /> <span className="hidden xs:inline">What if I cut safety stock by 10%?</span><span className="xs:hidden">Safety stock?</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                  <Clock size={10} className="sm:w-3 sm:h-3" /> <span className="hidden xs:inline">Which orders are at SLA risk today?</span><span className="xs:hidden">SLA risk?</span>
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex rounded-xl border border-slate-200 bg-slate-50/80 px-2 sm:px-3 py-2 text-[10px] sm:text-xs text-slate-500">
                  <span className="mr-1 font-semibold text-slate-600">Preview ·</span>
                  <span className="hidden sm:inline">StockInfo-AI currently runs purely in the browser as a UX preview. Wire it to your AI or analytics backend when you are ready.</span>
                  <span className="sm:hidden">AI preview mode - connect to backend for full functionality.</span>
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder='Ask: "Why stockouts up?" or "Cut safety stock 10%?"'
                    className="flex-1 min-h-[60px] sm:min-h-[80px] resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
                  <button
                    onClick={handleStockInfoAiAsk}
                    disabled={aiThinking || !aiQuestion.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-2 sm:py-1.5 text-xs font-medium text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {aiThinking ? (
                      <>
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                        Thinking…
                      </>
                    ) : (
                      <>
                        <Brain size={14} />
                        Ask StockInfo-AI
                      </>
                    )}
                  </button>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 text-center sm:text-left">
                    <span className="hidden sm:inline">Responses are heuristic for now — plug StockInfo-AI into your AI service to go fully live.</span>
                    <span className="sm:hidden">Heuristic responses - connect AI backend for full functionality.</span>
                  </p>
                </div>
              </div>
              {aiAnswer && (
                <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/80 px-3 py-2 text-sm text-indigo-900">
                  <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">
                    <Bot size={14} /> StockInfo-AI insight
                  </p>
                  <p className="text-sm leading-relaxed">{aiAnswer}</p>
                </div>
              )}
            </div>
          </div>

          {/* Inventory Health + Quick Risk Snapshot */}
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-sky-500 to-indigo-600 p-4 text-white shadow">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-100/90">Inventory Health</p>
                  <p className="text-lg font-semibold">Composite health score</p>
                </div>
                <Target size={24} className="opacity-80" />
              </div>
              <div className="flex items-center gap-4">
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
                  <div className="absolute inset-0 rounded-full bg-white/10 blur" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-slate-950/10">
                    <span className="text-2xl font-bold">{inventoryHealthScore}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-1 text-xs">
                  <p className="text-emerald-50">
                    Based on low‑stock and out‑of‑stock signals, updated continuously from live data.
                  </p>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100/30">
                    <div
                      className="h-full rounded-full bg-emerald-300"
                      style={{ width: `${inventoryHealthScore}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-emerald-100/90">
                    Aim to keep this above <span className="font-semibold">90</span> for best service levels.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow border border-slate-100/80 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/80 text-white">
                  <Radar size={14} />
                </div>
                <p className="text-sm font-semibold text-slate-900">Predictive Risk Radar</p>
              </div>
              <div className="space-y-2">
                {riskItems.map((risk) => {
                  const Icon = risk.icon;
                  return (
                    <div
                      key={risk.label}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${risk.tone}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/70 text-slate-900">
                          <Icon size={14} />
                        </div>
                        <div>
                          <p className="font-semibold">{risk.label}</p>
                          <p className="text-[11px] opacity-80">Window: {risk.window}</p>
                        </div>
                      </div>
                      <div className="text-right text-[11px]">
                        <p className="font-semibold uppercase tracking-wide">P: {risk.probability}</p>
                        <p className="opacity-80">Impact: {risk.impact}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link
                href="/settings/integrations"
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                <Workflow size={12} />
                View automation playbooks
              </Link>
            </div>
          </div>
        </div>

        {/* Live operations & stock overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Inventory Movement Value Trend */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow border border-slate-100/80 dark:border-gray-800 p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-gray-100">
                  Inventory Movement Value Trend
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-gray-400">
                  Financial view of inbound, outbound, and inter-warehouse movements over time. Toggle status breakdown to see document workflow stages.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowStatusBreakdown(!showStatusBreakdown)}
                  className={`text-xs px-3 py-1 rounded-lg border transition-all duration-200 ${
                    showStatusBreakdown
                      ? 'bg-primary-100 border-primary-300 text-primary-700 dark:bg-primary-900/40 dark:border-primary-700 dark:text-primary-200'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100'
                  }`}
                  title="Toggle status breakdown"
                >
                  {showStatusBreakdown ? 'Hide Status' : 'Show Status'}
                </button>
                <select
                  value={selectedWarehouse || ''}
                  onChange={(e) => setSelectedWarehouse(e.target.value ? Number(e.target.value) : undefined)}
                  className="text-xs px-2 py-1 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(Number(e.target.value))}
                  className="text-xs px-2 py-1 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                >
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={movementChartData}>
                  <defs>
                    <linearGradient id="receiptsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="deliveriesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="transfersGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="#64748b"
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
                      return `$${value.toFixed(0)}`;
                    }}
                  />
                  <Tooltip
                    formatter={(value: any) => [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '']}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{
                      backgroundColor: '#f9fafb',
                      border: '1px solid rgba(148,163,184,0.4)',
                      borderRadius: '0.75rem',
                      fontSize: 12,
                    }}
                  />
                  {showStatusBreakdown && movementChartData.length > 0 && movementChartData[0]?.receipts_done !== undefined ? (
                    <>
                      {/* Receipts Status Breakdown */}
                      <Area
                        type="monotone"
                        dataKey="receipts_done"
                        name="Receipts - Done"
                        stackId="receipts"
                        stroke="#16a34a"
                        strokeWidth={1.5}
                        fill="#22c55e"
                        fillOpacity={0.7}
                      />
                      <Area
                        type="monotone"
                        dataKey="receipts_ready"
                        name="Receipts - Ready"
                        stackId="receipts"
                        stroke="#4ade80"
                        strokeWidth={1.5}
                        fill="#4ade80"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="receipts_waiting"
                        name="Receipts - Waiting"
                        stackId="receipts"
                        stroke="#86efac"
                        strokeWidth={1.5}
                        fill="#86efac"
                        fillOpacity={0.5}
                      />
                      <Area
                        type="monotone"
                        dataKey="receipts_draft"
                        name="Receipts - Draft"
                        stackId="receipts"
                        stroke="#bbf7d0"
                        strokeWidth={1.5}
                        fill="#bbf7d0"
                        fillOpacity={0.4}
                      />
                      {/* Deliveries Status Breakdown */}
                      <Area
                        type="monotone"
                        dataKey="deliveries_done"
                        name="Deliveries - Done"
                        stackId="deliveries"
                        stroke="#dc2626"
                        strokeWidth={1.5}
                        fill="#ef4444"
                        fillOpacity={0.7}
                      />
                      <Area
                        type="monotone"
                        dataKey="deliveries_ready"
                        name="Deliveries - Ready"
                        stackId="deliveries"
                        stroke="#f87171"
                        strokeWidth={1.5}
                        fill="#f87171"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="deliveries_waiting"
                        name="Deliveries - Waiting"
                        stackId="deliveries"
                        stroke="#fca5a5"
                        strokeWidth={1.5}
                        fill="#fca5a5"
                        fillOpacity={0.5}
                      />
                      <Area
                        type="monotone"
                        dataKey="deliveries_draft"
                        name="Deliveries - Draft"
                        stackId="deliveries"
                        stroke="#fecaca"
                        strokeWidth={1.5}
                        fill="#fecaca"
                        fillOpacity={0.4}
                      />
                      {/* Transfers Status Breakdown */}
                      <Area
                        type="monotone"
                        dataKey="transfers_done"
                        name="Transfers - Done"
                        stackId="transfers"
                        stroke="#4f46e5"
                        strokeWidth={1.5}
                        fill="#6366f1"
                        fillOpacity={0.7}
                      />
                      <Area
                        type="monotone"
                        dataKey="transfers_ready"
                        name="Transfers - Ready"
                        stackId="transfers"
                        stroke="#818cf8"
                        strokeWidth={1.5}
                        fill="#818cf8"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="transfers_waiting"
                        name="Transfers - Waiting"
                        stackId="transfers"
                        stroke="#a5b4fc"
                        strokeWidth={1.5}
                        fill="#a5b4fc"
                        fillOpacity={0.5}
                      />
                      <Area
                        type="monotone"
                        dataKey="transfers_draft"
                        name="Transfers - Draft"
                        stackId="transfers"
                        stroke="#c7d2fe"
                        strokeWidth={1.5}
                        fill="#c7d2fe"
                        fillOpacity={0.4}
                      />
                    </>
                  ) : (
                    <>
                      <Area
                        type="monotone"
                        dataKey="receipts"
                        name="Receipts (Inbound)"
                        stackId="1"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fill="url(#receiptsGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="deliveries"
                        name="Deliveries (Outbound)"
                        stackId="1"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fill="url(#deliveriesGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="transfers"
                        name="Transfers (Inter-warehouse)"
                        stackId="1"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fill="url(#transfersGradient)"
                      />
                    </>
                  )}
                  <Legend
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px', maxHeight: '120px', overflowY: 'auto' }}
                    iconType="circle"
                    formatter={(value) => {
                      // Shorten long legend labels for better display
                      if (value.includes(' - ')) {
                        const parts = value.split(' - ');
                        const type = parts[0].substring(0, 4);
                        return `${type} - ${parts[1]}`;
                      }
                      return value;
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Inventory Value by Health Status */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow border border-slate-100/80 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-gray-100">
                Inventory Value Distribution by Stock Health
              </h2>
              <select
                value={selectedWarehouse || ''}
                onChange={(e) => setSelectedWarehouse(e.target.value ? Number(e.target.value) : undefined)}
                className="text-[10px] px-2 py-1 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              >
                <option value="">All</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 mb-3">
              Value-based view prioritizing high-value items needing attention.
            </p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockHealthData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                  >
                    {stockHealthData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={stockHealthColors[index]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      name
                    ]}
                    contentStyle={{
                      backgroundColor: '#f9fafb',
                      border: '1px solid rgba(148,163,184,0.4)',
                      borderRadius: '0.75rem',
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-gray-300">
              {stockHealthData.map((entry, index) => (
                <li key={entry.name} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: stockHealthColors[index] }}
                    />
                    <span>{entry.name}</span>
                  </span>
                  <div className="text-right">
                    <span className="font-semibold">
                      ${Number(entry.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-gray-400 ml-1">
                      ({entry.count} items)
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            {valueByHealth && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-[10px] text-slate-500 dark:text-gray-400">
                  Total Inventory Value: <span className="font-semibold text-slate-700 dark:text-gray-200">
                    ${Number(valueByHealth.total_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className="bg-white rounded-lg shadow p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer border-2 border-transparent hover:border-primary-200 active:scale-95"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-gray-600 text-sm font-medium group-hover:text-gray-900 transition-colors">{card.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2 group-hover:text-primary-600 transition-colors">{card.value}</p>
                  </div>
                  <div className={`${card.color} p-3 rounded-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                    <Icon className="text-white" size={24} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Middle: Flow timeline + Workforce snapshot */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Real-Time Flow Timeline (simplified) */}
          <div className="2xl:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow border border-slate-100/80 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-slate-500 dark:text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Real‑Time Flow Timeline</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400">Today · inbound, outbound, transfers & issues</p>
            </div>
            <div className="space-y-3">
              {['08:00', '10:00', '12:00', '14:00', '16:00'].map((slot, index) => (
                <div key={slot} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
                    <span>{slot}</span>
                    <span>{index === 2 ? 'Peak wave' : index === 3 ? 'High activity' : 'Normal'}</span>
                  </div>
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
                    <div className="h-full bg-emerald-400" style={{ width: `${40 + index * 8}%` }} />
                    <div className="h-full bg-sky-400" style={{ width: `${20 + index * 5}%` }} />
                    <div className="h-full bg-indigo-400" style={{ width: `${5 + index * 3}%` }} />
                    {index >= 2 && <div className="h-full bg-rose-400" style={{ width: `${5 + index * 4}%` }} />}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-500 dark:text-gray-400">
              Replace this simulated timeline with your live order, receipt, transfer and exception feeds to spot
              congestion and SLA risks in real time.
            </p>
          </div>

          {/* Workforce Snapshot */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow border border-slate-100/80 dark:border-gray-800 p-4">
              <div className="mb-3 flex items-center gap-2">
                <UserGroupIcon />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Workforce & Equipment Utilization</h2>
              </div>
              <div className="space-y-2 text-xs text-slate-700 dark:text-gray-300">
                <UtilizationRow label="Pickers" value={78} tone="from-emerald-400 to-emerald-500" />
                <UtilizationRow label="Forklifts" value={64} tone="from-sky-400 to-sky-500" />
                <UtilizationRow label="Pack stations" value={82} tone="from-indigo-400 to-indigo-500" />
                <UtilizationRow label="Dock capacity" value={55} tone="from-amber-400 to-amber-500" />
              </div>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-gray-400">
                Use this as a template to connect live telemetry from devices and shift data to rebalance work by zone.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom: Existing operational cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Recent Activities */}
          <div className="bg-white rounded-2xl shadow border border-slate-100/80 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activities</h2>
            <div className="space-y-3">
              {activities.length === 0 ? (
                <p className="text-gray-500 text-sm">No recent activities</p>
              ) : (
                activities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-sm transition-all duration-200 cursor-pointer"
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {activity.document_number}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.type} • {activity.warehouse || `${activity.from_warehouse} → ${activity.to_warehouse}`}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        activity.status === 'done'
                          ? 'bg-green-100 text-green-800'
                          : activity.status === 'ready'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {activity.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Low Stock Products */}
          <div className="bg-white rounded-2xl shadow border border-slate-100/80 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Low Stock Alert</h2>
            <div className="space-y-3">
              {lowStock.length === 0 ? (
                <p className="text-gray-500 text-sm">No low stock items</p>
              ) : (
                lowStock.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 hover:shadow-sm transition-all duration-200 cursor-pointer"
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">
                        Stock: {product.current_stock} • Reorder: {product.reorder_level}
                      </p>
                    </div>
                    <AlertTriangle className="text-yellow-600" size={20} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Anomaly Detection Feed – positioned at the bottom of the dashboard */}
        <div className="bg-white rounded-2xl shadow border border-slate-100/80 p-6">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-900">Dynamic Anomaly Detection Feed</h2>
          </div>
          <div className="space-y-2">
            {anomalyFeed.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{item.title}</p>
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      item.severity === 'High'
                        ? 'bg-rose-100 text-rose-700'
                        : item.severity === 'Medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {item.severity}
                  </span>
                </div>
                <p className="mt-1 text-[11px] opacity-80">{item.hint}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-amber-700/80">
            In a full deployment this feed would be powered by anomaly detection over your event and movement streams.
          </p>
        </div>
      </div>
    </>
  );
}

interface UtilizationRowProps {
  label: string;
  value: number;
  tone: string;
}

function StockInfoLogo() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm ring-1 ring-indigo-500/60">
      <svg
        viewBox="0 0 32 32"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="stockinfo-line" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="stockinfo-fill" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="rgba(15,23,42,0)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0.4)" />
          </linearGradient>
        </defs>
        <path
          d="M4 24 L4 10 Q8 6 12 10 T20 11.5 T28 7"
          fill="none"
          stroke="url(#stockinfo-line)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M4 24 L4 14 Q9 8.5 13 11.5 T21 13 T28 9 L28 24 Z"
          fill="url(#stockinfo-fill)"
        />
        <circle cx="12" cy="10" r="1.2" fill="#22c55e" />
        <circle cx="20" cy="11.5" r="1.2" fill="#3b82f6" />
        <circle cx="28" cy="7" r="1.2" fill="#a855f7" />
      </svg>
    </div>
  );
}

function UserGroupIcon() {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-sm">
      <Users size={14} />
    </div>
  );
}

function UtilizationRow({ label, value, tone }: UtilizationRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-600 dark:text-gray-300">{label}</span>
        <span className="text-[11px] font-semibold text-slate-800 dark:text-gray-200">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tone}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}


