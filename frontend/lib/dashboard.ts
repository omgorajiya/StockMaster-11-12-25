import api from './api';

export interface DashboardKPIs {
  total_products: number;
  low_stock_items: number;
  out_of_stock_items: number;
  pending_receipts: number;
  pending_deliveries: number;
  scheduled_transfers: number;
}

export interface RecentActivity {
  type: 'receipt' | 'delivery' | 'transfer';
  document_number: string;
  status: string;
  warehouse?: string;
  from_warehouse?: string;
  to_warehouse?: string;
  created_at: string;
}

export interface LowStockProduct {
  id: number;
  name: string;
  sku: string;
  category?: string;
  current_stock: number;
  reorder_level: number;
  reorder_quantity: number;
}

export const dashboardService = {
  async getKPIs(): Promise<DashboardKPIs> {
    const response = await api.get('/dashboard/kpis/');
    return response.data;
  },

  async getRecentActivities(limit: number = 10): Promise<RecentActivity[]> {
    const response = await api.get('/dashboard/recent-activities/', {
      params: { limit },
    });
    return response.data;
  },

  async getLowStockProducts(): Promise<LowStockProduct[]> {
    const response = await api.get('/dashboard/low-stock/');
    return response.data;
  },
};

