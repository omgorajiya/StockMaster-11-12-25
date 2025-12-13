'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { operationsService, ReturnItem } from '@/lib/operations';
import { productService, Warehouse, Product } from '@/lib/products';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function NewReturnPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [formData, setFormData] = useState({
    warehouse: '',
    reason: '',
    disposition: 'restock' as 'restock' | 'scrap' | 'repair',
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

  const addItem = () => {
    setItems([
      ...items,
      {
        return_order: 0,
        product: 0,
        quantity: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ReturnItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError('Please add at least one item');
      return;
    }
    if (items.some((i) => !i.product || i.product === 0)) {
      setError('Please select a product for each item');
      return;
    }
    if (items.some((i) => !i.quantity || i.quantity <= 0)) {
      setError('Quantity must be greater than 0 for each item');
      return;
    }
    if (!formData.warehouse) {
      setError('Please select a warehouse');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const payload = {
        warehouse: parseInt(formData.warehouse),
        reason: formData.reason || undefined,
        disposition: formData.disposition,
        notes: formData.notes || undefined,
        status: formData.status,
        items: items
          .filter(item => item.product && item.product > 0 && item.quantity > 0)
          .map((item) => ({
            product: item.product,
            quantity: item.quantity,
            reason_code: item.reason_code || undefined,
          })),
      };
      await operationsService.createReturn(payload as any);
      const { showToast } = await import('@/lib/toast');
      showToast.success('Return created successfully');
      router.push('/returns');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create return';
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
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create New Return</h1>
          <Link
            href="/returns"
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <X size={20} />
            Cancel
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Warehouse *</label>
              <select
                required
                value={formData.warehouse}
                onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-transparent dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Disposition</label>
              <select
                value={formData.disposition}
                onChange={(e) =>
                  setFormData({ ...formData, disposition: e.target.value as 'restock' | 'scrap' | 'repair' })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-transparent dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="restock">Restock - Return to inventory</option>
                <option value="scrap">Scrap - Dispose of item</option>
                <option value="repair">Repair - Send for repair</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formData.disposition === 'restock' && 'Items will be returned to available stock'}
                {formData.disposition === 'scrap' && 'Items will be marked as scrapped and removed from inventory'}
                {formData.disposition === 'repair' && 'Items will be sent for repair before restocking'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-transparent dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="draft">Draft - Still being prepared</option>
                <option value="waiting">Waiting - Pending approval</option>
                <option value="ready">Ready - Ready to process</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formData.status === 'draft' && 'Draft returns can be edited freely'}
                {formData.status === 'waiting' && 'Waiting returns require approval before processing'}
                {formData.status === 'ready' && 'Ready returns can be validated immediately'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Reason</label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-transparent dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-transparent dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Items</h2>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200"
              >
                <Plus size={20} />
                Add Item
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No items added. Click "Add Item" to start.</p>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Product *</label>
                        <select
                          required
                          value={item.product}
                          onChange={(e) => updateItem(index, 'product', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-transparent dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                          <option value="0">Select Product</option>
                          {products.map((prod) => (
                            <option key={prod.id} value={prod.id}>
                              {prod.name} ({prod.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Quantity *</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-transparent dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Reason Code</label>
                        <input
                          type="text"
                          value={item.reason_code || ''}
                          onChange={(e) => updateItem(index, 'reason_code', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-transparent dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
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
              {loading ? 'Creating...' : 'Create Return'}
            </button>
            <Link
              href="/returns"
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