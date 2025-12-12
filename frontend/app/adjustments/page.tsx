'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { operationsService, StockAdjustment } from '@/lib/operations';
import { productService, Warehouse } from '@/lib/products';
import { Plus, CheckCircle, MessageSquare, Sliders } from 'lucide-react';
import Link from 'next/link';
import SavedViewToolbar from '@/components/SavedViewToolbar';
import DocumentCollaborationPanel from '@/components/DocumentCollaborationPanel';

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [collabDoc, setCollabDoc] = useState<{ id: number; number: string } | null>(null);

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    loadAdjustments();
  }, [statusFilter, warehouseFilter]);

  const loadWarehouses = async () => {
    try {
      const data = await productService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    }
  };

  const loadAdjustments = async () => {
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (warehouseFilter) params.warehouse = parseInt(warehouseFilter);
      const data = await operationsService.getAdjustments(params);
      setAdjustments(data.results || data);
    } catch (error) {
      console.error('Failed to load adjustments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (id: number) => {
    try {
      const result = await operationsService.validateAdjustment(id);
      if (result.success) {
        const { showToast } = await import('@/lib/toast');
        showToast.success(result.message || 'Adjustment validated successfully');
        loadAdjustments();
      } else {
        const { showToast } = await import('@/lib/toast');
        showToast.error(result.message || 'Failed to validate adjustment');
      }
    } catch (error: any) {
      const { showToast } = await import('@/lib/toast');
      showToast.error(error.response?.data?.message || 'Failed to validate adjustment');
    }
  };

  const handleApplySavedFilters = (filters: Record<string, any>) => {
    setStatusFilter(filters.status ?? '');
    setWarehouseFilter(filters.warehouse ? String(filters.warehouse) : '');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Stock Adjustments</h1>
            <Link
              href="/adjustments/new"
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0"
            >
              <Plus size={20} />
              New Adjustment
            </Link>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="flex items-center gap-4 mb-6">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-600 cursor-pointer bg-transparent dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-600 cursor-pointer bg-transparent dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
            pageKey="adjustments"
            currentFilters={{ status: statusFilter || null, warehouse: warehouseFilter || null }}
            onApply={handleApplySavedFilters}
            helperText="Keep your cycle count + adjustment queues handy."
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
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Document #</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Reason</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Type</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Warehouse</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Created</th>
                    <th className="text-right p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center p-12">
                        <div className="flex flex-col items-center gap-3">
                          <Sliders size={48} className="text-gray-400" />
                          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No adjustments found</p>
                          <p className="text-gray-400 dark:text-gray-500 text-sm">Create your first stock adjustment to get started</p>
                          <Link
                            href="/adjustments/new"
                            className="mt-2 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0"
                          >
                            <Plus size={18} />
                            New Adjustment
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    adjustments.map((adjustment) => (
                      <tr key={adjustment.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm transition-all duration-200">
                        <td className="p-3 font-medium">{adjustment.document_number}</td>
                        <td className="p-3">{adjustment.reason}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 text-xs rounded bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 ${adjustment.adjustment_type === 'set' ? 'adjustment-type-set' : ''}`}>
                            {adjustment.adjustment_type}
                          </span>
                        </td>
                        <td className="p-3">{adjustment.warehouse_name}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              adjustment.status === 'done'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                : adjustment.status === 'ready'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {adjustment.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">
                          {new Date(adjustment.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setCollabDoc({ id: adjustment.id, number: adjustment.document_number })}
                              className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 dark:text-gray-300 dark:hover:text-primary-200 dark:hover:bg-primary-500/15"
                              title="Open collaboration panel"
                            >
                              <MessageSquare size={16} />
                            </button>
                            {adjustment.status === 'ready' && (
                              <button
                                onClick={() => handleValidate(adjustment.id)}
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
      <DocumentCollaborationPanel
        open={!!collabDoc}
        documentType="adjustment"
        documentId={collabDoc?.id}
        documentNumber={collabDoc?.number}
        onClose={() => setCollabDoc(null)}
      />
    </Layout>
  );
}
