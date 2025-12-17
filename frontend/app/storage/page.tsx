'use client';

import { useEffect, useState } from 'react';
import { productService, Product, StockItem, Category, Warehouse } from '@/lib/products';
import { Warehouse as WarehouseIcon, Search, Filter, PackageSearch, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface EnrichedProduct extends Product {
  total_stock: number;
  stock_items: StockItem[];
}

export default function StoragePage() {
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState('');

  // When a warehouse is selected, we fetch stock-items for that warehouse and build a
  // productId -> quantity map. Relying on embedded product.stock_items is unreliable
  // because the /products/products/ list response may not include them.
  const [warehouseStockByProduct, setWarehouseStockByProduct] = useState<Record<number, number>>({});

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (!warehouseFilter) {
      setWarehouseStockByProduct({});
      return;
    }
    loadWarehouseStock(Number(warehouseFilter));
  }, [warehouseFilter]);

  const loadInitial = async () => {
    try {
      setLoading(true);
      const [productResponse, categoryData, warehouseData] = await Promise.all([
        productService.getProducts(),
        productService.getCategories(),
        productService.getWarehouses(),
      ]);

      const baseProducts = (productResponse.results || productResponse) as Product[];
      setProducts(
        baseProducts.map((p) => ({
          ...p,
          total_stock: p.total_stock || 0,
          stock_items: (p.stock_items || []) as StockItem[],
        })),
      );
      setCategories(categoryData);
      setWarehouses(warehouseData);

      // If a warehouse filter is already selected (e.g. via state restore), load its stock map
      if (warehouseFilter) {
        await loadWarehouseStock(Number(warehouseFilter));
      }
    } catch (error) {
      console.error('Failed to load storage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouseStock = async (warehouseId: number) => {
    try {
      const items = await productService.getStockItems({ warehouse: warehouseId });
      const next: Record<number, number> = {};
      for (const si of items) {
        // If multiple records exist per product (e.g. bins), accumulate them.
        const pid = Number((si as any).product ?? (si as any).product_id);
        if (!Number.isFinite(pid)) continue;
        next[pid] = (next[pid] || 0) + Number(si.quantity || 0);
      }
      setWarehouseStockByProduct(next);
    } catch (error) {
      console.error('Failed to load warehouse stock:', error);
      setWarehouseStockByProduct({});
    }
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());

    // Category filter: compare safely even if API sends string/null
    const matchesCategory =
      !categoryFilter || (p.category !== null && p.category !== undefined && Number(p.category) === Number(categoryFilter));

    // Warehouse filter: use stock-items endpoint (product list may not include stock_items)
    const matchesWarehouse =
      !warehouseFilter || Object.prototype.hasOwnProperty.call(warehouseStockByProduct, Number(p.id));

    return matchesSearch && matchesCategory && matchesWarehouse;
  });

  const getDisplayedStock = (p: EnrichedProduct) => {
    if (!warehouseFilter) return Number(p.total_stock || 0);
    return Number(warehouseStockByProduct[Number(p.id)] || 0);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <WarehouseIcon size={22} className="sm:w-7 sm:h-7 text-primary-600" />
              Storage
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Live view of inventory levels by product, designed for quick storage checks.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search by product name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-500" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">All categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">All warehouses</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">
              No products match the current filters.
            </p>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {filtered.map((p) => {
                  const unitLabel = p.stock_unit_detail?.code || p.stock_unit_detail?.name || '';
                  const displayedStock = getDisplayedStock(p);
                  const low = displayedStock < Number(p.reorder_level || 0);
                  const capacity = Math.max(
                    Number(p.reorder_level || 0) + Number(p.reorder_quantity || 0),
                    1,
                  );
                  const ratio = Math.min(1, displayedStock / capacity);

                  return (
                    <Link
                      key={p.id}
                      href={`/products/${p.id}`}
                      className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1">
                            <PackageSearch size={14} className="text-primary-500 flex-shrink-0" />
                            <span className="truncate">{p.name}</span>
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">SKU: {p.sku}</p>
                        </div>
                        {low ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 flex-shrink-0">
                            <AlertTriangle size={10} />
                            Low
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 flex-shrink-0">
                            Healthy
                          </span>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Category:</span>
                          <span className="text-gray-700">{p.category_name || 'Uncategorized'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Stock:</span>
                          <span className={`font-semibold ${low ? 'text-amber-700' : 'text-gray-900'}`}>
                            {displayedStock} {unitLabel}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Reorder Level:</span>
                          <span className="text-gray-700">{p.reorder_level} {unitLabel}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden mt-2">
                          <div
                            className={`h-full rounded-full ${
                              ratio < 0.3 ? 'bg-red-500' : ratio < 0.7 ? 'bg-amber-400' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${ratio * 100}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-gray-700">
                      <th className="py-2 px-3 text-left">Product</th>
                      <th className="py-2 px-3 text-left">Category</th>
                      <th className="py-2 px-3 text-right">Total stock</th>
                      <th className="py-2 px-3 text-right">Reorder level</th>
                      <th className="py-2 px-3 text-right">Status</th>
                      <th className="py-2 px-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const unitLabel = p.stock_unit_detail?.code || p.stock_unit_detail?.name || '';
                      const displayedStock = getDisplayedStock(p);
                      const low = displayedStock < Number(p.reorder_level || 0);
                      const capacity = Math.max(
                        Number(p.reorder_level || 0) + Number(p.reorder_quantity || 0),
                        1,
                      );
                      const ratio = Math.min(1, displayedStock / capacity);

                      return (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                          <td className="py-2 px-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900 flex items-center gap-1">
                                <PackageSearch size={14} className="text-primary-500" />
                                {p.name}
                              </span>
                              <span className="text-xs text-gray-500">SKU {p.sku}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-gray-600">{p.category_name || 'Uncategorized'}</td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className={`font-semibold ${low ? 'text-amber-700' : 'text-gray-900'}`}>
                                {displayedStock} {unitLabel}
                              </span>
                              <div className="w-32 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    ratio < 0.3 ? 'bg-red-500' : ratio < 0.7 ? 'bg-amber-400' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${ratio * 100}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right text-gray-600">
                            {p.reorder_level} {unitLabel}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {low ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                <AlertTriangle size={12} />
                                Low
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                Healthy
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <Link
                              href={`/products/${p.id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50 dark:text-primary-200 dark:hover:bg-primary-900/40"
                            >
                              View product
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}


