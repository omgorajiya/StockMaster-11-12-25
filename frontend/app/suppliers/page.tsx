'use client';

import { useState, useEffect } from 'react';
import { supplierService, Supplier } from '@/lib/suppliers';
import { Plus, Edit, Trash2, Package, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { showToast } from '@/lib/toast';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await supplierService.getAll();
      setSuppliers(data);
    } catch (error: any) {
      showToast.error(error.response?.data?.error || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    try {
      await supplierService.delete(id);
      showToast.success('Supplier deleted successfully');
      loadSuppliers();
    } catch (error: any) {
      showToast.error(error.response?.data?.error || 'Failed to delete supplier');
    }
  };

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Suppliers</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your suppliers and vendors</p>
          </div>
          <Link
            href="/suppliers/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Plus size={20} />
            Add Supplier
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-transparent dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center p-12">
              <div className="flex flex-col items-center gap-3">
                <Package size={48} className="text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No suppliers found</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  {searchTerm ? 'Try adjusting your search' : 'Create your first supplier to get started'}
                </p>
                {!searchTerm && (
                  <Link
                    href="/suppliers/new"
                    className="mt-2 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0"
                  >
                    <Plus size={18} />
                    Add Supplier
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Code</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Contact</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Email</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Lead Time</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Performance</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm transition-all duration-200"
                    >
                      <td className="p-3 font-medium">{supplier.name}</td>
                      <td className="p-3 text-gray-600">{supplier.code}</td>
                      <td className="p-3 text-gray-600">{supplier.contact_person || '-'}</td>
                      <td className="p-3 text-gray-600">{supplier.email || '-'}</td>
                      <td className="p-3 text-gray-600">{supplier.lead_time_days} days</td>
                      <td className="p-3">
                        {supplier.performance ? (
                          <div className="flex items-center gap-2">
                            <TrendingUp size={16} className="text-green-600" />
                            <span className="text-sm">
                              {supplier.performance.on_time_percentage.toFixed(1)}% on-time
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No data</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/suppliers/${supplier.id}/edit`}
                            className="p-2 hover:bg-primary-50 rounded-lg transition-all duration-200 hover:text-primary-600"
                          >
                            <Edit size={18} />
                          </Link>
                          <button
                            onClick={() => handleDelete(supplier.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 hover:text-red-600"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

