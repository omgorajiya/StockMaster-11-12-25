import { api } from './api';

export interface ABCAnalysis {
  products: Array<{
    product_id: number;
    product_name: string;
    sku: string;
    category: string | null;
    stock_quantity: number;
    unit_price: number;
    total_value: number;
    classification: 'A' | 'B' | 'C';
  }>;
  summary: {
    total_products: number;
    total_value: number;
    class_a_count: number;
    class_b_count: number;
    class_c_count: number;
  };
}

export interface InventoryTurnover {
  turnover_ratio: number;
  cogs: number;
  average_inventory: number;
  period_months: number;
  start_date: string;
  end_date: string;
}

export interface AnalyticsDashboard {
  abc_analysis: {
    class_a: { count: number; value: number; percentage: number };
    class_b: { count: number; value: number; percentage: number };
    class_c: { count: number; value: number; percentage: number };
  };
  inventory_turnover: {
    ratio: number;
    cogs: number;
    average_inventory: number;
  };
  dead_stock: {
    product_count: number;
    total_value: number;
  };
  total_inventory_value: number;
}

export interface ReplenishmentSuggestion {
  product_id: number;
  product_name: string;
  sku: string;
  warehouse_id: number;
  current_stock: number;
  avg_daily_demand: number;
  suggested_quantity: number;
  reorder_level: number;
  reorder_quantity: number;
  last_delivery_at: string | null;
  days_until_stockout: number | null;
}

export interface ServiceLevelMetrics {
  overall: {
    total_deliveries: number;
    completed_deliveries: number;
    on_time_rate: number;
    avg_lead_time_hours: number;
    fill_rate: number;
    shipped_units: number;
    open_units: number;
  };
  warehouses: Array<{
    warehouse_id: number;
    warehouse_name: string;
    total_deliveries: number;
    on_time_rate: number;
    done_deliveries: number;
  }>;
  trend: Array<{
    date: string;
    on_time_rate: number;
    avg_lead_time_hours: number;
  }>;
}

export interface AbcXyzMatrix {
  matrix: Record<
    string,
    {
      count: number;
      sample_products: Array<{ id: number; name: string; sku: string }>;
    }
  >;
  summary: {
    total_products: number;
    months_analyzed: number;
  };
}

export const analyticsService = {
  async getABCAnalysis(): Promise<ABCAnalysis> {
    const response = await api.get('/dashboard/abc-analysis/');
    return response.data;
  },

  async getInventoryTurnover(months: number = 12): Promise<InventoryTurnover> {
    const response = await api.get(`/dashboard/inventory-turnover/?months=${months}`);
    return response.data;
  },

  async getAnalyticsDashboard(): Promise<AnalyticsDashboard> {
    const response = await api.get('/dashboard/analytics/');
    return response.data;
  },

  async getReplenishmentSuggestions(): Promise<{ results: ReplenishmentSuggestion[]; count: number }> {
    const response = await api.get('/dashboard/analytics/replenishment/');
    return response.data;
  },

  async getServiceLevels(): Promise<ServiceLevelMetrics> {
    const response = await api.get('/dashboard/analytics/service-levels/');
    return response.data;
  },

  async getAbcXyzMatrix(): Promise<AbcXyzMatrix> {
    const response = await api.get('/dashboard/analytics/abc-xyz/');
    return response.data;
  },
};

