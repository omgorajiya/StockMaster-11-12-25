import { api } from './api';

export interface Notification {
  id: number;
  user?: number;
  notification_type: string;
  priority: string;
  title: string;
  message: string;
  related_object_type?: string;
  related_object_id?: number;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationJobStatus {
  job_name: string;
  last_run_at?: string;
  next_run_at?: string;
  last_status: 'idle' | 'running' | 'success' | 'failed';
  last_duration_ms?: number;
  last_message?: string;
  triggered_by?: number;
  triggered_by_name?: string;
}

export const notificationService = {
  async getAll(): Promise<Notification[]> {
    const response = await api.get('/notifications/notifications/');
    return response.data.results || response.data;
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/notifications/unread_count/');
    return response.data.count || 0;
  },

  async markAsRead(id: number): Promise<void> {
    await api.post(`/notifications/notifications/${id}/mark_read/`);
  },

  async markAllAsRead(): Promise<void> {
    await api.post('/notifications/notifications/mark_all_read/');
  },

  async getJobs(): Promise<NotificationJobStatus[]> {
    const response = await api.get('/notifications/jobs/');
    return response.data.results || response.data;
  },

  async runJob(jobName: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/notifications/jobs/${jobName}/run/`);
    return response.data;
  },
};

