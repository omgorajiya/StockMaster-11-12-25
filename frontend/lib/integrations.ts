import { api } from './api';

export interface WebhookConfig {
  id: number;
  name: string;
  url: string;
  secret: string;
  is_active: boolean;
  event_types: string[];
  created_at: string;
  updated_at: string;
  created_by?: number;
  created_by_name?: string;
}

export interface IntegrationEvent {
  id: number;
  webhook: number;
  webhook_name: string;
  event_type: string;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  payload: Record<string, any>;
  response_status_code?: number;
  response_body?: string;
  retry_count: number;
  created_at: string;
  sent_at?: string;
}

export const integrationsService = {
  async listWebhooks(): Promise<WebhookConfig[]> {
    const response = await api.get('/integrations/webhooks/');
    return response.data.results || response.data;
  },

  async createWebhook(data: Partial<WebhookConfig>): Promise<WebhookConfig> {
    const response = await api.post('/integrations/webhooks/', data);
    return response.data;
  },

  async updateWebhook(id: number, data: Partial<WebhookConfig>): Promise<WebhookConfig> {
    const response = await api.patch(`/integrations/webhooks/${id}/`, data);
    return response.data;
  },

  async deleteWebhook(id: number): Promise<void> {
    await api.delete(`/integrations/webhooks/${id}/`);
  },

  async triggerTest(id: number): Promise<void> {
    await api.post(`/integrations/webhooks/${id}/test/`);
  },

  async listEvents(params?: { status?: string; event_type?: string }): Promise<{ results: IntegrationEvent[]; count: number }> {
    const response = await api.get('/integrations/events/', { params });
    return response.data;
  },

  async resendEvent(id: number): Promise<{ success: boolean; message: string; job?: any }> {
    const response = await api.post(`/integrations/events/${id}/resend/`);
    return response.data;
  },
};

