'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { productService, Warehouse } from '@/lib/products';
import { notificationService, NotificationJobStatus } from '@/lib/notifications';
import { Plus, Edit, Trash2, RefreshCw, CheckCircle } from 'lucide-react';
import { showToast } from '@/lib/toast';

export default function SettingsPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [jobs, setJobs] = useState<NotificationJobStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [warehousesData, jobsData] = await Promise.all([
        productService.getWarehouses(),
        notificationService.getJobs(),
      ]);
      setWarehouses(warehousesData);
      setJobs(jobsData);
    } catch (error) {
      console.error('Failed to load settings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingWarehouse) {
        await productService.updateWarehouse(editingWarehouse.id, formData);
        showToast.success('Warehouse updated successfully');
      } else {
        await productService.createWarehouse(formData);
        showToast.success('Warehouse created successfully');
      }
      setShowForm(false);
      setEditingWarehouse(null);
      setFormData({ name: '', code: '', address: '' });
      loadData();
    } catch (error: any) {
      showToast.error(error.response?.data?.error || 'Failed to save warehouse');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address || '',
    });
    setShowForm(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingWarehouse(null);
              setFormData({ name: '', code: '', address: '' });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0"
          >
            <Plus size={20} />
            Add Warehouse
          </button>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Warehouse Management</h2>

          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Warehouse Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Warehouse Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0"
                >
                  {editingWarehouse ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingWarehouse(null);
                    setFormData({ name: '', code: '', address: '' });
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100 rounded-lg hover:bg-gray-300 hover:shadow-sm transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Code</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Address</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center p-8 text-gray-500">
                        No warehouses found. Create one to get started.
                      </td>
                    </tr>
                  ) : (
                    warehouses.map((warehouse) => (
                      <tr
                        key={warehouse.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm transition-all duration-200 cursor-pointer"
                      >
                        <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{warehouse.name}</td>
                        <td className="p-3 text-gray-600 dark:text-gray-300 font-mono text-sm">{warehouse.code}</td>
                        <td className="p-3 text-gray-600 dark:text-gray-300 text-sm">{warehouse.address || '-'}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              warehouse.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {warehouse.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(warehouse)}
                              className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 hover:scale-110"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm(`Are you sure you want to delete warehouse "${warehouse.name}"?`)) return;
                                try {
                                  await productService.deleteWarehouse(warehouse.id);
                                  showToast.success('Warehouse deleted successfully');
                                  loadData();
                                } catch (error: any) {
                                  showToast.error(error.response?.data?.error || 'Failed to delete warehouse');
                                }
                              }}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
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

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Notification Jobs</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monitor and trigger low-stock digests or summaries on demand
              </p>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {jobs.map((job) => (
              <div key={job.job_name} className="rounded-lg border border-gray-100 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 uppercase">{job.job_name}</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                      {job.last_status === 'success' && <CheckCircle size={16} className="text-green-500" />}
                      {job.last_status}
                    </p>
                    <p className="text-xs text-gray-500">
                      Last run: {job.last_run_at ? new Date(job.last_run_at).toLocaleString() : 'never'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Next run: {job.next_run_at ? new Date(job.next_run_at).toLocaleString() : 'scheduled'}
                    </p>
                    {job.last_message && <p className="text-xs text-gray-500 mt-1">{job.last_message}</p>}
                  </div>
                  <button
                    onClick={async () => {
                      const response = await notificationService.runJob(job.job_name);
                      showToast.success(response.message);
                      loadData();
                    }}
                    className="px-3 py-1 text-sm rounded-full border border-primary-200 text-primary-600 hover:bg-primary-50"
                  >
                    Run now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

