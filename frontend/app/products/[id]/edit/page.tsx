'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { productService, Product, Category, BinLocation, UnitOfMeasure, Warehouse } from '@/lib/products';
import { Save, X } from 'lucide-react';
import Link from 'next/link';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = parseInt(params.id as string);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bins, setBins] = useState<BinLocation[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    code: '',
    category: '',
    stock_unit: '',
    purchase_unit: '',
    unit_conversion_factor: '1',
    description: '',
    reorder_level: '0',
    reorder_quantity: '0',
    is_active: true,
    default_bin: '',
    // Stock management fields
    stock_warehouse: '',
    stock_quantity: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productData, categoriesData, binsData, unitsData, warehousesData] = await Promise.all([
        productService.getProduct(productId),
        productService.getCategories(),
        productService.getBinLocations(),
        productService.getUnits(),
        productService.getWarehouses(),
      ]);
      
      setCategories(categoriesData);
      setBins(binsData);
      setUnits(unitsData);
      setWarehouses(warehousesData);
      setFormData({
        name: productData.name,
        sku: productData.sku,
        code: productData.code || '',
        category: productData.category?.toString() || '',
        stock_unit: productData.stock_unit?.toString() || '',
        purchase_unit: productData.purchase_unit?.toString() || '',
        unit_conversion_factor: productData.unit_conversion_factor?.toString() || '1',
        description: productData.description || '',
        reorder_level: productData.reorder_level.toString(),
        reorder_quantity: productData.reorder_quantity.toString(),
        is_active: productData.is_active,
        default_bin: productData.default_bin ? productData.default_bin.toString() : '',
      });
    } catch (error) {
      setError('Failed to load product');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const productData = {
        ...formData,
        category: formData.category ? parseInt(formData.category) : null,
        stock_unit: parseInt(formData.stock_unit),
        purchase_unit: formData.purchase_unit ? parseInt(formData.purchase_unit) : null,
        unit_conversion_factor: parseFloat(formData.unit_conversion_factor || '1'),
        reorder_level: parseFloat(formData.reorder_level),
        reorder_quantity: parseFloat(formData.reorder_quantity),
        default_bin: formData.default_bin ? parseInt(formData.default_bin) : null,
      };
      await productService.updateProduct(productId, productData);
      
      // Update stock if warehouse and quantity are provided
      if (formData.stock_warehouse && formData.stock_quantity !== '' && parseFloat(formData.stock_quantity) >= 0) {
        try {
          const { api } = await import('@/lib/api');
          const warehouseId = parseInt(formData.stock_warehouse);
          const quantity = parseFloat(formData.stock_quantity);
          
          // Get all stock items for this product to find existing one
          const allStockData = await productService.getStockByWarehouse(productId);
          const stockItems = Array.isArray(allStockData) ? allStockData : (allStockData.results || []);
          const existingStock = stockItems.find((si: any) => 
            si.warehouse === warehouseId || si.warehouse_id === warehouseId
          );
          
          if (existingStock && existingStock.id) {
            // Update existing stock
            await api.patch(`/products/stock-items/${existingStock.id}/`, {
              quantity: quantity,
            });
          } else {
            // Create new stock item
            await api.post('/products/stock-items/', {
              product: productId,
              warehouse: warehouseId,
              quantity: quantity,
              reserved_quantity: 0,
            });
          }
        } catch (stockError: any) {
          const errorMsg = stockError.response?.data?.error || stockError.response?.data?.message || 'Failed to update stock';
          console.error('Failed to update stock:', stockError);
          const { showToast } = await import('@/lib/toast');
          showToast.error(`Product updated but failed to update stock: ${errorMsg}`);
          router.push('/products');
          return;
        }
      }
      
      const { showToast } = await import('@/lib/toast');
      showToast.success('Product updated successfully');
      router.push('/products');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to update product';
      if (err.response?.data) {
        // Handle field-specific errors - properly serialize objects and arrays
        const formatErrorValue = (value: any): string => {
          if (value === null || value === undefined) return '';
          if (typeof value === 'string') return value;
          if (typeof value === 'number' || typeof value === 'boolean') return String(value);
          if (Array.isArray(value)) {
            // Handle array of strings or array of objects
            return value.map((v, idx) => {
              if (typeof v === 'string') return v;
              if (typeof v === 'object' && v !== null) {
                const objStr = Object.entries(v)
                  .map(([k, val]) => {
                    if (Array.isArray(val)) return `${k}: ${val.join(', ')}`;
                    return `${k}: ${String(val)}`;
                  })
                  .join('; ');
                return `Item ${idx + 1}: ${objStr}`;
              }
              return String(v);
            }).join(' | ');
          }
          if (typeof value === 'object' && value !== null) {
            return Object.entries(value)
              .map(([k, v]) => {
                if (Array.isArray(v)) return `${k}: ${v.join(', ')}`;
                return `${k}: ${formatErrorValue(v)}`;
              })
              .join('; ');
          }
          return String(value);
        };
        
        const fieldErrors = Object.entries(err.response.data)
          .filter(([key]) => key !== 'error' && key !== 'message')
          .map(([key, value]) => {
            const formatted = formatErrorValue(value);
            return formatted ? `${key}: ${formatted}` : key;
          })
          .filter(msg => msg.length > 0)
          .join('; ');
        setError(fieldErrors || errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
          <Link
            href="/products"
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
          >
            <X size={20} />
            Cancel
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU / Code *
              </label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Unit *
              </label>
              <select
                value={formData.stock_unit}
                onChange={(e) => setFormData({ ...formData, stock_unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select Unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purchase Unit
              </label>
              <select
                value={formData.purchase_unit}
                onChange={(e) => setFormData({ ...formData, purchase_unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Same as stock unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conversion Factor
              </label>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={formData.unit_conversion_factor}
                onChange={(e) => setFormData({ ...formData, unit_conversion_factor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reorder Level
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-500">
                Minimum stock level before reordering (triggers low stock alerts)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reorder Quantity
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.reorder_quantity}
                onChange={(e) => setFormData({ ...formData, reorder_quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-500">
                Recommended quantity to order when stock reaches reorder level
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Bin (optional)</label>
              <select
                value={formData.default_bin}
                onChange={(e) => setFormData({ ...formData, default_bin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">No default bin</option>
                {bins.map((bin) => (
                  <option key={bin.id} value={bin.id}>
                    {bin.warehouse_code || bin.warehouse} - {bin.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 cursor-pointer"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Product is Active</span>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.is_active 
                      ? 'This product is currently active and can be used in operations'
                      : 'This product is inactive and will not appear in most operations'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Update Stock Quantity</h3>
              <p className="text-sm text-gray-600 mb-4">
                Update the stock quantity for this product in a warehouse. This will create or update the stock record.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Warehouse <span className="text-red-500">*</span>
                    {formData.stock_quantity && parseFloat(formData.stock_quantity) > 0 && (
                      <span className="text-red-500 ml-1">(Required)</span>
                    )}
                  </label>
                  <select
                    value={formData.stock_warehouse}
                    onChange={(e) => {
                      setFormData({ ...formData, stock_warehouse: e.target.value });
                      // Clear quantity if warehouse is cleared
                      if (!e.target.value) {
                        setFormData(prev => ({ ...prev, stock_warehouse: '', stock_quantity: '' }));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.code})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Select the warehouse where stock will be updated
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Quantity <span className="text-red-500">*</span>
                    {formData.stock_warehouse && (
                      <span className="text-red-500 ml-1">(Required)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.stock_quantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, stock_quantity: value });
                      // Clear warehouse if quantity is cleared
                      if (!value || parseFloat(value) <= 0) {
                        setFormData(prev => ({ ...prev, stock_quantity: '', stock_warehouse: '' }));
                      }
                    }}
                    placeholder="0.00"
                    disabled={!formData.stock_warehouse}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      !formData.stock_warehouse ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.stock_warehouse 
                      ? 'Enter the stock quantity for this warehouse (will create or update stock record)'
                      : 'Select a warehouse first to set stock quantity'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
            >
              <Save size={20} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href="/products"
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}

