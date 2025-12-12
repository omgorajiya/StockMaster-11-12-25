'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { operationsService, CycleCountTask, DocumentStatus } from '@/lib/operations';
import { productService, Warehouse } from '@/lib/products';
import { Plus, Calendar, ClipboardList } from 'lucide-react';
import Link from 'next/link';

export default function CycleCountsPage() {
  const [tasks, setTasks] = useState<CycleCountTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [scheduledDateFilter, setScheduledDateFilter] = useState<string>('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [statusFilter, warehouseFilter, scheduledDateFilter]);

  const loadWarehouses = async () => {
    try {
      const data = await productService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (warehouseFilter) params.warehouse = parseInt(warehouseFilter);
      if (scheduledDateFilter) params.scheduled_date = scheduledDateFilter;
      const data = await operationsService.getCycleCounts(params);
      setTasks(data.results || data);
    } catch (error) {
      console.error('Failed to load cycle counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClasses = (status: DocumentStatus) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800';
      case 'ready':
        return 'bg-blue-100 text-blue-800';
      case 'waiting':
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Cycle Counts</h1>
          <Link
            href="/cycle-counts/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0"
          >
            <Plus size={20} />
            New Cycle Count
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | '')}
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
            <input
              type="date"
              value={scheduledDateFilter}
              onChange={(e) => setScheduledDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-600 cursor-pointer bg-transparent dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>

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
                    <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Method</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Scheduled</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-12">
                        <div className="flex flex-col items-center gap-3">
                          <ClipboardList size={48} className="text-gray-400" />
                          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No cycle counts found</p>
                          <p className="text-gray-400 dark:text-gray-500 text-sm">Create your first cycle count task to get started</p>
                          <Link
                            href="/cycle-counts/new"
                            className="mt-2 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0"
                          >
                            <Plus size={18} />
                            New Cycle Count
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr
                        key={task.id}
                        className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm transition-all duration-200"
                      >
                        <td className="p-3 font-medium">
                          <Link href={`/cycle-counts/${task.id}`} className="text-primary-600 hover:underline">
                            {task.document_number}
                          </Link>
                        </td>
                        <td className="p-3 text-gray-900 dark:text-gray-100">{task.warehouse_name}</td>
                        <td className="p-3 capitalize text-gray-700 dark:text-gray-300">{task.method}</td>
                        <td className="p-3 text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400 dark:text-gray-500" />
                          {task.scheduled_date
                            ? new Date(task.scheduled_date).toLocaleDateString()
                            : 'Not scheduled'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 text-xs rounded ${getStatusBadgeClasses(task.status)} dark:bg-opacity-80`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600 dark:text-gray-400">
                          {new Date(task.created_at).toLocaleDateString()}
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
    </Layout>
  );
}
