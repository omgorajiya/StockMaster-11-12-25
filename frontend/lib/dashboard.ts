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

export interface MovementValueTrend {
  date: string;
  receipts_value: number;
  deliveries_value: number;
  transfers_value: number;
  receipts_status?: {
    draft: number;
    waiting: number;
    ready: number;
    done: number;
    canceled: number;
  };
  deliveries_status?: {
    draft: number;
    waiting: number;
    ready: number;
    done: number;
    canceled: number;
  };
  transfers_status?: {
    draft: number;
    waiting: number;
    ready: number;
    done: number;
    canceled: number;
  };
}

export interface MovementValueTrendResponse {
  trend: MovementValueTrend[];
  period_days: number;
  start_date: string;
  end_date: string;
  has_status_breakdown?: boolean;
}

export interface InventoryValueByHealth {
  healthy: {
    value: number;
    count: number;
  };
  low_stock: {
    value: number;
    count: number;
  };
  out_of_stock: {
    value: number;
    count: number;
  };
  total_value: number;
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

  async getMovementValueTrend(days: number = 30, warehouseId?: number, includeStatus: boolean = true): Promise<MovementValueTrendResponse> {
    const params: any = { days, include_status: includeStatus };
    if (warehouseId) {
      params.warehouse_id = warehouseId;
    }
    const response = await api.get('/dashboard/movement-value-trend/', { params });
    return response.data;
  },

  async getInventoryValueByHealth(warehouseId?: number): Promise<InventoryValueByHealth> {
    const params: any = {};
    if (warehouseId) {
      params.warehouse_id = warehouseId;
    }
    const response = await api.get('/dashboard/value-by-health/', { params });
    return response.data;
  },
};

