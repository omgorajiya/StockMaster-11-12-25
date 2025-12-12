import api from './api';

export interface StockLedgerEntry {
  id: number;
  product: number;
  product_name?: string;
  product_sku?: string;
  warehouse: number;
  warehouse_name?: string;
  bin?: number | null;
  bin_code?: string;
  transaction_type: 'receipt' | 'delivery' | 'transfer_out' | 'transfer_in' | 'adjustment' | 'return';
  document_number: string;
  quantity: number;
  balance_after: number;
  reference?: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
}

export const ledgerService = {
  async getLedger(params?: {
    product?: number;
    warehouse?: number;
    transaction_type?: string;
    document_number?: string;
    page?: number;
  }): Promise<{ results: StockLedgerEntry[]; count: number }> {
    const response = await api.get('/operations/ledger/', { params });
    return response.data;
  },
};

