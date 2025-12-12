'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { operationsService, CycleCountTask, CycleCountItem } from '@/lib/operations';
import { Save, CheckCircle, PlayCircle } from 'lucide-react';
import Link from 'next/link';

export default function CycleCountDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = parseInt(params.id as string, 10);
  const [task, setTask] = useState<CycleCountTask | null>(null);
  const [items, setItems] = useState<CycleCountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      setLoading(true);
      const data = await operationsService.getCycleCount(taskId);
      setTask(data);
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to load cycle count:', err);
      setError('Failed to load cycle count');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!task) return;
    try {
      setSaving(true);
      await operationsService.startCycleCount(task.id);
      await loadTask();
    } catch (err) {
      console.error('Failed to start cycle count:', err);
      setError('Failed to start cycle count');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!task) return;
    try {
      setSaving(true);
      const result = await operationsService.completeCycleCount(task.id);
      if (result.success) {
        setSuccess(result.message || 'Cycle count completed');
        const { showToast } = await import('@/lib/toast');
        showToast.success('Cycle count completed');
        await loadTask();
      } else {
        setError(result.message || 'Failed to complete cycle count');
      }
    } catch (err) {
      console.error('Failed to complete cycle count:', err);
      setError('Failed to complete cycle count');
    } finally {
      setSaving(false);
    }
  };

  const updateItemCount = (id: number, value: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, counted_quantity: value, variance: value - item.expected_quantity } : item
      )
    );
  };

  const handleSaveCounts = async () => {
    if (!task) return;
    try {
      setSaving(true);
      setError('');
      const payloadItems = items.map((item) => ({
        id: item.id,
        counted_quantity: item.counted_quantity,
      }));
      await operationsService.updateCycleCountItems(task.id, payloadItems);
      const { showToast } = await import('@/lib/toast');
      showToast.success('Counts saved');
      await loadTask();
    } catch (err) {
      console.error('Failed to save counts:', err);
      setError('Failed to save counts');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !task) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  const hasDifferences = items.some((item) => item.variance !== 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cycle Count {task.document_number}</h1>
            <p className="text-sm text-gray-500 mt-1">Warehouse: {task.warehouse_name}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/cycle-counts"
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
            >
              Back
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">{success}</div>
        )}

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Status: {task.status}</p>
              {task.scheduled_date && (
                <p className="text-sm text-gray-600">
                  Scheduled: {new Date(task.scheduled_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {task.status === 'draft' && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleStart}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
                >
                  <PlayCircle size={18} />
                  Start Counting
                </button>
              )}
              {task.status === 'ready' && (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveCounts}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
                  >
                    <Save size={18} />
                    Save Counts
                  </button>
                  <button
                    type="button"
                    disabled={saving || !hasDifferences}
                    onClick={handleComplete}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
                  >
                    <CheckCircle size={18} />
                    Complete & Adjust
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-700">Product</th>
                  <th className="text-left p-3 font-medium text-gray-700">SKU</th>
                  <th className="text-right p-3 font-medium text-gray-700">Expected</th>
                  <th className="text-right p-3 font-medium text-gray-700">Counted</th>
                  <th className="text-right p-3 font-medium text-gray-700">Variance</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="p-3 text-gray-900">{item.product_name}</td>
                    <td className="p-3 text-gray-600">{item.product_sku}</td>
                    <td className="p-3 text-right text-gray-600">{item.expected_quantity}</td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        disabled={task.status !== 'ready'}
                        value={item.counted_quantity}
                        onChange={(e) =>
                          updateItemCount(item.id, parseFloat(e.target.value || '0') || 0)
                        }
                        className="w-28 px-2 py-1 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50"
                      />
                    </td>
                    <td
                      className={`p-3 text-right font-medium ${
                        item.variance === 0
                          ? 'text-gray-500'
                          : item.variance > 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {item.variance > 0 ? '+' : ''}
                      {item.variance}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
