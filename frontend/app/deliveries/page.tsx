'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { operationsService, DeliveryOrder } from '@/lib/operations';
import { productService, Warehouse } from '@/lib/products';
import { Plus, CheckCircle, MessageSquare, Pencil } from 'lucide-react';
import StatusEditModal from '@/components/StatusEditModal';
import Link from 'next/link';
import SavedViewToolbar from '@/components/SavedViewToolbar';
import DocumentCollaborationPanel from '@/components/DocumentCollaborationPanel';

function DeliveriesPageContent() {
  const searchParams = useSearchParams();
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [collabDoc, setCollabDoc] = useState<{ id: number; number: string } | null>(null);
  const [editDoc, setEditDoc] = useState<{ id: number; number: string; status: string } | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'waiting', label: 'Waiting' },
    { value: 'ready', label: 'Ready' },
    { value: 'done', label: 'Done' },
    { value: 'canceled', label: 'Canceled' },
  ];

  // Read status from URL on mount
  useEffect(() => {
    const status = searchParams.get('status');
    if (status) {
      setStatusFilter(status);
    }
  }, [searchParams]);

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    loadDeliveries();
  }, [statusFilter, warehouseFilter]);

  const loadWarehouses = async () => {
    try {
      const data = await productService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    }
  };

  const loadDeliveries = async () => {
    try {
      const params: any = {};
      // Handle multiple statuses (comma-separated)
      if (statusFilter) {
        const statuses = statusFilter.split(',').map(s => s.trim());
        if (statuses.length === 1) {
          params.status = statuses[0];
        } else {
          // If multiple statuses, we'll filter on frontend
          params.status = statuses[0]; // Backend only supports single status
        }
      }
      if (warehouseFilter) params.warehouse = parseInt(warehouseFilter);
      const data = await operationsService.getDeliveries(params);
      let deliveries = data.results || data;
      
      // Filter by multiple statuses if provided
      if (statusFilter && statusFilter.includes(',')) {
        const statuses = statusFilter.split(',').map(s => s.trim());
        deliveries = deliveries.filter((d: DeliveryOrder) => statuses.includes(d.status));
      }
      
      setDeliveries(deliveries);
    } catch (error) {
      console.error('Failed to load deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (id: number) => {
    try {
      const result = await operationsService.validateDelivery(id);
      if (result.success) {
        const { showToast } = await import('@/lib/toast');
        showToast.success(result.message || 'Delivery validated successfully');
        loadDeliveries();
      } else {
        const { showToast } = await import('@/lib/toast');
        showToast.error(result.message || 'Failed to validate delivery');
      }
    } catch (error: any) {
      const { showToast } = await import('@/lib/toast');
      showToast.error(error.response?.data?.message || 'Failed to validate delivery');
    }
  };

  const handleApplySavedFilters = (filters: Record<string, any>) => {
    setStatusFilter(filters.status ?? '');
    setWarehouseFilter(filters.warehouse ? String(filters.warehouse) : '');
  };

  const handleSaveStatus = async (newStatus: string) => {
    if (!editDoc) return;

    setSavingStatus(true);
    try {
      await operationsService.updateDelivery(editDoc.id, { status: newStatus as any });
      const { showToast } = await import('@/lib/toast');
      showToast.success('Delivery status updated');
      setEditDoc(null);
      loadDeliveries();
    } catch (error: any) {
      const { showToast } = await import('@/lib/toast');
      showToast.error(error.response?.data?.message || 'Failed to update delivery status');
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Delivery Orders</h1>
            <Link
              href="/deliveries/new"
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0"
            >
              <Plus size={20} />
              New Delivery
            </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4 mb-6">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all duration-200 hover:border-gray-400 cursor-pointer"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="waiting">Waiting</option>
              <option value="ready">Ready</option>
              <option value="done">Done</option>
              <option value="canceled">Canceled</option>
            </select>
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all duration-200 hover:border-gray-400 cursor-pointer"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>

          <SavedViewToolbar
            pageKey="deliveries"
            currentFilters={{ status: statusFilter || null, warehouse: warehouseFilter || null }}
            onApply={handleApplySavedFilters}
            helperText="Bookmark shipping filters (status, warehouse) for planners."
            className="mb-6"
          />

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Document #</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Customer</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Warehouse</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Created</th>
                    <th className="text-right p-3 text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-gray-500">
                        No deliveries found
                      </td>
                    </tr>
                  ) : (
                    deliveries.map((delivery) => (
                      <tr key={delivery.id} className="border-b hover:bg-gray-50 hover:shadow-sm transition-all duration-200 cursor-pointer">
                        <td className="p-3 font-medium">{delivery.document_number}</td>
                        <td className="p-3">{delivery.customer}</td>
                        <td className="p-3">{delivery.warehouse_name}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              delivery.status === 'done'
                                ? 'bg-green-100 text-green-800'
                                : delivery.status === 'ready'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {delivery.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">
                          {new Date(delivery.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                setEditDoc({ id: delivery.id, number: delivery.document_number, status: delivery.status })
                              }
                              className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 dark:text-gray-300 dark:hover:text-primary-200 dark:hover:bg-primary-500/15"
                              title="Edit status"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setCollabDoc({ id: delivery.id, number: delivery.document_number })}
                              className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 dark:text-gray-300 dark:hover:text-primary-200 dark:hover:bg-primary-500/15"
                              title="Open collaboration panel"
                            >
                              <MessageSquare size={16} />
                            </button>
                            {delivery.status === 'ready' && (
                              <button
                                onClick={() => handleValidate(delivery.id)}
                                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0 text-sm"
                              >
                                <CheckCircle size={16} />
                                Validate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <StatusEditModal
        open={!!editDoc}
        title={`Edit Delivery ${editDoc?.number || ''}`}
        currentStatus={editDoc?.status || 'draft'}
        statusOptions={statusOptions}
        saving={savingStatus}
        onClose={() => setEditDoc(null)}
        onSave={handleSaveStatus}
      />
      <DocumentCollaborationPanel
        open={!!collabDoc}
        documentType="delivery"
        documentId={collabDoc?.id}
        documentNumber={collabDoc?.number}
        onClose={() => setCollabDoc(null)}
      />
    </>
  );
}

export default function DeliveriesPage() {
  return (
    <Suspense fallback={
      <>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </>
    }>
      <DeliveriesPageContent />
    </Suspense>
  );
}

