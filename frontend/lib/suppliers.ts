import { api } from './api';

export interface Supplier {
  id: number;
  name: string;
  code: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  payment_terms: string;
  lead_time_days: number;
  is_active: boolean;
  performance?: {
    order_count: number;
    on_time_percentage: number;
    quality_score: number;
    average_lead_time_days: number;
  };
}

export interface ProductSupplier {
  id: number;
  product: number;
  supplier: number;
  supplier_name: string;
  supplier_code: string;
  product_name: string;
  product_sku: string;
  unit_price: string;
  minimum_order_quantity: string;
  is_preferred: boolean;
  notes: string;
}

export const supplierService = {
  async getAll(): Promise<Supplier[]> {
    const response = await api.get('/products/suppliers/');
    return response.data.results || response.data;
  },

  async getById(id: number): Promise<Supplier> {
    const response = await api.get(`/products/suppliers/${id}/`);
    return response.data;
  },

  async create(data: Partial<Supplier>): Promise<Supplier> {
    const response = await api.post('/products/suppliers/', data);
    return response.data;
  },

  async update(id: number, data: Partial<Supplier>): Promise<Supplier> {
    const response = await api.patch(`/products/suppliers/${id}/`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/products/suppliers/${id}/`);
  },

  async getProducts(id: number): Promise<ProductSupplier[]> {
    const response = await api.get(`/products/suppliers/${id}/products/`);
    return response.data;
  },

  async getProductSuppliers(productId: number): Promise<ProductSupplier[]> {
    const response = await api.get(
      `/products/product-suppliers/by_product/?product_id=${productId}`
    );
    return response.data;
  },

  async getBestSupplier(productId: number): Promise<ProductSupplier> {
    const response = await api.get(
      `/products/product-suppliers/best_supplier/?product_id=${productId}`
    );
    return response.data;
  },

  async createProductSupplier(data: Partial<ProductSupplier>): Promise<ProductSupplier> {
    const response = await api.post('/products/product-suppliers/', data);
    return response.data;
  },

  async updateProductSupplier(
    id: number,
    data: Partial<ProductSupplier>
  ): Promise<ProductSupplier> {
    const response = await api.patch(`/products/product-suppliers/${id}/`, data);
    return response.data;
  },
};

