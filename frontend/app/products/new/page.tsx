'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { productService, Product, Category, BinLocation, UnitOfMeasure } from '@/lib/products';
import { supplierService } from '@/lib/suppliers';
import { Save, X } from 'lucide-react';
import Link from 'next/link';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bins, setBins] = useState<BinLocation[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
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
    // New fields for initial stock and price
    initial_warehouse: '',
    initial_quantity: '',
    initial_supplier: '',
    initial_price: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [categoriesData, binsData, unitsData, warehousesData, suppliersData] = await Promise.all([
        productService.getCategories(),
        productService.getBinLocations(),
        productService.getUnits(),
        productService.getWarehouses(),
        supplierService.getAll(),
      ]);
      setCategories(categoriesData);
      setBins(binsData);
      setUnits(unitsData);
      setWarehouses(warehousesData);
      setSuppliers(suppliersData);
      if (!formData.stock_unit && unitsData.length) {
        setFormData((prev) => ({ ...prev, stock_unit: unitsData[0].id.toString() }));
      }
    } catch (error) {
      console.error('Failed to load product metadata:', error);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate: If quantity is set, warehouse must be selected
    if (formData.initial_quantity && parseFloat(formData.initial_quantity) > 0 && !formData.initial_warehouse) {
      setError('Please select a warehouse when setting initial quantity');
      setLoading(false);
      return;
    }

    // Validate: If warehouse is selected, quantity should be set
    if (formData.initial_warehouse && (!formData.initial_quantity || parseFloat(formData.initial_quantity) <= 0)) {
      setError('Please enter a quantity greater than 0 when selecting a warehouse');
      setLoading(false);
      return;
    }

    // Validate: If price is set, supplier must be selected
    if (formData.initial_price && parseFloat(formData.initial_price) > 0 && !formData.initial_supplier) {
      setError('Please select a supplier when setting initial price');
      setLoading(false);
      return;
    }

    try {
      const productData = {
        name: formData.name,
        sku: formData.sku,
        code: formData.code || undefined,
        category: formData.category ? parseInt(formData.category) : null,
        stock_unit: parseInt(formData.stock_unit),
        purchase_unit: formData.purchase_unit ? parseInt(formData.purchase_unit) : null,
        unit_conversion_factor: parseFloat(formData.unit_conversion_factor || '1'),
        description: formData.description || undefined,
        reorder_level: parseFloat(formData.reorder_level),
        reorder_quantity: parseFloat(formData.reorder_quantity),
        is_active: formData.is_active,
        default_bin: formData.default_bin ? parseInt(formData.default_bin) : null,
      };
      const newProduct = await productService.createProduct(productData);
      
      // Create initial stock if warehouse and quantity are provided
      if (formData.initial_warehouse && formData.initial_quantity && parseFloat(formData.initial_quantity) > 0) {
        try {
          const { api } = await import('@/lib/api');
          await api.post('/products/stock-items/', {
            product: newProduct.id,
            warehouse: parseInt(formData.initial_warehouse),
            quantity: parseFloat(formData.initial_quantity),
            reserved_quantity: 0,
          });
        } catch (stockError: any) {
          const errorMsg = stockError.response?.data?.error || stockError.response?.data?.message || 'Failed to create initial stock';
          console.error('Failed to create initial stock:', stockError);
          setError(`Product created but failed to set initial stock: ${errorMsg}`);
          setLoading(false);
          return;
        }
      }
      
      // Create initial supplier price if supplier and price are provided
      if (formData.initial_supplier && formData.initial_price && parseFloat(formData.initial_price) > 0) {
        try {
          await supplierService.createProductSupplier({
            product: newProduct.id,
            supplier: parseInt(formData.initial_supplier),
            unit_price: formData.initial_price,
            minimum_order_quantity: '1',
            is_preferred: false,
          });
        } catch (supplierError: any) {
          console.error('Failed to create initial supplier price:', supplierError);
          // Don't fail the whole operation, just log the error
        }
      }
      
      const { showToast } = await import('@/lib/toast');
      showToast.success('Product created successfully');
      router.push('/products');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create product';
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
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Create New Product</h1>
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
                required
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
                placeholder="How many stock units equal one purchase unit"
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
              />
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
              />
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

            <div className="md:col-span-2 border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Initial Stock Quantity</h3>
              <p className="text-sm text-gray-600 mb-4">
                Set the initial stock quantity for this product in a warehouse. This is optional but recommended for new products.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Warehouse <span className="text-red-500">*</span>
                    {formData.initial_quantity && parseFloat(formData.initial_quantity) > 0 && (
                      <span className="text-red-500 ml-1">(Required)</span>
                    )}
                  </label>
                  <select
                    value={formData.initial_warehouse}
                    onChange={(e) => {
                      setFormData({ ...formData, initial_warehouse: e.target.value });
                      // Clear quantity if warehouse is cleared
                      if (!e.target.value) {
                        setFormData(prev => ({ ...prev, initial_warehouse: '', initial_quantity: '' }));
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
                    Select the warehouse where initial stock will be added
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Quantity <span className="text-red-500">*</span>
                    {formData.initial_warehouse && (
                      <span className="text-red-500 ml-1">(Required)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.initial_quantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, initial_quantity: value });
                      // Clear warehouse if quantity is cleared
                      if (!value || parseFloat(value) <= 0) {
                        setFormData(prev => ({ ...prev, initial_quantity: '', initial_warehouse: '' }));
                      }
                    }}
                    placeholder="0.00"
                    disabled={!formData.initial_warehouse}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      !formData.initial_warehouse ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.initial_warehouse 
                      ? 'Enter the initial stock quantity for this warehouse'
                      : 'Select a warehouse first to set initial quantity'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Initial Supplier Pricing (Optional)</h3>
              <p className="text-sm text-gray-600 mb-4">
                Set the initial purchase price from a supplier. This helps track supplier pricing information.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier
                    {formData.initial_price && parseFloat(formData.initial_price) > 0 && (
                      <span className="text-red-500 ml-1">(Required)</span>
                    )}
                  </label>
                  <select
                    value={formData.initial_supplier}
                    onChange={(e) => {
                      setFormData({ ...formData, initial_supplier: e.target.value });
                      // Clear price if supplier is cleared
                      if (!e.target.value) {
                        setFormData(prev => ({ ...prev, initial_supplier: '', initial_price: '' }));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.code})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Select the supplier for this product
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit Price
                    {formData.initial_supplier && (
                      <span className="text-red-500 ml-1">(Required)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.initial_price}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, initial_price: value });
                      // Clear supplier if price is cleared
                      if (!value || parseFloat(value) <= 0) {
                        setFormData(prev => ({ ...prev, initial_price: '', initial_supplier: '' }));
                      }
                    }}
                    placeholder="0.00"
                    disabled={!formData.initial_supplier}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      !formData.initial_supplier ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.initial_supplier 
                      ? 'Enter the purchase price per unit from this supplier'
                      : 'Select a supplier first to set price'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
            >
              <Save size={20} />
              {loading ? 'Creating...' : 'Create Product'}
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
    </>
  );
}

