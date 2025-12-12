'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { ledgerService, StockLedgerEntry } from '@/lib/ledger';
import { productService, Warehouse } from '@/lib/products';
import { Filter, Search, History } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/useDebounce';

export default function HistoryPage() {
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    transaction_type: '',
    warehouse: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 500);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const data = await productService.getWarehouses();
        setWarehouses(data);
      } catch (error) {
        console.error('Failed to load warehouses:', error);
      }
    };
    loadWarehouses();
  }, []);

  useEffect(() => {
    loadLedger();
  }, [filters, debouncedSearch]);

  const loadLedger = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.transaction_type) params.transaction_type = filters.transaction_type;
      if (filters.warehouse) params.warehouse = parseInt(filters.warehouse);
      if (debouncedSearch) params.search = debouncedSearch;
      
      const data = await ledgerService.getLedger(params);
      setLedger(data.results || data);
    } catch (error) {
      console.error('Failed to load ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'receipt':
        return 'bg-green-100 text-green-800';
      case 'delivery':
        return 'bg-red-100 text-red-800';
      case 'transfer_out':
        return 'bg-yellow-100 text-yellow-800';
      case 'transfer_in':
        return 'bg-blue-100 text-blue-800';
      case 'adjustment':
        return 'bg-purple-100 text-purple-800';
      case 'return':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Move History</h1>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="flex items-center gap-4 mb-4">
            <Filter size={20} className="text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Transaction Type
              </label>
              <select
                value={filters.transaction_type}
                onChange={(e) => setFilters({ ...filters, transaction_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-transparent dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Types</option>
                <option value="receipt">Receipt</option>
                <option value="delivery">Delivery</option>
                <option value="transfer_out">Transfer Out</option>
                <option value="transfer_in">Transfer In</option>
                <option value="adjustment">Adjustment</option>
                <option value="return">Return</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Warehouse
              </label>
              <select
                value={filters.warehouse}
                onChange={(e) => setFilters({ ...filters, warehouse: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-transparent dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by document number, SKU..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ transaction_type: '', warehouse: '' });
                  setSearchInput('');
                }}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 hover:shadow-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Type</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Product</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Warehouse</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Bin</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Document #</th>
                    <th className="text-right p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Quantity</th>
                    <th className="text-right p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Balance</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center p-12">
                        <div className="flex flex-col items-center gap-3">
                          <History size={48} className="text-gray-400" />
                          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No ledger entries found</p>
                          <p className="text-gray-400 dark:text-gray-500 text-sm">Stock movement history will appear here</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    ledger.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm transition-all duration-200"
                      >
                        <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 text-xs rounded font-medium ${getTransactionTypeColor(
                              entry.transaction_type
                            )}`}
                          >
                            {entry.transaction_type.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{entry.product_name}</p>
                            <p className="text-xs text-gray-500">{entry.product_sku}</p>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{entry.warehouse_name}</td>
                        <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{entry.bin_code || '-'}</td>
                        <td className="p-4 text-sm font-mono text-gray-700 dark:text-gray-300">{entry.document_number}</td>
                        <td className={`p-4 text-sm text-right font-medium ${
                          entry.quantity >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {entry.quantity >= 0 ? '+' : ''}{entry.quantity}
                        </td>
                        <td className="p-4 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                          {entry.balance_after}
                        </td>
                        <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{entry.reference || '-'}</td>
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

