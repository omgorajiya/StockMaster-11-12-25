import api from './api';

export type DocumentStatus = 'draft' | 'waiting' | 'ready' | 'done' | 'canceled';

export interface Receipt {
  id: number;
  document_number: string;
  status: DocumentStatus;
  warehouse: number;
  warehouse_name?: string;
  supplier: string;
  supplier_reference?: string;
  created_by: number;
  created_by_name?: string;
  notes?: string;
  items?: ReceiptItem[];
  created_at: string;
  updated_at: string;
}

export interface ReceiptItem {
  id?: number;
  product: number;
  product_name?: string;
  product_sku?: string;
  bin?: number | null;
  bin_code?: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price?: number;
  unit_of_measure?: 'stock' | 'purchase';
}

export interface DeliveryOrder {
  id: number;
  document_number: string;
  status: DocumentStatus;
  warehouse: number;
  warehouse_name?: string;
  customer: string;
  customer_reference?: string;
  shipping_address?: string;
  created_by: number;
  created_by_name?: string;
  notes?: string;
  items?: DeliveryItem[];
  created_at: string;
  updated_at: string;
}

export interface DeliveryItem {
  id?: number;
  product: number;
  product_name?: string;
  product_sku?: string;
  bin?: number | null;
  bin_code?: string;
  quantity: number;
  unit_of_measure?: 'stock' | 'purchase';
}

export interface ReturnItem {
  id?: number;
  return_order: number;
  product: number;
  product_name?: string;
  product_sku?: string;
  quantity: number;
  reason_code?: string;
}

export interface ReturnOrder {
  id: number;
  document_number: string;
  status: DocumentStatus;
  warehouse: number;
  warehouse_name?: string;
  created_by: number;
  created_by_name?: string;
  delivery_order?: number | null;
  delivery_document_number?: string | null;
  reason?: string;
  disposition: 'restock' | 'scrap' | 'repair';
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  items?: ReturnItem[];
}

export interface InternalTransfer {
  id: number;
  document_number: string;
  status: DocumentStatus;
  warehouse: number;
  warehouse_name?: string;
  to_warehouse: number;
  to_warehouse_name?: string;
  created_by: number;
  created_by_name?: string;
  notes?: string;
  items?: TransferItem[];
  created_at: string;
  updated_at: string;
}

export interface TransferItem {
  id?: number;
  product: number;
  product_name?: string;
  product_sku?: string;
  bin?: number | null;
  bin_code?: string;
  quantity: number;
  unit_of_measure?: 'stock' | 'purchase';
}

export interface StockAdjustment {
  id: number;
  document_number: string;
  status: DocumentStatus;
  warehouse: number;
  warehouse_name?: string;
  reason: string;
  adjustment_type: 'increase' | 'decrease' | 'set';
  created_by: number;
  created_by_name?: string;
  notes?: string;
  items?: AdjustmentItem[];
  created_at: string;
  updated_at: string;
}

export interface AdjustmentItem {
  id?: number;
  product: number;
  product_name?: string;
  product_sku?: string;
  current_quantity: number;
  adjustment_quantity: number;
  reason?: string;
  unit_of_measure?: 'stock' | 'purchase';
}

export interface CycleCountItem {
  id: number;
  task: number;
  product: number;
  product_name?: string;
  product_sku?: string;
  expected_quantity: number;
  counted_quantity: number;
  variance: number;
}

export interface CycleCountTask {
  id: number;
  document_number: string;
  status: DocumentStatus;
  warehouse: number;
  warehouse_name?: string;
  created_by: number;
  created_by_name?: string;
  scheduled_date?: string;
  method: 'full' | 'partial' | 'abc';
  notes?: string;
  generated_adjustment?: number | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  items?: CycleCountItem[];
}

