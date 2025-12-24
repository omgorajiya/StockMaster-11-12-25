'use client';

import { useEffect, useState } from 'react';
import { operationsService, AuditLogEntry } from '@/lib/operations';
import { Search, ShieldCheck } from 'lucide-react';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ document_type: '', document_id: '' });

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async (override?: Partial<typeof filters>) => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {};
      const combined = { ...filters, ...override };
      if (combined.document_type) params.document_type = combined.document_type;
      if (combined.document_id) params.document_id = Number(combined.document_id);
      const response = await operationsService.getAuditLogs(params);
      setLogs(response.results.slice(0, 50));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <ShieldCheck size={28} className="text-primary-600 dark:text-primary-400" />
              </div>
              Audit Log
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Trace validations, approvals, and key changes across all operations</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-4 sm:p-6 hover-lift">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Search size={18} className="text-primary-600 dark:text-primary-400" />
            Filter Audit Logs
          </h2>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Document type</label>
              <input
                type="text"
                value={filters.document_type}
                onChange={(e) => setFilters({ ...filters, document_type: e.target.value })}
                placeholder="e.g., receipt, deliveryorder..."
                className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Document ID</label>
              <input
                type="number"
                value={filters.document_id}
                onChange={(e) => setFilters({ ...filters, document_id: e.target.value })}
                placeholder="Enter document ID..."
                className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              />
            </div>
            <button
              onClick={() => loadLogs()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-2.5 hover:from-primary-700 hover:to-primary-800 hover:shadow-xl hover:shadow-primary-600/30 transition-all duration-300 hover:scale-105 active:scale-95 font-semibold"
            >
              <Search size={18} /> Apply Filters
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 hover-lift overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 py-12">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600"></div>
                <ShieldCheck size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-600" />
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 animate-pulse">Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <ShieldCheck size={48} className="text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No audit entries found</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">Try adjusting your filters or check back later</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full text-sm">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 sticky top-0">
                  <tr className="text-left text-gray-700 dark:text-gray-300">
                    <th className="py-3 sm:py-4 px-3 sm:px-4 font-semibold">Timestamp</th>
                    <th className="py-3 sm:py-4 px-3 sm:px-4 font-semibold">Document</th>
                    <th className="py-3 sm:py-4 px-3 sm:px-4 font-semibold">Action</th>
                    <th className="py-3 sm:py-4 px-3 sm:px-4 font-semibold">User</th>
                    <th className="py-3 sm:py-4 px-3 sm:px-4 font-semibold">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => {
                    const actionColor = log.action === 'validated' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : log.action === 'approved'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : log.action === 'rejected'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
                    
                    return (
                      <tr 
                        key={log.id} 
                        className="border-b border-gray-200 dark:border-gray-800 hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-blue-50/50 dark:hover:from-primary-900/10 dark:hover:to-blue-900/10 transition-all duration-200 group"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">
                          <span className="inline-flex items-center gap-1">
                            <span className="capitalize">{log.document_type}</span>
                            <span className="text-gray-400 dark:text-gray-500">#{log.document_id}</span>
                          </span>
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${actionColor}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-gray-700 dark:text-gray-300">
                          {log.user_email || <span className="italic text-gray-500 dark:text-gray-400">System</span>}
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-gray-600 dark:text-gray-300 max-w-md truncate">
                          {log.message || <span className="text-gray-400">--</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

