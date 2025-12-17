'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { operationsService, AdjustmentItem } from '@/lib/operations';
import { productService, Warehouse, Product } from '@/lib/products';
import { Save, X, Plus, Trash2, Scan } from 'lucide-react';
import Link from 'next/link';
import BarcodeScanner from '@/components/BarcodeScanner';
import { showToast } from '@/lib/toast';

type DraftAdjustmentItem = AdjustmentItem & {
  // Keep string versions for inputs so users can type naturally (including clearing the field)
  current_quantity_input: string;
  adjustment_quantity_input: string;
};

const toNumberOrZero = (raw: string): number => {
  // Allow empty string while typing; treat as 0 for calculations.
  if (raw.trim() === '') return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

export default function NewAdjustmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<DraftAdjustmentItem[]>([]);
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [scannerItemIndex, setScannerItemIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    warehouse: '',
    reason: '',
    adjustment_type: 'set' as 'increase' | 'decrease' | 'set',
    notes: '',
    status: 'draft' as 'draft' | 'waiting' | 'ready',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadWarehouses();
    loadProducts();
  }, []);

  const loadWarehouses = async () => {
    try {
      const data = await productService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await productService.getProducts();
      setProducts(data.results || data);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const loadStockForProduct = async (productId: number, warehouseId: number) => {
    try {
      const stockData = await productService.getStockByWarehouse(productId, warehouseId);
      return stockData;
    } catch (error) {
      return { stock: 0 };
    }
  };

  const addItem = async () => {
    setItems([
      ...items,
      {
        product: 0,
        current_quantity: 0,
        adjustment_quantity: 0,
        current_quantity_input: '0',
        adjustment_quantity_input: formData.adjustment_type === 'set' ? '0' : '',
        reason: '',
        unit_of_measure: 'stock',
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = async (index: number, field: keyof DraftAdjustmentItem, value: any) => {
    const newItems = [...items];

    const next: DraftAdjustmentItem = {
      ...newItems[index],
      [field]: value,
    } as DraftAdjustmentItem;

    // Keep numeric values in sync with input strings.
    if (field === 'current_quantity_input') {
      next.current_quantity = toNumberOrZero(String(value));
    }

    if (field === 'adjustment_quantity_input') {
      next.adjustment_quantity = toNumberOrZero(String(value));
    }

    // If product changed, load current stock (still allow manual overrides afterward).
    if (field === 'product' && formData.warehouse && value) {
      const stock = await loadStockForProduct(value, parseInt(formData.warehouse));
      const current = Number(stock.stock || 0);
      next.current_quantity = current;
      next.current_quantity_input = String(current);

      if (formData.adjustment_type === 'set') {
        next.adjustment_quantity = current;
        next.adjustment_quantity_input = String(current);
      }
    }

    newItems[index] = next;
    setItems(newItems);
  };


  const handleScanResult = async (barcode: string) => {
    if (scannerItemIndex === null) return;
    try {
      const product = await productService.lookupProduct({ barcode });
      updateItem(scannerItemIndex, 'product', product.id);
      showToast.success(`Selected ${product.name}`);
    } catch {
      showToast.error('Product not found for scanned barcode');
    } finally {
      setScannerItemIndex(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError('Please add at least one item');
      return;
    }
    if (!formData.warehouse) {
      setError('Please select a warehouse');
      return;
    }
    if (!formData.reason) {
      setError('Please enter a reason for the adjustment');
      return;
    }
    
    // Validate items
    const invalidItems = items.filter(item => !item.product || item.product === 0 || item.adjustment_quantity === undefined || item.adjustment_quantity < 0);
    if (invalidItems.length > 0) {
      setError('Please ensure all items have a valid product selected and adjustment quantity is set');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const adjustmentData = {
        ...formData,
        warehouse: parseInt(formData.warehouse),
        items: items
          .filter(item => item.product && item.product > 0)
          .map(item => {
            const productMeta = products.find((p) => p.id === item.product);
            const factor = productMeta?.unit_conversion_factor || 1;
            const adjustmentQuantity =
              item.unit_of_measure === 'purchase'
                ? Number(item.adjustment_quantity) * Number(factor)
                : item.adjustment_quantity;

            return {
              product: item.product,
              current_quantity: item.current_quantity || 0,
              adjustment_quantity: adjustmentQuantity,
              reason: item.reason || '',
            };
          }),
      };
      await operationsService.createAdjustment(adjustmentData);
      showToast.success('Adjustment created successfully');
      router.push('/adjustments');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create adjustment';
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
          <h1 className="text-3xl font-bold text-gray-900">Create New Adjustment</h1>
          <Link
            href="/adjustments"
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

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warehouse *
              </label>
              <select
                required
                value={formData.warehouse}
                onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select Warehouse</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adjustment Type *
              </label>
              <select
                required
                value={formData.adjustment_type}
                onChange={(e) => setFormData({ ...formData, adjustment_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="increase">Increase - Add to current stock</option>
                <option value="decrease">Decrease - Remove from current stock</option>
                <option value="set">Set - Set to specific quantity</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {formData.adjustment_type === 'increase' && 'Add quantity to current stock level'}
                {formData.adjustment_type === 'decrease' && 'Subtract quantity from current stock level'}
                {formData.adjustment_type === 'set' && 'Set stock to a specific quantity (replaces current stock)'}
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason *
              </label>
              <input
                type="text"
                required
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="e.g., Physical count, Damage, Found stock..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="draft">Draft - Still being prepared</option>
                <option value="waiting">Waiting - Pending approval</option>
                <option value="ready">Ready - Ready to process</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {formData.status === 'draft' && 'Draft adjustments can be edited freely'}
                {formData.status === 'waiting' && 'Waiting adjustments require approval before processing'}
                {formData.status === 'ready' && 'Ready adjustments can be validated immediately'}
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Items</h2>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={scannerEnabled}
                    onChange={(e) => setScannerEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Enable barcode scanning
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200"
                >
                  <Plus size={20} />
                  Add Item
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No items added. Click “Add Item” to start.</p>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product *
                        </label>
                        <select
                          required
                          value={item.product}
                          onChange={(e) => updateItem(index, 'product', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="0">Select Product</option>
                          {products.map((prod) => (
                            <option key={prod.id} value={prod.id}>
                              {prod.name} ({prod.sku})
                            </option>
                          ))}
                        </select>
                          {scannerEnabled && (
                            <button
                              type="button"
                              onClick={() => setScannerItemIndex(index)}
                              className="mt-2 inline-flex items-center gap-2 rounded-lg border border-primary-200 px-3 py-1 text-sm text-primary-600 hover:bg-primary-50"
                            >
                              <Scan size={14} />
                              Scan barcode
                            </button>
                          )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Stock
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={item.current_quantity_input}
                          onChange={(e) => updateItem(index, 'current_quantity_input', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {formData.adjustment_type === 'set'
                            ? 'New Quantity *'
                            : formData.adjustment_type === 'increase'
                              ? 'Increase By *'
                              : 'Decrease By *'}
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          required
                          value={item.adjustment_quantity_input}
                          onChange={(e) => updateItem(index, 'adjustment_quantity_input', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity Unit
                        </label>
                        <select
                          value={item.unit_of_measure || 'stock'}
                          onChange={(e) => updateItem(index, 'unit_of_measure', e.target.value as 'stock' | 'purchase')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="stock">Stock unit</option>
                          <option value="purchase">Purchase unit</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          Purchase units automatically convert using each product’s conversion factor.
                        </p>
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Item Reason (Optional)
                      </label>
                      <input
                        type="text"
                        value={item.reason || ''}
                        onChange={(e) => updateItem(index, 'reason', e.target.value)}
                        placeholder="Reason for this item..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
            >
              <Save size={20} />
              {loading ? 'Creating...' : 'Create Adjustment'}
            </button>
            <Link
              href="/adjustments"
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
      {scannerEnabled && scannerItemIndex !== null && (
        <BarcodeScanner onScan={handleScanResult} onClose={() => setScannerItemIndex(null)} />
      )}
    </>
  );
}

