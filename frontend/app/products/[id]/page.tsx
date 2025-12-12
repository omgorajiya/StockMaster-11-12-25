'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { productService, Product, StockItem } from '@/lib/products';
import { ArrowLeft, PackageSearch, Warehouse, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = parseInt(params.id as string);

  const [product, setProduct] = useState<Product | null>(null);
  const [stockByWarehouse, setStockByWarehouse] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(productId)) return;
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const productData = await productService.getProduct(productId);
      const stockData = await productService.getStockByWarehouse(productId);
      setProduct(productData);
      setStockByWarehouse(stockData.results || stockData || []);
    } catch (err: any) {
      console.error('Failed to load product detail', err);
      setError('Unable to load product details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto py-10 space-y-4">
          <button
            onClick={() => router.push('/products')}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600"
          >
            <ArrowLeft size={18} />
            Back to products
          </button>
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertTriangle size={18} />
            <span>{error || 'Product not found.'}</span>
          </div>
        </div>
      </Layout>
    );
  }

  const stockUnitLabel =
    product.stock_unit_detail?.code || product.stock_unit_detail?.name || '';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => router.push('/products')}
              className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-2 text-gray-600 hover:text-primary-600 hover:border-primary-200 hover:shadow-sm transition-all duration-150 flex-shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 truncate">
                <PackageSearch size={20} className="sm:w-6 sm:h-6 text-primary-600 flex-shrink-0" />
                <span className="truncate">{product.name}</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                SKU {product.sku}
                {product.code ? ` · Code ${product.code}` : ''}
              </p>
            </div>
          </div>
          <Link
            href={`/products/${product.id}/edit`}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto text-center"
          >
            Edit Product
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Key attributes */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-4 sm:p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Product overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Category</p>
                <p className="font-medium text-gray-900">
                  {product.category_name || 'Uncategorized'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <p className="font-medium">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      product.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {product.is_active ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-gray-500">Stock unit</p>
                <p className="font-medium text-gray-900">
                  {product.stock_unit_detail?.name}{' '}
                  {product.stock_unit_detail?.code
                    ? `(${product.stock_unit_detail.code})`
                    : ''}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Reorder policy</p>
                <p className="font-medium text-gray-900">
                  Level {product.reorder_level} {stockUnitLabel} · Qty {product.reorder_quantity}{' '}
                  {stockUnitLabel}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-gray-500">Description</p>
                <p className="font-medium text-gray-900 whitespace-pre-wrap">
                  {product.description || 'No description provided.'}
                </p>
              </div>
            </div>
          </div>

          {/* Stock summary */}
          <div className="bg-white rounded-lg shadow p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Stock summary</h2>
            <p className="text-3xl font-bold text-gray-900">
              {product.total_stock ?? 0}{' '}
              <span className="text-base font-medium text-gray-500">{stockUnitLabel}</span>
            </p>
            <p className="text-sm text-gray-500">
              {product.is_low_stock
                ? 'This product is currently at or below its reorder level.'
                : 'Stock is above the configured reorder level.'}
            </p>
            {product.is_low_stock && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle size={14} />
                <span>
                  Consider creating a receipt or replenishment task to prevent stockouts for this
                  item.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stock by warehouse */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Warehouse size={18} className="text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Stock by warehouse</h2>
          </div>
          {stockByWarehouse.length === 0 ? (
            <p className="text-sm text-gray-500">No stock records found for this product yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-600">
                    <th className="py-2 pr-4">Warehouse</th>
                    <th className="py-2 pr-4">Code</th>
                    <th className="py-2 pr-4 text-right">Quantity</th>
                    <th className="py-2 pr-4 text-right">Reserved</th>
                    <th className="py-2 pr-4 text-right">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {stockByWarehouse.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{row.warehouse_name || row.warehouse}</td>
                      <td className="py-2 pr-4 text-gray-500">{row.warehouse_code || '-'}</td>
                      <td className="py-2 pr-4 text-right">{row.quantity}</td>
                      <td className="py-2 pr-4 text-right">{row.reserved_quantity}</td>
                      <td className="py-2 pr-4 text-right">
                        {row.available_quantity ?? row.quantity - row.reserved_quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}


