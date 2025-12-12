import api from './api';

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  address?: string;
  is_active: boolean;
  is_quarantine?: boolean;
}

export interface UnitOfMeasure {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  code?: string;
  category?: number;
  category_name?: string;
  stock_unit: number;
  stock_unit_detail?: UnitOfMeasure;
  purchase_unit?: number | null;
  purchase_unit_detail?: UnitOfMeasure | null;
  unit_conversion_factor: number;
  description?: string;
  reorder_level: number;
  reorder_quantity: number;
  is_active: boolean;
  total_stock?: number;
  is_low_stock?: boolean;
  stock_items?: StockItem[];
  default_bin?: number | null;
}

export interface StockItem {
  id: number;
  product: number;
  product_name?: string;
  product_sku?: string;
  warehouse: number;
  warehouse_name?: string;
  warehouse_code?: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity?: number;
}

export interface BinLocation {
  id: number;
  warehouse: number;
  warehouse_name?: string;
  warehouse_code?: string;
  code: string;
  description?: string;
  is_active: boolean;
}

export const productService = {
  async getCategories(): Promise<Category[]> {
    const response = await api.get('/products/categories/');
    return response.data.results || response.data;
  },

  async getWarehouses(): Promise<Warehouse[]> {
    const response = await api.get('/products/warehouses/');
    return response.data.results || response.data;
  },

  async getBinLocations(params?: { warehouse?: number }): Promise<BinLocation[]> {
    const response = await api.get('/products/bin-locations/', { params });
    return response.data.results || response.data;
  },

  async getProducts(params?: {
    category?: number;
    search?: string;
    page?: number;
  }): Promise<{ results: Product[]; count: number }> {
    const response = await api.get('/products/products/', { params });
    return response.data;
  },

  async getProduct(id: number): Promise<Product> {
    const response = await api.get(`/products/products/${id}/`);
    return response.data;
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    const response = await api.post('/products/products/', data);
    return response.data;
  },

  async updateProduct(id: number, data: Partial<Product>): Promise<Product> {
    const response = await api.patch(`/products/products/${id}/`, data);
    return response.data;
  },

  async getLowStockProducts(): Promise<Product[]> {
    const response = await api.get('/products/products/low_stock/');
    return response.data;
  },

  async getStockByWarehouse(productId: number, warehouseId?: number): Promise<any> {
    const params = warehouseId ? { warehouse_id: warehouseId } : {};
    const response = await api.get(`/products/products/${productId}/stock_by_warehouse/`, { params });
    return response.data;
  },

  async createWarehouse(data: Partial<Warehouse>): Promise<Warehouse> {
    const response = await api.post('/products/warehouses/', data);
    return response.data;
  },

  async updateWarehouse(id: number, data: Partial<Warehouse>): Promise<Warehouse> {
    const response = await api.patch(`/products/warehouses/${id}/`, data);
    return response.data;
  },

  async deleteWarehouse(id: number): Promise<void> {
    await api.delete(`/products/warehouses/${id}/`);
  },

  async getUnits(): Promise<UnitOfMeasure[]> {
    const response = await api.get('/products/units/');
    return response.data.results || response.data;
  },

  async lookupProduct(params: { barcode?: string; sku?: string }): Promise<Product> {
    const response = await api.get('/products/products/lookup/', { params });
    return response.data;
  },
};

