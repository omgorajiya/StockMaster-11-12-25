'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { operationsService, PickWave, DocumentStatus } from '@/lib/operations';
import { productService, Warehouse } from '@/lib/products';
import { Plus, Calendar, GitMerge } from 'lucide-react';
import Link from 'next/link';

export default function PickWavesPage() {
  const [pickWaves, setPickWaves] = useState<PickWave[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    loadPickWaves();
  }, [statusFilter, warehouseFilter]);

  const loadWarehouses = async () => {
    try {
      const data = await productService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    }
  };

  const loadPickWaves = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (warehouseFilter) params.warehouse = parseInt(warehouseFilter);
      const data = await operationsService.getPickWaves(params);
      setPickWaves(data.results || data);
    } catch (error) {
      console.error('Failed to load pick waves:', error);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Pick Waves</h1>
          <Link
            href="/pick-waves/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0"
          >
            <Plus size={20} />
            New Pick Wave
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
              <option value="planned">Planned</option>
              <option value="picking">Picking</option>
              <option value="completed">Completed</option>
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

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Warehouse</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Orders</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {pickWaves.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center p-12">
                        <div className="flex flex-col items-center gap-3">
                          <GitMerge size={48} className="text-gray-400" />
                          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No pick waves found</p>
                          <p className="text-gray-400 dark:text-gray-500 text-sm">Create your first pick wave to get started</p>
                          <Link
                            href="/pick-waves/new"
                            className="mt-2 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0"
                          >
                            <Plus size={18} />
                            New Pick Wave
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pickWaves.map((wave) => (
                      <tr
                        key={wave.id}
                        className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm transition-all duration-200"
                      >
                        <td className="p-3 font-medium">
                          <Link href={`/pick-waves/${wave.id}`} className="text-primary-600 hover:underline">
                            {wave.name}
                          </Link>
                        </td>
                        <td className="p-3">{wave.warehouse_name}</td>
                        <td className="p-3">{wave.delivery_order_count}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 text-xs rounded ${getStatusBadgeClasses(wave.status)}`}>
                            {wave.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">
                          {new Date(wave.created_at).toLocaleDateString()}
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
