'use client';

import { useEffect, useState } from 'react';
import { productService, Warehouse } from '@/lib/products';
import { notificationService, NotificationJobStatus } from '@/lib/notifications';
import { Plus, Edit, Trash2, RefreshCw, CheckCircle, Package } from 'lucide-react';
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
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage your warehouses and system configuration</p>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingWarehouse(null);
              setFormData({ name: '', code: '', address: '' });
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 hover:shadow-xl hover:shadow-primary-600/30 hover:-translate-y-0.5 transition-all duration-300 active:translate-y-0 active:scale-95 text-sm sm:text-base w-full sm:w-auto justify-center font-semibold"
          >
            <Plus size={18} className="sm:w-5 sm:h-5" />
            <span>Add Warehouse</span>
          </button>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-4 sm:p-6 hover-lift">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Package size={24} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Warehouse Management</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Configure and manage your warehouse locations</p>
            </div>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 p-5 bg-gradient-to-br from-gray-50 via-blue-50/20 to-primary-50/10 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 rounded-2xl border-2 border-primary-200 dark:border-primary-800 animate-scale-in">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                {editingWarehouse ? <Edit size={20} /> : <Plus size={20} />}
                {editingWarehouse ? 'Edit Warehouse' : 'New Warehouse'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    Warehouse Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                    placeholder="e.g., Main Warehouse"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    Warehouse Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 uppercase"
                    placeholder="e.g., WH-001"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 resize-none"
                    placeholder="Enter warehouse address..."
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-5">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 hover:shadow-lg hover:shadow-primary-600/30 hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0 active:scale-95 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      {editingWarehouse ? 'Updating...' : 'Creating...'}
                    </span>
                  ) : (
                    editingWarehouse ? 'Update Warehouse' : 'Create Warehouse'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingWarehouse(null);
                    setFormData({ name: '', code: '', address: '' });
                  }}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 hover:shadow-sm transition-all duration-200 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading && !showForm ? (
            <div className="flex flex-col items-center justify-center h-48 py-12">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600"></div>
                <Package size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-600" />
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 animate-pulse">Loading warehouses...</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar rounded-xl">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50">
                  <tr>
                    <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Code</th>
                    <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Address</th>
                    <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center p-12">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                            <Package size={48} className="text-gray-400 dark:text-gray-500" />
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No warehouses found</p>
                          <p className="text-gray-400 dark:text-gray-500 text-sm">Create your first warehouse to get started</p>
                          <button
                            onClick={() => {
                              setShowForm(true);
                              setEditingWarehouse(null);
                              setFormData({ name: '', code: '', address: '' });
                            }}
                            className="mt-2 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0 text-sm font-semibold"
                          >
                            <Plus size={16} />
                            Add Warehouse
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    warehouses.map((warehouse) => (
                      <tr
                        key={warehouse.id}
                        className="border-b border-gray-200 dark:border-gray-800 hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-blue-50/50 dark:hover:from-primary-900/10 dark:hover:to-blue-900/10 transition-all duration-200 group"
                      >
                        <td className="p-3 sm:p-4 font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">{warehouse.name}</td>
                        <td className="p-3 sm:p-4 text-gray-600 dark:text-gray-300 font-mono text-sm bg-gray-50 dark:bg-gray-800/50">{warehouse.code}</td>
                        <td className="p-3 sm:p-4 text-gray-600 dark:text-gray-300 text-sm max-w-xs truncate">{warehouse.address || '-'}</td>
                        <td className="p-3 sm:p-4">
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              warehouse.is_active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                          >
                            {warehouse.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-3 sm:p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(warehouse)}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
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
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
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
    </>
  );
}