export interface PickWave {
  id: number;
  name: string;
  status: 'planned' | 'picking' | 'completed' | 'canceled';
  warehouse: number;
  warehouse_name?: string;
  delivery_order_count: number;
  assigned_picker?: number;
  assigned_picker_name?: string;
  created_by: number;
  created_by_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface Approval {
  id: number;
  document_type: string;
  document_id: number;
  approver: number;
  approver_name?: string;
  approved_at: string;
  notes?: string;
}

export interface DocumentComment {
  id: number;
  document_type: string;
  document_id: number;
  author: number;
  author_name?: string;
  message: string;
  created_at: string;
}

export interface DocumentAttachment {
  id: number;
  document_type: string;
  document_id: number;
  uploaded_by: number;
  uploaded_by_name?: string;
  file_name: string;
  file_path: string;
  file_url?: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface SavedView {
  id: number;
  user: number;
  page_key: string;
  name: string;
  filters: any;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: number;
  document_type: string;
  document_id: number;
  action: string;
  user?: number;
  user_email?: string;
  message?: string;
  before_data?: Record<string, any>;
  after_data?: Record<string, any>;
  created_at: string;
}

export const operationsService = {
  // Receipts
  async getReceipts(params?: {
    status?: DocumentStatus;
    warehouse?: number;
    search?: string;
    page?: number;
  }): Promise<{ results: Receipt[]; count: number }> {
    const response = await api.get('/operations/receipts/', { params });
    return response.data;
  },

  async getReceipt(id: number): Promise<Receipt> {
    const response = await api.get(`/operations/receipts/${id}/`);
    return response.data;
  },

  async createReceipt(data: Partial<Receipt>): Promise<Receipt> {
    const response = await api.post('/operations/receipts/', data);
    return response.data;
  },

  async validateReceipt(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/operations/receipts/${id}/validate/`);
    return response.data;
  },

  // Deliveries
  async getDeliveries(params?: {
    status?: DocumentStatus;
    warehouse?: number;
    search?: string;
    page?: number;
  }): Promise<{ results: DeliveryOrder[]; count: number }> {
    const response = await api.get('/operations/deliveries/', { params });
    return response.data;
  },

  async getDelivery(id: number): Promise<DeliveryOrder> {
    const response = await api.get(`/operations/deliveries/${id}/`);
    return response.data;
  },

  async createDelivery(data: Partial<DeliveryOrder>): Promise<DeliveryOrder> {
    const response = await api.post('/operations/deliveries/', data);
    return response.data;
  },

  async validateDelivery(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/operations/deliveries/${id}/validate/`);
    return response.data;
  },

  // Transfers
  async getTransfers(params?: {
    status?: DocumentStatus;
    warehouse?: number;
    search?: string;
    page?: number;
  }): Promise<{ results: InternalTransfer[]; count: number }> {
    const response = await api.get('/operations/transfers/', { params });
    return response.data;
  },

  async getTransfer(id: number): Promise<InternalTransfer> {
    const response = await api.get(`/operations/transfers/${id}/`);
    return response.data;
  },

  async createTransfer(data: Partial<InternalTransfer>): Promise<InternalTransfer> {
    const response = await api.post('/operations/transfers/', data);
    return response.data;
  },

  async validateTransfer(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/operations/transfers/${id}/validate/`);
    return response.data;
  },

  // Returns
  async getReturns(params?: {
    status?: DocumentStatus;
    warehouse?: number;
    search?: string;
    page?: number;
  }): Promise<{ results: ReturnOrder[]; count: number }> {
    const response = await api.get('/operations/returns/', { params });
    return response.data;
  },

  async getReturn(id: number): Promise<ReturnOrder> {
    const response = await api.get(`/operations/returns/${id}/`);
    return response.data;
  },

  async createReturn(data: Partial<ReturnOrder> & { items: Array<{ product: number; quantity: number; reason_code?: string }> }): Promise<ReturnOrder> {
    const response = await api.post('/operations/returns/', data);
    return response.data;
  },

  async validateReturn(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/operations/returns/${id}/validate/`);
    return response.data;
  },

  // Adjustments
  async getAdjustments(params?: {
    status?: DocumentStatus;
    warehouse?: number;
    search?: string;
    page?: number;
  }): Promise<{ results: StockAdjustment[]; count: number }> {
    const response = await api.get('/operations/adjustments/', { params });
    return response.data;
  },

  async getAdjustment(id: number): Promise<StockAdjustment> {
    const response = await api.get(`/operations/adjustments/${id}/`);
    return response.data;
  },

  async createAdjustment(data: Partial<StockAdjustment>): Promise<StockAdjustment> {
    const response = await api.post('/operations/adjustments/', data);
    return response.data;
  },

