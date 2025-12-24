'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { operationsService, DeliveryOrder } from '@/lib/operations';
import { productService, Warehouse } from '@/lib/products';
import { Plus, CheckCircle, MessageSquare, Pencil, Truck } from 'lucide-react';
import StatusEditModal from '@/components/StatusEditModal';
import SavedViewToolbar from '@/components/SavedViewToolbar';
import DocumentCollaborationPanel from '@/components/DocumentCollaborationPanel';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardContent,
  EmptyState,
  LoadingState,
  PageHeader,
  Select,
} from '@/components/ui';

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

  const statusVariant = (
    status: string,
  ): 'neutral' | 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
      case 'done':
        return 'success';
      case 'ready':
        return 'info';
      case 'waiting':
        return 'warning';
      case 'canceled':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Delivery Orders"
          description="Manage outbound shipments and validation workflows"
          actions={
            <ButtonLink
              href="/deliveries/new"
              leftIcon={<Plus size={18} />}
              className="w-full sm:w-auto"
            >
              New Delivery
            </ButtonLink>
          }
        />

        <Card className="hover-lift">
          <CardContent className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 sm:flex-none">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                >
                  <option value="">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="waiting">Waiting</option>
                  <option value="ready">Ready</option>
                  <option value="done">Done</option>
                  <option value="canceled">Canceled</option>
                </Select>
              </div>
              <div className="flex-1 sm:flex-none">
                <Select
                  value={warehouseFilter}
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                  aria-label="Filter by warehouse"
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <SavedViewToolbar
              pageKey="deliveries"
              currentFilters={{ status: statusFilter || null, warehouse: warehouseFilter || null }}
              onApply={handleApplySavedFilters}
              helperText="Bookmark shipping filters (status, warehouse) for planners."
            />

            {loading ? (
              <LoadingState label="Loading deliveries…" />
            ) : deliveries.length === 0 ? (
              <EmptyState
                icon={<Truck size={32} className="text-gray-400 dark:text-gray-500" />}
                title="No deliveries found"
                description="Create your first delivery order to start tracking outbound inventory."
                action={
                  <ButtonLink href="/deliveries/new" leftIcon={<Plus size={16} />} size="sm">
                    New Delivery
                  </ButtonLink>
                }
              />
            ) : (
              <div className="overflow-x-auto custom-scrollbar rounded-xl border border-gray-100 dark:border-gray-800">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40">
                      <th className="text-left p-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Document #</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Customer</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Warehouse</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Status</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Created</th>
                      <th className="text-right p-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((delivery) => (
                      <tr
                        key={delivery.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-colors"
                      >
                        <td className="p-3 font-semibold text-gray-900 dark:text-gray-100">
                          {delivery.document_number}
                        </td>
                        <td className="p-3 text-sm text-gray-700 dark:text-gray-200">{delivery.customer}</td>
                        <td className="p-3 text-sm text-gray-700 dark:text-gray-200">{delivery.warehouse_name}</td>
                        <td className="p-3">
                          <Badge variant={statusVariant(delivery.status)}>{delivery.status}</Badge>
                        </td>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(delivery.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setEditDoc({
                                  id: delivery.id,
                                  number: delivery.document_number,
                                  status: delivery.status,
                                })
                              }
                              title="Edit status"
                              aria-label="Edit status"
                              leftIcon={<Pencil size={16} />}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCollabDoc({ id: delivery.id, number: delivery.document_number })}
                              title="Open collaboration panel"
                              aria-label="Open collaboration panel"
                              leftIcon={<MessageSquare size={16} />}
                            />
                            {delivery.status === 'ready' && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleValidate(delivery.id)}
                                leftIcon={<CheckCircle size={16} />}
                              >
                                Validate
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
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
    <Suspense fallback={<LoadingState label="Loading deliveries…" />}>
      <DeliveriesPageContent />
    </Suspense>
  );
}

