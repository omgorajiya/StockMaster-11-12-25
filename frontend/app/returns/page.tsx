'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { operationsService, ReturnOrder } from '@/lib/operations';
import { productService, Warehouse } from '@/lib/products';
import { Plus, CheckCircle, MessageSquare, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import SavedViewToolbar from '@/components/SavedViewToolbar';
import DocumentCollaborationPanel from '@/components/DocumentCollaborationPanel';

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [collabDoc, setCollabDoc] = useState<{ id: number; number: string } | null>(null);

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    loadReturns();
  }, [statusFilter, warehouseFilter]);

  const loadWarehouses = async () => {
    try {
      const data = await productService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    }
  };

  const loadReturns = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (warehouseFilter) params.warehouse = parseInt(warehouseFilter);
      const data = await operationsService.getReturns(params);
      setReturns(data.results || data);
    } catch (error) {
      console.error('Failed to load returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (id: number) => {
    try {
      const result = await operationsService.validateReturn(id);
      const { showToast } = await import('@/lib/toast');
      if (result.success) {
        showToast.success(result.message || 'Return validated successfully');
        loadReturns();
      } else {
        showToast.error(result.message || 'Failed to validate return');
      }
    } catch (error: any) {
      const { showToast } = await import('@/lib/toast');
      showToast.error(error.response?.data?.message || 'Failed to validate return');
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Returns</h1>
          <Link
            href="/returns/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0"
          >
            <Plus size={20} />
            New Return
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
            pageKey="returns"
            currentFilters={{ status: statusFilter || null, warehouse: warehouseFilter || null }}
            onApply={handleApplySavedFilters}
            helperText="Save your RMA filter combinations for quick access."
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
                    <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Warehouse</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Disposition</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Created</th>
                    <th className="text-right p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-12">
                        <div className="flex flex-col items-center gap-3">
                          <RotateCcw size={48} className="text-gray-400" />
                          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No returns found</p>
                          <p className="text-gray-400 dark:text-gray-500 text-sm">Create your first return order to get started</p>
                          <Link
                            href="/returns/new"
                            className="mt-2 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0"
                          >
                            <Plus size={18} />
                            New Return
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    returns.map((ret) => (
                      <tr key={ret.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm transition-all duration-200">
                        <td className="p-3 font-medium">{ret.document_number}</td>
                        <td className="p-3">{ret.warehouse_name}</td>
                        <td className="p-3 capitalize">{ret.disposition}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              ret.status === 'done'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                : ret.status === 'ready'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {ret.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">
                          {new Date(ret.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setCollabDoc({ id: ret.id, number: ret.document_number })}
                              className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 dark:text-gray-300 dark:hover:text-primary-200 dark:hover:bg-primary-500/15"
                              title="Open collaboration panel"
                            >
                              <MessageSquare size={16} />
                            </button>
                            {ret.status === 'ready' && (
                              <button
                                onClick={() => handleValidate(ret.id)}
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
        documentType="return"
        documentId={collabDoc?.id}
        documentNumber={collabDoc?.number}
        onClose={() => setCollabDoc(null)}
      />
    </Layout>
  );
}