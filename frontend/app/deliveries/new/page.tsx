'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { operationsService, DeliveryItem } from '@/lib/operations';
import { productService, Warehouse, Product, BinLocation, Category } from '@/lib/products';
import { Save, X, Plus, Trash2, Scan } from 'lucide-react';
import Link from 'next/link';
import BarcodeScanner from '@/components/BarcodeScanner';
import { showToast } from '@/lib/toast';

export default function NewDeliveryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bins, setBins] = useState<BinLocation[]>([]);
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [scannerItemIndex, setScannerItemIndex] = useState<number | null>(null);
  // Store warehouse-specific stock for each product: { productId: { warehouseId: { quantity, reserved, available } } }
  const [productStockCache, setProductStockCache] = useState<Record<number, Record<number, { quantity: number; reserved: number; available: number }>>>({});
  const [formData, setFormData] = useState({
    warehouse: '',
    category: '',
    customer: '',
    shipping_address: '',
    notes: '',
    status: 'draft' as const,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadWarehouses();
    loadCategories();
    loadProducts();
  }, []);

  // Load stock for products in selected category and warehouse
  useEffect(() => {
    const loadStockForFilteredProducts = async () => {
      if (!formData.warehouse || !formData.category || products.length === 0) {
        return;
      }
      
      const warehouseId = parseInt(formData.warehouse);
      const categoryId = parseInt(formData.category);
      
      // Filter products by category
      const categoryProducts = products.filter(
        (p) => p.category && Number(p.category) === categoryId
      );
      
      // Load stock for all products in this category and warehouse
      if (categoryProducts.length > 0) {
        await Promise.all(
          categoryProducts.map((product) => loadProductStock(product.id, warehouseId))
        );
      }
    };
    
    loadStockForFilteredProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.warehouse, formData.category, products.length]);

  const loadWarehouses = async () => {
    try {
      const data = await productService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await productService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadBinsForWarehouse = async (warehouseId: string) => {
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

  // Fetch warehouse-specific stock for a product
  const loadProductStock = async (productId: number, warehouseId: number) => {
    if (!productId || !warehouseId) return;
    
    try {
      const stockData = await productService.getStockByWarehouse(productId, warehouseId);
      // Handle different response formats
      let stockItem: any = null;
      if (Array.isArray(stockData)) {
        stockItem = stockData.find((si: any) => si.warehouse === warehouseId || si.warehouse_id === warehouseId);
      } else if (stockData?.results && Array.isArray(stockData.results)) {
        stockItem = stockData.results.find((si: any) => si.warehouse === warehouseId || si.warehouse_id === warehouseId);
      } else if (stockData && typeof stockData === 'object' && !Array.isArray(stockData)) {
        // Single stock item object (when warehouse_id is provided)
        stockItem = stockData;
      }
      
      if (stockItem) {
        // Handle both old format (stock as number) and new format (StockItem object)
        let quantity = 0;
        let reserved = 0;
        let available = 0;
        
        if (stockItem.stock !== undefined) {
          // Old format: { product, warehouse, stock }
          quantity = parseFloat(stockItem.stock?.toString() || '0') || 0;
          reserved = 0;
          available = quantity;
        } else {
          // New format: StockItem object with quantity, reserved_quantity, available_quantity
          quantity = parseFloat(stockItem.quantity?.toString() || '0') || 0;
          reserved = parseFloat(stockItem.reserved_quantity?.toString() || '0') || 0;
          available = parseFloat(stockItem.available_quantity?.toString() || (quantity - reserved).toString()) || 0;
        }
        
        setProductStockCache(prev => ({
          ...prev,
          [productId]: {
            ...(prev[productId] || {}),
            [warehouseId]: {
              quantity: Math.round(quantity * 100) / 100,
              reserved: Math.round(reserved * 100) / 100,
              available: Math.round(available * 100) / 100,
            }
          }
        }));
      } else {
        // No stock record exists, set to 0
        setProductStockCache(prev => ({
          ...prev,
          [productId]: {
            ...(prev[productId] || {}),
            [warehouseId]: {
              quantity: 0,
              reserved: 0,
              available: 0,
            }
          }
        }));
      }
    } catch (error) {
      console.error(`Failed to load stock for product ${productId} in warehouse ${warehouseId}:`, error);
      // Set to 0 on error
      setProductStockCache(prev => ({
        ...prev,
        [productId]: {
          ...(prev[productId] || {}),
          [warehouseId]: {
            quantity: 0,
            reserved: 0,
            available: 0,
          }
        }
      }));
    }
  };

  // Get warehouse-specific stock for a product
  const getProductStock = (productId: number, warehouseId: number): { quantity: number; reserved: number; available: number } | null => {
    if (!productId || !warehouseId) return null;
    return productStockCache[productId]?.[warehouseId] || null;
  };

  // Get filtered products based on selected warehouse and category
  const getFilteredProducts = (): Product[] => {
    if (!formData.warehouse || !formData.category) {
      return [];
    }
    
    const warehouseId = parseInt(formData.warehouse);
    const categoryId = parseInt(formData.category);
    
    return products.filter((product) => {
      // Must match selected category
      if (!product.category || Number(product.category) !== categoryId) {
        return false;
      }
      
      // Must have stock in selected warehouse
      // Check cache first (most reliable)
      const cachedStock = getProductStock(product.id, warehouseId);
      if (cachedStock && cachedStock.quantity > 0) {
        return true;
      }
      
      // Fallback: Check if product has stock_items with the selected warehouse
      const hasStockInWarehouse = (product.stock_items || []).some(
        (si) => si.warehouse && Number(si.warehouse) === warehouseId && (si.quantity || 0) > 0
      );
      
      return hasStockInWarehouse;
    });
  };

  // Validate delivery quantity - returns validation result without modifying the value
  const validateDeliveryQuantity = (
    productId: number, 
    rawValue: number, 
    warehouseId: number,
    unitOfMeasure: 'stock' | 'purchase' = 'stock'
  ): { isValid: boolean; maxAllowed: number; message?: string } => {
    const product = products.find((p) => p.id === productId);
    if (!product || !warehouseId) {
      return { isValid: true, maxAllowed: rawValue };
    }
    
    // Get warehouse-specific stock
    const stock = getProductStock(productId, warehouseId);
    if (!stock) {
      // Stock not loaded yet, assume valid for now
      return { isValid: true, maxAllowed: rawValue };
    }
    
    // Handle unit conversion if needed
    let requestedStockQty = rawValue;
    if (unitOfMeasure === 'purchase') {
      const conversionFactor = parseFloat(product.unit_conversion_factor?.toString() || '1') || 1;
      requestedStockQty = rawValue * conversionFactor;
    }
    
    // Round values to 2 decimal places for calculations
    const availableStock = Math.round(stock.available * 100) / 100;
    const roundedRequested = Math.round(requestedStockQty * 100) / 100;
    
    // Allow delivery of all available stock (reorder_level is just a warning, not a blocker)
    const maxIssue = Math.max(0, availableStock);
    const roundedMaxIssue = Math.round(maxIssue * 100) / 100;
    
    // Convert back to input unit if needed
    let maxInInputUnit = roundedMaxIssue;
    if (unitOfMeasure === 'purchase') {
      const conversionFactor = parseFloat(product.unit_conversion_factor?.toString() || '1') || 1;
      maxInInputUnit = roundedMaxIssue / conversionFactor;
    }
    maxInInputUnit = Math.round(maxInInputUnit * 100) / 100;
    
    if (roundedMaxIssue === 0) {
      return {
        isValid: false,
        maxAllowed: 0,
        message: `There is no free stock available for ${product.name} in the selected warehouse.`
      };
    }
    
    if (roundedRequested > roundedMaxIssue) {
      const unitLabel = unitOfMeasure === 'purchase' ? 'purchase units' : 'stock units';
      return {
        isValid: false,
        maxAllowed: maxInInputUnit,
        message: `For ${product.name}, you can ship at most ${maxInInputUnit.toFixed(2)} ${unitLabel} (${roundedMaxIssue.toFixed(2)} stock units) with the current stock.`
      };
    }
    
    return { isValid: true, maxAllowed: rawValue };
  };

  const addItem = () => {
    // Validate warehouse and category are selected before adding item
    if (!formData.warehouse) {
      setError('Please select a warehouse before adding items');
      return;
    }
    if (!formData.category) {
      setError('Please select a category before adding items');
      return;
    }
    
    setError('');
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

  const updateItem = async (index: number, field: keyof DeliveryItem, value: any) => {
    const newItems = [...items];
    // Round quantity values to 2 decimal places to avoid floating-point precision issues
    if (field === 'quantity' && typeof value === 'number') {
      value = Math.round(value * 100) / 100;
    }
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    
    // Load stock when product is selected
    if (field === 'product' && value && formData.warehouse) {
      const warehouseId = parseInt(formData.warehouse);
      await loadProductStock(value, warehouseId);
    }
  };

  const handleScanResult = async (barcode: string) => {
    if (scannerItemIndex === null) return;
    
    // Validate warehouse and category are selected
    if (!formData.warehouse || !formData.category) {
      showToast.error('Please select warehouse and category before scanning');
      setScannerItemIndex(null);
      return;
    }
    
    try {
      const product = await productService.lookupProduct({ barcode });
      
      // Verify product matches selected category
      if (!product.category || Number(product.category) !== parseInt(formData.category)) {
        showToast.error(`Product ${product.name} does not belong to the selected category`);
        setScannerItemIndex(null);
        return;
      }
      
      // Verify product has stock in selected warehouse
      const warehouseId = parseInt(formData.warehouse);
      await loadProductStock(product.id, warehouseId);
      const stock = getProductStock(product.id, warehouseId);
      
      if (!stock || stock.quantity <= 0) {
        showToast.error(`Product ${product.name} has no stock in the selected warehouse`);
        setScannerItemIndex(null);
        return;
      }
      
      updateItem(scannerItemIndex, 'product', product.id);
      showToast.success(`Selected ${product.name}`);
    } catch (error) {
      showToast.error('Product not found');
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
    if (!formData.category) {
      setError('Please select a category');
      return;
    }
    if (!formData.customer) {
      setError('Please enter customer name');
      return;
    }
    
    // Validate items
    const invalidItems = items.filter(item => {
      if (!item.product || item.product === 0) return true;
      const qty = Math.round((item.quantity || 0) * 100) / 100;
      if (!qty || qty <= 0) return true;
      return false;
    });
    if (invalidItems.length > 0) {
      setError('Please ensure all items have a valid product selected and quantity greater than 0');
      return;
    }
    
    // Load stock for all items if not already loaded, then validate
    const warehouseId = parseInt(formData.warehouse);
    try {
      await Promise.all(
        items
          .filter(item => item.product > 0)
          .map(item => loadProductStock(item.product, warehouseId))
      );
    } catch (error) {
      console.error('Failed to load stock information:', error);
      setError('Failed to load stock information. Please try again.');
      setLoading(false);
      return;
    }
    
    // Additional validation: Check stock availability for each item using warehouse-specific stock
    const stockIssues: string[] = [];
    const itemsToUpdate: Array<{ index: number; newQuantity: number }> = [];
    
    items.forEach((item, idx) => {
      if (item.product > 0 && item.quantity > 0 && formData.warehouse) {
        const product = products.find((p) => p.id === item.product);
        if (product) {
          const stock = getProductStock(item.product, warehouseId);
          if (!stock) {
            stockIssues.push(`Item ${idx + 1} (${product.name}): Stock information not available. Please wait a moment and try again.`);
            return;
          }
          
          const validation = validateDeliveryQuantity(
            item.product,
            item.quantity,
            warehouseId,
            item.unit_of_measure || 'stock'
          );
          
          if (!validation.isValid) {
            // Store the update to apply after validation
            itemsToUpdate.push({ index: idx, newQuantity: validation.maxAllowed });
            stockIssues.push(`Item ${idx + 1} (${product.name}): ${validation.message || 'Quantity adjusted to available stock'}`);
          }
        }
      }
    });
    
    // Apply quantity updates if needed
    if (itemsToUpdate.length > 0) {
      itemsToUpdate.forEach(({ index, newQuantity }) => {
        updateItem(index, 'quantity', newQuantity);
      });
      setError(`Stock availability issues:\n${stockIssues.join('\n')}\n\nQuantities have been adjusted. Please review and try again.`);
      setLoading(false);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const deliveryData = {
        ...formData,
        warehouse: parseInt(formData.warehouse),
        items: items
          .filter(item => item.product && item.product > 0 && item.quantity > 0)
          .map(item => ({
            product: item.product,
            bin: item.bin ?? undefined,
            quantity: Math.round(item.quantity * 100) / 100, // Round to 2 decimal places
            unit_of_measure: item.unit_of_measure || 'stock',
          })),
      };
      await operationsService.createDelivery(deliveryData);
      showToast.success('Delivery created successfully');
      router.push('/deliveries');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create delivery';
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
          <h1 className="text-3xl font-bold text-gray-900">Create New Delivery</h1>
          <Link
            href="/deliveries"
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
                onChange={async (e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, warehouse: value });
                  setItems((prev) => prev.map((it) => ({ ...it, bin: null, product: 0 })));
                  loadBinsForWarehouse(value);
                  
                  // Load stock for all products in the selected warehouse and category
                  if (value && formData.category) {
                    const warehouseId = parseInt(value);
                    const categoryId = parseInt(formData.category);
                    // Load stock for all products in this category
                    const categoryProducts = products.filter(
                      (p) => p.category && Number(p.category) === categoryId
                    );
                    await Promise.all(
                      categoryProducts.map((product) => loadProductStock(product.id, warehouseId))
                    );
                    // Also load stock for existing items
                    await Promise.all(
                      items
                        .filter(item => item.product > 0)
                        .map(item => loadProductStock(item.product, warehouseId))
                    );
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={async (e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, category: value });
                  // Clear product selections when category changes
                  setItems((prev) => prev.map((it) => ({ ...it, product: 0 })));
                  
                  // Load stock for all products in the selected category and warehouse
                  if (value && formData.warehouse) {
                    const warehouseId = parseInt(formData.warehouse);
                    const categoryId = parseInt(value);
                    // Load stock for all products in this category
                    const categoryProducts = products.filter(
                      (p) => p.category && Number(p.category) === categoryId
                    );
                    await Promise.all(
                      categoryProducts.map((product) => loadProductStock(product.id, warehouseId))
                    );
                  }
                }}
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
                Customer *
              </label>
              <input
                type="text"
                required
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
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
                {formData.status === 'draft' && 'Draft deliveries can be edited freely'}
                {formData.status === 'waiting' && 'Waiting deliveries require approval before processing'}
                {formData.status === 'ready' && 'Ready deliveries can be validated immediately'}
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shipping Address
              </label>
              <textarea
                value={formData.shipping_address}
                onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
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
                          disabled={!formData.warehouse || !formData.category}
                          onChange={async (e) => {
                            const productId = parseInt(e.target.value);
                            updateItem(index, 'product', productId);
                            
                            // Load stock for the selected product in the selected warehouse
                            if (productId > 0 && formData.warehouse) {
                              await loadProductStock(productId, parseInt(formData.warehouse));
                              // Don't automatically validate/change quantity - let user enter it
                            } else if (productId === 0) {
                              updateItem(index, 'quantity', 0);
                            }
                          }}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            !formData.warehouse || !formData.category ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                        >
                          <option value="0">
                            {!formData.warehouse || !formData.category
                              ? 'Select Warehouse and Category first'
                              : 'Select Product'}
                          </option>
                          {(() => {
                            const filteredProducts = getFilteredProducts();
                            if (filteredProducts.length === 0 && formData.warehouse && formData.category) {
                              return (
                                <option value="0" disabled>
                                  No products available in this warehouse and category
                                </option>
                              );
                            }
                            return filteredProducts.map((prod) => (
                              <option key={prod.id} value={prod.id}>
                                {prod.name} ({prod.sku})
                              </option>
                            ));
                          })()}
                        </select>
                        {(!formData.warehouse || !formData.category) && (
                          <p className="mt-1 text-xs text-amber-600">
                            Please select both warehouse and category to choose products
                          </p>
                        )}
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
                          value={item.quantity || ''}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            if (inputValue === '' || inputValue === '.') {
                              updateItem(index, 'quantity', 0);
                              return;
                            }
                            const numValue = parseFloat(inputValue);
                            if (isNaN(numValue) || numValue < 0) {
                              updateItem(index, 'quantity', 0);
                              return;
                            }
                            // During typing, just round the value, don't clamp aggressively
                            const rounded = Math.round(numValue * 100) / 100;
                            updateItem(index, 'quantity', rounded);
                          }}
                          onBlur={(e) => {
                            // Just round on blur, don't validate/clamp - validation happens on submit
                            const value = parseFloat(e.target.value) || 0;
                            const rounded = Math.round(value * 100) / 100;
                            updateItem(index, 'quantity', rounded);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        {item.product > 0 && formData.warehouse && (
                          <p className="mt-1 text-xs text-gray-500">
                            {(() => {
                              const product = products.find((p) => p.id === item.product);
                              if (!product) return '';
                              const stock = getProductStock(item.product, parseInt(formData.warehouse));
                              if (!stock) {
                                return 'Loading stock information...';
                              }
                              const safety = parseFloat(product.reorder_level?.toString() || '0') || 0;
                              const roundedSafety = Math.round(safety * 100) / 100;
                              const available = Math.max(0, stock.available - roundedSafety);
                              const roundedAvailable = Math.round(available * 100) / 100;
                              const roundedTotal = Math.round(stock.quantity * 100) / 100;
                              const roundedReserved = Math.round(stock.reserved * 100) / 100;
                              
                              if (item.unit_of_measure === 'purchase') {
                                const conversionFactor = parseFloat(product.unit_conversion_factor?.toString() || '1') || 1;
                                const availableInPurchase = Math.round((roundedAvailable / conversionFactor) * 100) / 100;
                                return `Available: ${availableInPurchase.toFixed(2)} purchase units (${roundedAvailable.toFixed(2)} stock units) | Total: ${roundedTotal.toFixed(2)}, Reserved: ${roundedReserved.toFixed(2)}, Safety: ${roundedSafety.toFixed(2)}`;
                              }
                              return `Available: ${roundedAvailable.toFixed(2)} stock units | Total: ${roundedTotal.toFixed(2)}, Reserved: ${roundedReserved.toFixed(2)}, Safety buffer: ${roundedSafety.toFixed(2)}`;
                            })()}
                          </p>
                        )}
                        {item.product > 0 && !formData.warehouse && (
                          <p className="mt-1 text-xs text-amber-600">
                            Please select a warehouse to see stock availability
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unit
                        </label>
                        <select
                          value={item.unit_of_measure || 'stock'}
                          onChange={(e) => {
                            const newUnit = e.target.value as 'stock' | 'purchase';
                            updateItem(index, 'unit_of_measure', newUnit);
                            // Don't validate on unit change - let user enter quantity freely
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="stock">Stock unit</option>
                          <option value="purchase">Purchase unit</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.unit_of_measure === 'purchase' 
                            ? 'Purchase units will be converted to stock units using the product\'s conversion factor.'
                            : 'Stock units are the base unit for inventory tracking.'
                          }
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bin
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
                          disabled={!formData.warehouse}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            !formData.warehouse ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                        >
                          <option value="">{formData.warehouse ? 'No Bin' : 'Select warehouse first'}</option>
                          {bins
                            .filter(bin => !formData.warehouse || bin.warehouse === parseInt(formData.warehouse) || bin.warehouse_id === parseInt(formData.warehouse))
                            .map((bin) => (
                              <option key={bin.id} value={bin.id}>
                                {bin.code} {bin.description ? `- ${bin.description}` : ''}
                              </option>
                            ))}
                        </select>
                        {!formData.warehouse && (
                          <p className="mt-1 text-xs text-gray-500">
                            Select a warehouse first to choose a bin location
                          </p>
                        )}
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
              {loading ? 'Creating...' : 'Create Delivery'}
            </button>
            <Link
              href="/deliveries"
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
      {scannerItemIndex !== null && scannerEnabled && (
        <BarcodeScanner onScan={handleScanResult} onClose={() => setScannerItemIndex(null)} />
      )}
    </>
  );
}

