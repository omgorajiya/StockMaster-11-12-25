'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { integrationsService, WebhookConfig, IntegrationEvent } from '@/lib/integrations';
import { Plug, RefreshCw, Send, Trash2 } from 'lucide-react';
import { showToast } from '@/lib/toast';

export default function IntegrationsPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    secret: '',
    event_types: 'stock_change,receipt_completed',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [hooks, eventRes] = await Promise.all([
        integrationsService.listWebhooks(),
        integrationsService.listEvents({ status: 'failed' }),
      ]);
      setWebhooks(hooks);
      setEvents(eventRes.results.slice(0, 8));
    } catch (error) {
      console.error('Failed to load integrations', error);
      showToast.error('Unable to load integrations data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...formData,
        event_types: formData.event_types
          .split(',')
          .map((evt) => evt.trim())
          .filter(Boolean),
      };
      await integrationsService.createWebhook(payload);
      showToast.success('Webhook created');
      setFormData({ name: '', url: '', secret: '', event_types: 'stock_change' });
      loadData();
    } catch (error: any) {
      showToast.error(error.response?.data?.error || 'Failed to create webhook');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this webhook?')) return;
    await integrationsService.deleteWebhook(id);
    showToast.success('Webhook removed');
    loadData();
  };

  const handleTest = async (id: number) => {
    await integrationsService.triggerTest(id);
    showToast.success('Test event sent');
  };

  const handleResend = async (eventId: number) => {
    await integrationsService.resendEvent(eventId);
    showToast.success('Event resend queued');
    loadData();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Integrations</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage outbound webhooks and monitor delivery status
            </p>
          </div>
          <Plug size={32} className="text-primary-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">New Webhook</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2"
                  placeholder="ERP webhook"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2"
                  placeholder="https://example.com/webhook"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secret</label>
                <input
                  type="text"
                  required
                  value={formData.secret}
                  onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Event Types (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.event_types}
                  onChange={(e) => setFormData({ ...formData, event_types: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2"
                  placeholder="stock_change,receipt_completed"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-primary-600 text-white py-2 font-medium hover:bg-primary-700 transition"
              >
                {saving ? 'Saving...' : 'Create Webhook'}
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Existing Webhooks</h2>
              <button
                onClick={loadData}
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
              >
                <RefreshCw size={16} /> Refresh
              </button>
            </div>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : webhooks.length === 0 ? (
              <p className="text-gray-500">No webhooks configured yet.</p>
            ) : (
              <ul className="space-y-4">
                {webhooks.map((hook) => (
                  <li key={hook.id} className="rounded-lg border border-gray-100 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{hook.name}</p>
                        <p className="text-xs text-gray-500 break-all">{hook.url}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Listening for {hook.event_types.join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTest(hook.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-primary-200 px-3 py-1 text-sm text-primary-600 hover:bg-primary-50"
                        >
                          <Send size={14} /> Test
                        </button>
                        <button
                          onClick={() => handleDelete(hook.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Events</h2>
          </div>
          {events.length === 0 ? (
            <p className="text-gray-500">No webhook deliveries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
                    <th className="py-2 pr-4">Event</th>
                    <th className="py-2 pr-4">Webhook</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Response</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 pr-4">{event.event_type}</td>
                      <td className="py-2 pr-4">{event.webhook_name}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            event.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : event.status === 'sent'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {event.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{event.response_status_code || '--'}</td>
                      <td className="py-2">
                        {event.status === 'failed' && (
                          <button
                            onClick={() => handleResend(event.id)}
                            className="text-primary-600 hover:text-primary-700 text-sm"
                          >
                            Resend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

