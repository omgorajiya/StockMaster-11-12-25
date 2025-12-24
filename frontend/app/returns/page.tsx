'use client';

import { useEffect, useState } from 'react';
import { operationsService, ReturnOrder } from '@/lib/operations';
import { productService, Warehouse } from '@/lib/products';
import { Plus, CheckCircle, MessageSquare, RotateCcw, Pencil } from 'lucide-react';
import StatusEditModal from '@/components/StatusEditModal';
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
  const [editDoc, setEditDoc] = useState<{ id: number; number: string; status: string } | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'waiting', label: 'Waiting' },
    { value: 'ready', label: 'Ready' },
    { value: 'done', label: 'Done' },
    { value: 'canceled', label: 'Canceled' },
  ];

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

  const handleSaveStatus = async (newStatus: string) => {
    if (!editDoc) return;

    setSavingStatus(true);
    try {
      await operationsService.updateReturn(editDoc.id, { status: newStatus as any });
      const { showToast } = await import('@/lib/toast');
      showToast.success('Return status updated');
      setEditDoc(null);
      loadReturns();
    } catch (error: any) {
      const { showToast } = await import('@/lib/toast');
      showToast.error(error.response?.data?.message || 'Failed to update return status');
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Returns</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage customer returns and RMA processes</p>
          </div>
          <Link
            href="/returns/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 hover:shadow-xl hover:shadow-primary-600/30 hover:-translate-y-0.5 transition-all duration-300 active:translate-y-0 active:scale-95 text-sm sm:text-base w-full sm:w-auto justify-center font-semibold"
          >
            <Plus size={18} className="sm:w-5 sm:h-5" />
            <span>New Return</span>
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-4 sm:p-6 hover-lift">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-600 cursor-pointer text-sm sm:text-base bg-transparent dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-600 cursor-pointer text-sm sm:text-base bg-transparent dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
            <div className="flex flex-col items-center justify-center h-64 py-12">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600"></div>
                <RotateCcw size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-600" />
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 animate-pulse">Loading returns...</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar rounded-xl">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Document #</th>
                    <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Warehouse</th>
                    <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Disposition</th>
                    <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Created</th>
                    <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-12">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                            <RotateCcw size={48} className="text-gray-400 dark:text-gray-500" />
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No returns found</p>
                          <p className="text-gray-400 dark:text-gray-500 text-sm">Create your first return order to get started</p>
                          <Link
                            href="/returns/new"
                            className="mt-2 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0 text-sm font-semibold"
                          >
                            <Plus size={18} />
                            New Return
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    returns.map((ret) => (
                      <tr key={ret.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-blue-50/50 dark:hover:from-primary-900/10 dark:hover:to-blue-900/10 transition-all duration-200 group">
                        <td className="p-3 sm:p-4 font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">{ret.document_number}</td>
                        <td className="p-3 sm:p-4 text-gray-700 dark:text-gray-300">{ret.warehouse_name}</td>
                        <td className="p-3 sm:p-4">
                          <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                            {ret.disposition}
                          </span>
                        </td>
                        <td className="p-3 sm:p-4">
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              ret.status === 'done'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : ret.status === 'ready'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                : ret.status === 'waiting'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                          >
                            {ret.status}
                          </span>
                        </td>
                        <td className="p-3 sm:p-4 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(ret.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 sm:p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                setEditDoc({ id: ret.id, number: ret.document_number, status: ret.status })
                              }
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                              title="Edit status"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setCollabDoc({ id: ret.id, number: ret.document_number })}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                              title="Open collaboration panel"
                            >
                              <MessageSquare size={16} />
                            </button>
                            {ret.status === 'ready' && (
                              <button
                                onClick={() => handleValidate(ret.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 hover:shadow-lg hover:shadow-green-600/30 hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0 text-xs sm:text-sm font-semibold"
                              >
                                <CheckCircle size={16} />
                                <span className="hidden sm:inline">Validate</span>
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
        title={`Edit Return ${editDoc?.number || ''}`}
        currentStatus={editDoc?.status || 'draft'}
        statusOptions={statusOptions}
        saving={savingStatus}
        onClose={() => setEditDoc(null)}
        onSave={handleSaveStatus}
      />
      <DocumentCollaborationPanel
        open={!!collabDoc}
        documentType="return"
        documentId={collabDoc?.id}
        documentNumber={collabDoc?.number}
        onClose={() => setCollabDoc(null)}
      />
    </>
  );
}
