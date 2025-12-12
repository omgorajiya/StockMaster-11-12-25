'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import {
  analyticsService,
  AnalyticsDashboard,
  ReplenishmentSuggestion,
  ServiceLevelMetrics,
  AbcXyzMatrix,
  ABCAnalysis,
} from '@/lib/analytics';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  Line,
  ComposedChart,
} from 'recharts';
import { TrendingUp, Package, DollarSign, AlertTriangle, Clock, Activity } from 'lucide-react';

// Distinct palette (no immediate repeats) for analytics visuals.
const COLORS = [
  '#16a34a', // emerald
  '#f97316', // orange
  '#dc2626', // red
  '#0ea5e9', // sky
  '#6366f1', // indigo
  '#a855f7', // purple
  '#ec4899', // pink
  '#facc15', // amber
];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [replenishment, setReplenishment] = useState<ReplenishmentSuggestion[]>([]);
  const [serviceLevels, setServiceLevels] = useState<ServiceLevelMetrics | null>(null);
  const [abcXyz, setAbcXyz] = useState<AbcXyzMatrix | null>(null);
  const [abcDetail, setAbcDetail] = useState<ABCAnalysis | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [dashboardData, replenishmentData, serviceData, abcXyzData, abcDetailData] = await Promise.all([
        analyticsService.getAnalyticsDashboard(),
        analyticsService.getReplenishmentSuggestions(),
        analyticsService.getServiceLevels(),
        analyticsService.getAbcXyzMatrix(),
        analyticsService.getABCAnalysis(),
      ]);
      setAnalytics(dashboardData);
      setReplenishment(replenishmentData.results.slice(0, 8));
      setServiceLevels(serviceData);
      setAbcXyz(abcXyzData);
      setAbcDetail(abcDetailData);
    } catch (error: any) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-8 text-gray-500">Loading analytics...</div>
      </Layout>
    );
  }

  if (!analytics) {
    return (
      <Layout>
        <div className="text-center py-8 text-gray-500">No analytics data available</div>
      </Layout>
    );
  }

  const categoryAvailability = (() => {
    if (!abcDetail) return [];
    const byCategory: Record<
      string,
      {
        totalStock: number;
        productCount: number;
      }
    > = {};

    for (const product of abcDetail.products) {
      const key = product.category || 'Uncategorized';
      if (!byCategory[key]) {
        byCategory[key] = { totalStock: 0, productCount: 0 };
      }
      byCategory[key].totalStock += product.stock_quantity;
      byCategory[key].productCount += 1;
    }

    return Object.entries(byCategory)
      .map(([name, value]) => ({
        name,
        totalStock: value.totalStock,
        productCount: value.productCount,
      }))
      .sort((a, b) => b.totalStock - a.totalStock);
  })();

  const totalCategoryStock = categoryAvailability.reduce((sum, d) => sum + (d.totalStock || 0), 0);
  const matrixBuckets = ['AX', 'AY', 'AZ', 'BX', 'BY', 'BZ', 'CX', 'CY', 'CZ'];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Comprehensive inventory insights and metrics</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Total Inventory Value</p>
                <p className="text-2xl font-bold mt-2">
                  ${analytics.total_inventory_value.toLocaleString()}
                </p>
              </div>
              <DollarSign size={32} className="text-primary-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Inventory Turnover</p>
                <p className="text-2xl font-bold mt-2">
                  {analytics.inventory_turnover.ratio.toFixed(2)}x
                </p>
              </div>
              <TrendingUp size={32} className="text-green-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Dead Stock Products</p>
                <p className="text-2xl font-bold mt-2">{analytics.dead_stock.product_count}</p>
              </div>
              <AlertTriangle size={32} className="text-orange-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Dead Stock Value</p>
                <p className="text-2xl font-bold mt-2">
                  ${analytics.dead_stock.total_value.toLocaleString()}
                </p>
              </div>
              <Package size={32} className="text-red-600" />
            </div>
          </div>
        </div>

        {/* Inventory availability by category */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Inventory Availability by Category</h2>
          {categoryAvailability.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-gray-500 dark:text-gray-300">
              No category availability data yet.
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Futuristic line/area chart for category stock */}
            <div className="h-[260px] md:h-[300px] rounded-xl p-4 bg-white text-slate-900 dark:text-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 border border-gray-100 dark:border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={categoryAvailability}>
                  <defs>
                    <linearGradient id="abcAreaPositive" x1="0" y1="1" x2="1" y2="0">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.05} />
                      <stop offset="45%" stopColor="#22c55e" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="abcLineStroke" x1="0" y1="1" x2="1" y2="0">
                      <stop offset="0%" stopColor="#16a34a" />
                      <stop offset="50%" stopColor="#22c55e" />
                      <stop offset="80%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                    <filter id="abcGlow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.2)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#f9fafb',
                      border: '1px solid rgba(148,163,184,0.4)',
                      borderRadius: '0.75rem',
                      color: '#0f172a',
                    }}
                  />
                  <Legend />
                  {/* Soft green area under the curve (category stock) */}
                  <Area
                    type="monotone"
                    dataKey="totalStock"
                    stroke="transparent"
                    fill="url(#abcAreaPositive)"
                    dot={false}
                    activeDot={false}
                  />
                  {/* 3D-feel line on top, with green/red gradient */}
                  <Line
                    type="monotone"
                    dataKey="totalStock"
                    stroke="url(#abcLineStroke)"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      strokeWidth: 2,
                      stroke: '#020617',
                      fill: '#22c55e',
                    }}
                    activeDot={{
                      r: 6,
                      strokeWidth: 2,
                      stroke: '#0f172a',
                      fill: '#22c55e',
                    }}
                    style={{ filter: 'url(#abcGlow)' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart: share of total stock by category */}
            <div className="h-[260px] md:h-[300px]">
              {totalCategoryStock > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryAvailability}
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="totalStock"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {categoryAvailability.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#f9fafb',
                        border: '1px solid rgba(148,163,184,0.4)',
                        borderRadius: '0.75rem',
                        color: '#0f172a',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">No ABC value data</div>
              )}
            </div>
          </div>
          )}
          <div className="mt-4 grid grid-cols-3 gap-4">
            {categoryAvailability.map((item, index) => (
              <div
                key={item.name}
                className="text-center p-4 rounded-lg bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 border border-gray-100 dark:border-slate-700"
              >
                <p className="font-semibold text-lg">{item.name}</p>
                <p
                  className="text-2xl font-bold mt-2"
                  style={{ color: COLORS[index % COLORS.length] }}
                >
                  {item.totalStock.toLocaleString()} units
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {item.productCount} products
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Turnover Details */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Inventory Turnover Details</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-600">Turnover Ratio</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-300 mt-2">
                {analytics.inventory_turnover.ratio.toFixed(2)}x
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-gray-600">COGS</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-300 mt-2">
                ${analytics.inventory_turnover.cogs.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm text-gray-600">Avg Inventory</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-300 mt-2">
                ${analytics.inventory_turnover.average_inventory.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Replenishment Suggestions */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Replenishment Suggestions</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Based on the last 90 days of outbound demand
              </p>
            </div>
            <Activity size={24} className="text-primary-600" />
          </div>
          {replenishment.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-300">No products are projected to stock out soon.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
                    <th className="py-2 pr-4">Product</th>
                    <th className="py-2 pr-4">Current Stock</th>
                    <th className="py-2 pr-4">Daily Demand</th>
                    <th className="py-2 pr-4">Suggested Qty</th>
                    <th className="py-2">Days to Stockout</th>
                  </tr>
                </thead>
                <tbody>
                  {replenishment.map((row) => (
                    <tr key={`${row.product_id}-${row.warehouse_id}`} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{row.product_name}</p>
                        <p className="text-xs text-gray-500">SKU {row.sku}</p>
                      </td>
                      <td className="py-3 pr-4">{row.current_stock.toFixed(1)}</td>
                      <td className="py-3 pr-4">{row.avg_daily_demand.toFixed(2)}</td>
                      <td className="py-3 pr-4 text-primary-600 font-semibold">{row.suggested_quantity.toFixed(1)}</td>
                      <td className="py-3">
                        {row.days_until_stockout ? `${row.days_until_stockout.toFixed(1)} days` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Service Levels */}
        {serviceLevels && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Service Level & Fill Rate</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Rolling 30-day overview</p>
              </div>
              <Clock size={24} className="text-primary-600" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">On-time rate</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">
                  {(serviceLevels.overall.on_time_rate * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">Fill rate</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-300">
                  {(serviceLevels.overall.fill_rate * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">Avg lead time</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-300">
                  {serviceLevels.overall.avg_lead_time_hours.toFixed(1)}h
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">Open units</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-300">
                  {serviceLevels.overall.open_units.toFixed(0)}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
                    <th className="py-2 pr-4">Warehouse</th>
                    <th className="py-2 pr-4">Deliveries</th>
                    <th className="py-2 pr-4">Completed</th>
                    <th className="py-2 pr-4">On-time rate</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceLevels.warehouses.map((warehouse) => (
                    <tr key={warehouse.warehouse_id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 pr-4 font-medium">{warehouse.warehouse_name}</td>
                      <td className="py-2 pr-4">{warehouse.total_deliveries}</td>
                      <td className="py-2 pr-4">{warehouse.done_deliveries}</td>
                      <td className="py-2 pr-4">
                        {(warehouse.on_time_rate * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABC / XYZ Matrix */}
        {abcXyz && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">ABC / XYZ Segmentation</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {matrixBuckets.map((bucket) => {
                const entry = abcXyz.matrix[bucket] || { count: 0, sample_products: [] };
                return (
                  <div
                    key={bucket}
                    className="rounded-lg border border-gray-100 dark:border-gray-700 p-4 hover:border-primary-200"
                  >
                    <p className="text-sm text-gray-500">Segment</p>
                    <p className="text-2xl font-bold text-primary-600">{bucket}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {entry.count} products
                    </p>
                    {entry.sample_products.length > 0 && (
                      <ul className="mt-2 text-xs text-gray-500 space-y-1">
                        {entry.sample_products.map((product) => (
                          <li key={product.id}>
                            {product.name} ({product.sku})
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
