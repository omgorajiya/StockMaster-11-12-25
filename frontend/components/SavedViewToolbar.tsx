'use client';

import { useEffect, useState } from 'react';
import { operationsService, SavedView } from '@/lib/operations';
import { Save as SaveIcon, Trash2 } from 'lucide-react';
import { showToast } from '@/lib/toast';

interface SavedViewToolbarProps {
  pageKey: string;
  currentFilters: Record<string, string | number | null | undefined>;
  onApply: (filters: Record<string, any>) => void;
  helperText?: string;
  className?: string;
}

export default function SavedViewToolbar({
  pageKey,
  currentFilters,
  onApply,
  helperText = 'Saved views remember the current filter selections for quick recall.',
  className = '',
}: SavedViewToolbarProps) {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [viewName, setViewName] = useState('');
  const [selectedViewId, setSelectedViewId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadSavedViews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  const loadSavedViews = async () => {
    try {
      setLoading(true);
      const views = await operationsService.getSavedViewsByPage(pageKey);
      setSavedViews(views);
      if (views.length === 0) {
        setSelectedViewId('');
      }
    } catch (error) {
      console.error('Failed to load saved views:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!viewName.trim()) {
      showToast.error('Enter a name for the view');
      return;
    }
    try {
      await operationsService.createSavedView({
        page_key: pageKey,
        name: viewName.trim(),
        filters: currentFilters,
      });
      showToast.success('View saved');
      setViewName('');
      loadSavedViews();
    } catch (error: any) {
      showToast.error(error.response?.data?.detail || 'Failed to save view');
    }
  };

  const handleApply = (viewId: number) => {
    const view = savedViews.find((item) => item.id === viewId);
    if (!view) return;
    onApply(view.filters || {});
    setSelectedViewId(view.id);
    showToast.success(`Applied "${view.name}"`);
  };

  const handleDelete = async (viewId: number) => {
    try {
      await operationsService.deleteSavedView(viewId);
      if (selectedViewId === viewId) {
        setSelectedViewId('');
      }
      showToast.success('Saved view removed');
      loadSavedViews();
    } catch (error: any) {
      showToast.error(error.response?.data?.detail || 'Failed to delete view');
    }
  };

  return (
    <div className={`border border-gray-100 dark:border-gray-800 rounded-xl p-4 bg-gray-50/70 dark:bg-gray-900/30 ${className}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Save current filters as a view
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="e.g. Ready orders for WH-01"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 text-white px-4 py-2 hover:bg-primary-700 transition disabled:opacity-60"
            >
              <SaveIcon size={16} />
              Save
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Apply an existing view
          </label>
          <div className="flex gap-2">
            <select
              value={selectedViewId}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) {
                  setSelectedViewId('');
                  return;
                }
                handleApply(Number(value));
              }}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900"
            >
              <option value="">Choose a saved view</option>
              {savedViews.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => selectedViewId && handleDelete(Number(selectedViewId))}
              disabled={!selectedViewId}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 disabled:opacity-60"
            >
              <Trash2 size={16} />
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