  async validateAdjustment(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/operations/adjustments/${id}/validate/`);
    return response.data;
  },

  // Cycle counts
  async getCycleCounts(params?: {
    status?: DocumentStatus;
    warehouse?: number;
    scheduled_date?: string;
    page?: number;
  }): Promise<{ results: CycleCountTask[]; count: number }> {
    const response = await api.get('/operations/cycle-counts/', { params });
    return response.data;
  },

  async getCycleCount(id: number): Promise<CycleCountTask> {
    const response = await api.get(`/operations/cycle-counts/${id}/`);
    return response.data;
  },

  async createCycleCount(data: {
    warehouse: number;
    scheduled_date?: string;
    method: 'full' | 'partial' | 'abc';
    notes?: string;
    items: number[]; // product IDs
  }): Promise<CycleCountTask> {
    const response = await api.post('/operations/cycle-counts/', data);
    return response.data;
  },

  async startCycleCount(id: number): Promise<{ success: boolean; status: DocumentStatus }> {
    const response = await api.post(`/operations/cycle-counts/${id}/start/`);
    return response.data;
  },

  async completeCycleCount(id: number): Promise<{
    success: boolean;
    message: string;
    adjustment_id?: number;
    adjustment_document_number?: string;
  }> {
    const response = await api.post(`/operations/cycle-counts/${id}/complete/`);
    return response.data;
  },

  async updateCycleCountItems(
    id: number,
    items: { id: number; counted_quantity: number }[],
  ): Promise<{ success: boolean; updated_items?: number }> {
    const response = await api.post(`/operations/cycle-counts/${id}/update_counts/`, { items });
    return response.data;
  },

  // Pick Waves
  async getPickWaves(params?: {
    status?: string;
    warehouse?: number;
    search?: string;
    page?: number;
  }): Promise<{ results: PickWave[]; count: number }> {
    const response = await api.get('/operations/pick-waves/', { params });
    return response.data;
  },

  async getPickWave(id: number): Promise<PickWave> {
    const response = await api.get(`/operations/pick-waves/${id}/`);
    return response.data;
  },

  async createPickWave(data: Partial<PickWave> & { delivery_orders?: number[] }): Promise<PickWave> {
    const response = await api.post('/operations/pick-waves/', data);
    return response.data;
  },

  async startPickWave(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/operations/pick-waves/${id}/start_picking/`);
    return response.data;
  },

  async completePickWave(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/operations/pick-waves/${id}/complete_picking/`);
    return response.data;
  },

  async generatePickWave(data: {
    name?: string;
    warehouse?: number;
    date_from?: string;
    date_to?: string;
    status?: string;
  }): Promise<{ success: boolean; pick_wave: PickWave }> {
    const response = await api.post(`/operations/pick-waves/generate_wave/`, data);
    return response.data;
  },

  // Approvals
  async getApprovals(params?: {
    document_type?: string;
    document_id?: number;
    approver?: number;
  }): Promise<{ results: Approval[]; count: number }> {
    const response = await api.get('/operations/approvals/', { params });
    return response.data;
  },

  async createApproval(data: Partial<Approval>): Promise<Approval> {
    const response = await api.post('/operations/approvals/', data);
    return response.data;
  },

  // Comments
  async getComments(params?: {
    document_type?: string;
    document_id?: number;
    author?: number;
  }): Promise<{ results: DocumentComment[]; count: number }> {
    const response = await api.get('/operations/comments/', { params });
    return response.data;
  },

  async createComment(data: Partial<DocumentComment>): Promise<DocumentComment> {
    const response = await api.post('/operations/comments/', data);
    return response.data;
  },

  // Attachments
  async getAttachments(params?: {
    document_type?: string;
    document_id?: number;
    uploaded_by?: number;
  }): Promise<{ results: DocumentAttachment[]; count: number }> {
    const response = await api.get('/operations/attachments/', { params });
    return response.data;
  },

  async createAttachment(data: {
    document_type: string;
    document_id: number;
    file: File;
  }): Promise<DocumentAttachment> {
    const formData = new FormData();
    formData.append('document_type', data.document_type);
    formData.append('document_id', String(data.document_id));
    formData.append('file', data.file);

    const response = await api.post('/operations/attachments/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Saved Views
  async getSavedViews(params?: {
    page_key?: string;
  }): Promise<{ results: SavedView[]; count: number }> {
    const response = await api.get('/operations/saved-views/', { params });
    return response.data;
  },

  async getSavedViewsByPage(page_key: string): Promise<SavedView[]> {
    const response = await api.get('/operations/saved-views/by_page/', { params: { page_key } });
    return response.data;
  },

  async createSavedView(data: Partial<SavedView>): Promise<SavedView> {
    const response = await api.post('/operations/saved-views/', data);
    return response.data;
  },

  async updateSavedView(id: number, data: Partial<SavedView>): Promise<SavedView> {
    const response = await api.patch(`/operations/saved-views/${id}/`, data);
    return response.data;
  },

  async deleteSavedView(id: number): Promise<void> {
    await api.delete(`/operations/saved-views/${id}/`);
  },

  async getAuditLogs(params?: {
    document_type?: string;
    document_id?: number;
    action?: string;
    user?: number;
  }): Promise<{ results: AuditLogEntry[]; count: number }> {
    const response = await api.get('/operations/audit-logs/', { params });
    return response.data;
  },
};

