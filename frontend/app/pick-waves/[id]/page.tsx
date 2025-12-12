'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { operationsService, PickWave, DeliveryOrder, DeliveryItem } from '@/lib/operations';
import { showToast } from '@/lib/toast';
import { Calendar, User, Package, CheckCircle, Play, Check } from 'lucide-react';

interface PickListRow {
  productId: number;
  productName: string;
  productSku: string;
  binCode: string;
  totalQuantity: number;
  orderCount: number;
}

export default function PickWaveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [pickWave, setPickWave] = useState<PickWave | null>(null);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pickList, setPickList] = useState<PickListRow[]>([]);

  useEffect(() => {
    if (params.id) {
      loadPickWave();
    }
  }, [params.id]);

  const loadPickWave = async () => {
    try {
      setLoading(true);
      const data = await operationsService.getPickWave(parseInt(params.id as string, 10));
      setPickWave(data);

      // Load delivery orders for this wave (filtered by pick_waves via backend)
      const ordersData = await operationsService.getDeliveries({
        // @ts-expect-error: pick_waves is supported by the backend filterset
        pick_waves: parseInt(params.id as string, 10),
      } as any);
      const orders = ordersData.results || ordersData;
      setDeliveryOrders(orders);

      // Build consolidated pick list grouped by product + bin for efficient picking
      const rows: Record<string, PickListRow> = {};
      (orders as DeliveryOrder[]).forEach((order) => {
        (order.items || []).forEach((item: DeliveryItem) => {
          const key = `${item.product}|${item.bin || 'none'}`;
          const productName = item.product_name || 'Unknown product';
          const productSku = item.product_sku || '';
          const binCode = item.bin_code || '-';
          const quantity = Number(item.quantity || 0);

          if (!rows[key]) {
            rows[key] = {
              productId: item.product,
              productName,
              productSku,
              binCode,
              totalQuantity: 0,
              orderCount: 0,
            };
          }
          rows[key].totalQuantity += quantity;
          rows[key].orderCount += 1;
        });
      });

      const sortedRows = Object.values(rows).sort((a, b) => {
        if (a.binCode === b.binCode) {
          return a.productSku.localeCompare(b.productSku);
        }
        return a.binCode.localeCompare(b.binCode);
      });
      setPickList(sortedRows);
    } catch (error) {
      console.error('Failed to load pick wave:', error);
      showToast.error('Failed to load pick wave');
    } finally {
      setLoading(false);
    }
  };

  const handleStartPicking = async () => {
    if (!pickWave) return;
    
    setActionLoading(true);
    try {
      const response = await operationsService.startPickWave(pickWave.id);
      if (response.success) {
        showToast.success('Picking started successfully');
        loadPickWave();
      } else {
        showToast.error(response.message || 'Failed to start picking');
      }
    } catch (error) {
      console.error('Failed to start picking:', error);
      showToast.error('Failed to start picking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompletePicking = async () => {
    if (!pickWave) return;
    
    setActionLoading(true);
    try {
      const response = await operationsService.completePickWave(pickWave.id);
      if (response.success) {
        showToast.success('Picking completed successfully');
        loadPickWave();
      } else {
        showToast.error(response.message || 'Failed to complete picking');
      }
    } catch (error) {
      console.error('Failed to complete picking:', error);
      showToast.error('Failed to complete picking');
    } finally {
      setActionLoading(false);
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

  if (!pickWave) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-medium text-gray-900">Pick wave not found</h2>
            <button
              onClick={() => router.push('/pick-waves')}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Back to Pick Waves
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'picking':
        return 'bg-blue-100 text-blue-800';
      case 'planned':
        return 'bg-yellow-100 text-yellow-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{pickWave.name}</h1>
            <p className="text-gray-600 mt-1">Pick Wave #{pickWave.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm rounded-full ${getStatusBadgeClasses(pickWave.status)}`}>
              {pickWave.status.charAt(0).toUpperCase() + pickWave.status.slice(1)}
            </span>
            {pickWave.status === 'planned' && (
              <button
                onClick={handleStartPicking}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Play size={16} />
                )}
                Start Picking
              </button>
            )}
            {pickWave.status === 'picking' && (
              <button
                onClick={handleCompletePicking}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Check size={16} />
                )}
                Complete Picking
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Delivery Orders</h2>
            {deliveryOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No delivery orders in this pick wave
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Document #</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Customer</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Items</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryOrders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium text-primary-600">
                          {order.document_number}
                        </td>
                        <td className="p-3">{order.customer}</td>
                        <td className="p-3">{order.items?.length || 0}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 text-xs rounded ${getStatusBadgeClasses(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Consolidated Pick List</h2>
              {pickList.length === 0 ? (
                <p className="text-gray-500 text-sm">No pickable lines found for this wave yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-gray-700">Bin</th>
                        <th className="text-left p-3 font-medium text-gray-700">Product</th>
                        <th className="text-left p-3 font-medium text-gray-700">SKU</th>
                        <th className="text-right p-3 font-medium text-gray-700">Total Qty</th>
                        <th className="text-right p-3 font-medium text-gray-700">Orders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pickList.map((row) => (
                        <tr key={`${row.productId}-${row.binCode}`} className="border-b last:border-b-0 hover:bg-gray-50">
                          <td className="p-3 text-gray-700">{row.binCode}</td>
                          <td className="p-3 text-gray-900">{row.productName}</td>
                          <td className="p-3 text-gray-600">{row.productSku}</td>
                          <td className="p-3 text-right font-semibold text-gray-900">{row.totalQuantity}</td>
                          <td className="p-3 text-right text-gray-700">{row.orderCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Details</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Warehouse</span>
                  <span className="font-medium">{pickWave.warehouse_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Created</span>
                  <span className="font-medium">
                    {new Date(pickWave.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Delivery Orders</span>
                  <span className="font-medium">{pickWave.delivery_order_count}</span>
                </div>
                {pickWave.assigned_picker_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Assigned Picker</span>
                    <span className="font-medium">{pickWave.assigned_picker_name}</span>
                  </div>
                )}
                {pickWave.completed_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Completed</span>
                    <span className="font-medium">
                      {new Date(pickWave.completed_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {pickWave.notes && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Notes</h2>
                <p className="text-gray-700">{pickWave.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
