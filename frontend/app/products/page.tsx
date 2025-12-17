'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { productService, Product, Category } from '@/lib/products';
import { Plus, Search, Edit, Eye, Filter } from 'lucide-react';
import Link from 'next/link';
import { useDebounce } from '@/lib/hooks/useDebounce';
import SavedViewToolbar from '@/components/SavedViewToolbar';

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const debouncedSearch = useDebounce(search, 500);

  // Read filter from URL on mount
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter) {
      setStockFilter(filter);
    }
  }, [searchParams]);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [debouncedSearch, categoryFilter, stockFilter]);

  const loadCategories = async () => {
    try {
      const data = await productService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      
      // Handle stock filters (low_stock, out_of_stock)
      if (stockFilter === 'low_stock') {
        const data = await productService.getLowStockProducts();
        let filtered = Array.isArray(data) ? data : (data.results || []);
        
        // Apply search and category filters if set
        if (debouncedSearch) {
          filtered = filtered.filter((p: Product) =>
            p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            p.sku.toLowerCase().includes(debouncedSearch.toLowerCase())
          );
        }
        if (categoryFilter) {
          filtered = filtered.filter((p: Product) =>
            p.category && Number(p.category) === parseInt(categoryFilter)
          );
        }
        setProducts(filtered);
      } else if (stockFilter === 'out_of_stock') {
        // Get all products and filter for out of stock
        const params: any = {};
        if (debouncedSearch) params.search = debouncedSearch;
        if (categoryFilter) params.category = parseInt(categoryFilter);
        const data = await productService.getProducts(params);
        const allProducts = data.results || data;
        const outOfStock = allProducts.filter((p: Product) => (p.total_stock || 0) === 0);
        setProducts(outOfStock);
      } else {
        // Normal product listing
        const params: any = {};
        if (debouncedSearch) params.search = debouncedSearch;
        if (categoryFilter) params.category = parseInt(categoryFilter);
        const data = await productService.getProducts(params);
        setProducts(data.results || data);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySavedFilters = (filters: Record<string, any>) => {
    setSearch(filters.search ?? '');
    setCategoryFilter(filters.category ? String(filters.category) : '');
  };

  // Show filter badge if filter is active
  const getFilterBadge = () => {
    if (stockFilter === 'low_stock') {
      return <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">Low Stock</span>;
    }
    if (stockFilter === 'out_of_stock') {
      return <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">Out of Stock</span>;
    }
    return null;
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center flex-wrap gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Products</h1>
            {getFilterBadge()}
          </div>
          <Link
            href="/products/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0 text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Plus size={18} className="sm:w-5 sm:h-5" />
            <span>Add Product</span>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 text-sm sm:text-base"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-500 hidden sm:block" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all duration-200 hover:border-gray-400 cursor-pointer text-sm sm:text-base"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                value=""
                onChange={() => {}}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all duration-200 hover:border-gray-400 cursor-pointer text-sm sm:text-base"
                disabled
                title="Warehouse filter coming soon"
              >
                <option value="">All Warehouses</option>
              </select>
            </div>
          </div>

          <SavedViewToolbar
            pageKey="products"
            currentFilters={{ search, category: categoryFilter || null }}
            onApply={handleApplySavedFilters}
            helperText="Store frequently used product search + category filters."
            className="mb-8"
          />

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {products.length === 0 ? (
                  <div className="text-center p-8 text-gray-500">No products found</div>
                ) : (
                  products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-sm">{product.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            product.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500">Category</p>
                          <p className="text-sm text-gray-700">{product.category_name || '-'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Stock</p>
                          <p className={`text-sm font-medium ${product.is_low_stock ? 'text-yellow-600' : 'text-gray-700'}`}>
                            {product.total_stock || 0} {product.stock_unit_detail?.code || product.stock_unit_detail?.name || ''}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Name</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">SKU</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Category</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Stock</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Status</th>
                      <th className="text-right p-3 text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-gray-500">
                          No products found
                        </td>
                      </tr>
                    ) : (
                      products.map((product) => (
                        <tr key={product.id} className="border-b hover:bg-gray-50 hover:shadow-sm transition-all duration-200 cursor-pointer">
                          <td className="p-3">{product.name}</td>
                          <td className="p-3 text-gray-600">{product.sku}</td>
                          <td className="p-3 text-gray-600">{product.category_name || '-'}</td>
                          <td className="p-3">
                            <span className={product.is_low_stock ? 'text-yellow-600 font-medium' : ''}>
                              {product.total_stock || 0}{' '}
                              {product.stock_unit_detail?.code || product.stock_unit_detail?.name || ''}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 text-xs rounded ${
                                product.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {product.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={async () => {
                                  try {
                                    await productService.updateProduct(product.id, {
                                      is_active: !product.is_active,
                                    });
                                    loadProducts();
                                    const { showToast } = await import('@/lib/toast');
                                    showToast.success(`Product ${product.is_active ? 'deactivated' : 'activated'} successfully`);
                                  } catch (error) {
                                    console.error('Failed to update product status:', error);
                                    const { showToast } = await import('@/lib/toast');
                                    showToast.error('Failed to update product status');
                                  }
                                }}
                                className={`p-2 rounded-lg transition-all duration-200 ${
                                  product.is_active
                                    ? 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-500/15'
                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500/15'
                                }`}
                                title={product.is_active ? 'Deactivate product' : 'Activate product'}
                              >
                                {product.is_active ? (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                              <Link
                                href={`/products/${product.id}`}
                                className="p-2 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all duration-200 dark:text-gray-300 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/15"
                              >
                                <Eye size={18} />
                              </Link>
                              <Link
                                href={`/products/${product.id}/edit`}
                                className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 dark:text-gray-300 dark:hover:text-primary-200 dark:hover:bg-primary-500/15"
                              >
                                <Edit size={18} />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
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

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </>
    }>
      <ProductsPageContent />
    </Suspense>
  );
}
