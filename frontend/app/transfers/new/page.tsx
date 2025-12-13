'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { operationsService, InternalTransfer, TransferItem } from '@/lib/operations';
import { productService, Warehouse, Product, BinLocation } from '@/lib/products';
import { Save, X, Plus, Trash2, Scan } from 'lucide-react';
import Link from 'next/link';
import BarcodeScanner from '@/components/BarcodeScanner';
import { showToast } from '@/lib/toast';

export default function NewTransferPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bins, setBins] = useState<BinLocation[]>([]);
  const [items, setItems] = useState<TransferItem[]>([]);
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [scannerItemIndex, setScannerItemIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    warehouse: '',
    to_warehouse: '',
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

  const loadBinsForDestination = async (warehouseId: string) => {
    if (!warehouseId) {
      setBins([]);
      return;
    }
    try {
      const data = await productService.getBinLocations({ warehouse: parseInt(warehouseId) });
      setBins(data);
    } catch (error) {
      console.error('Failed to load bin locations:', error);
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
        product: 0,
        bin: null,
        quantity: 0,
        unit_of_measure: 'stock',
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof TransferItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
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
    if (!formData.warehouse || !formData.to_warehouse) {
      setError('Please select both source and destination warehouses');
      return;
    }
    if (formData.warehouse === formData.to_warehouse) {
      setError('Source and destination warehouses cannot be the same');
      return;
    }
    
    // Validate items
    const invalidItems = items.filter(item => !item.product || item.product === 0 || !item.quantity || item.quantity <= 0);
    if (invalidItems.length > 0) {
      setError('Please ensure all items have a valid product selected and quantity greater than 0');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const transferData = {
        ...formData,
        warehouse: parseInt(formData.warehouse),
        to_warehouse: parseInt(formData.to_warehouse),
        items: items
          .filter(item => item.product && item.product > 0 && item.quantity > 0)
          .map(item => ({
            product: item.product,
            bin: item.bin ?? undefined,
            quantity: item.quantity,
            unit_of_measure: item.unit_of_measure || 'stock',
          })),
      };
      await operationsService.createTransfer(transferData);
      showToast.success('Transfer created successfully');
      router.push('/transfers');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create transfer';
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
          <h1 className="text-3xl font-bold text-gray-900">Create New Transfer</h1>
          <Link
            href="/transfers"
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
                From Warehouse *
              </label>
              <select
                required
                value={formData.warehouse}
                onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select Source Warehouse</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Warehouse *
              </label>
              <select
                required
                value={formData.to_warehouse}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, to_warehouse: value });
                  setItems((prev) => prev.map((it) => ({ ...it, bin: null })));
                  loadBinsForDestination(value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select Destination Warehouse</option>
                {warehouses
                  .filter((wh) => wh.id.toString() !== formData.warehouse)
                  .map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Select the warehouse where stock will be transferred to (different from source)
              </p>
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
                {formData.status === 'draft' && 'Draft transfers can be edited freely'}
                {formData.status === 'waiting' && 'Waiting transfers require approval before processing'}
                {formData.status === 'ready' && 'Ready transfers can be validated immediately'}
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
              <p className="text-gray-500 text-center py-8">No items added. Click "Add Item" to start.</p>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unit
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
                          Purchase units convert automatically using the product’s conversion factor.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Destination Bin
                        </label>
                        <select
                          value={item.bin ?? ''}
                          onChange={(e) =>
                            updateItem(
                              index,
                              'bin',
                              e.target.value ? parseInt(e.target.value) : null,
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="">No Bin</option>
                          {bins.map((bin) => (
                            <option key={bin.id} value={bin.id}>
                              {bin.code} {bin.description ? `- ${bin.description}` : ''}
                            </option>
                          ))}
                        </select>
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
              {loading ? 'Creating...' : 'Create Transfer'}
            </button>
            <Link
              href="/transfers"
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
    </Layout>
  );
}

