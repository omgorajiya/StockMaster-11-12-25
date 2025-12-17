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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Audit Log</h1>
            <p className="text-gray-600 dark:text-gray-400">Trace validations, approvals, and key changes.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document type</label>
            <input
              type="text"
              value={filters.document_type}
              onChange={(e) => setFilters({ ...filters, document_type: e.target.value })}
              placeholder="receipt, deliveryorder..."
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document ID</label>
            <input
              type="number"
              value={filters.document_id}
              onChange={(e) => setFilters({ ...filters, document_id: e.target.value })}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2"
            />
          </div>
          <button
            onClick={() => loadLogs()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 text-white px-4 py-2 hover:bg-primary-700"
          >
            <Search size={16} /> Apply
          </button>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <ShieldCheck size={48} className="text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No audit entries found</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">Try adjusting your filters or check back later</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr className="text-left text-gray-600 dark:text-gray-300">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200">
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                        {log.document_type} #{log.document_id}
                      </td>
                      <td className="py-3 px-4 capitalize">{log.action}</td>
                      <td className="py-3 px-4">{log.user_email || 'System'}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{log.message || '--'}</td>
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

