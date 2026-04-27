export type GSM = '230' | '260' | '320' | 'standard';

export interface Product {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  gsmPrices?: Record<string, number>;
  colors: string[];
  sizes: string[];
  mockupImage: string;
  studioImage?: string;
  agentId?: string;
  isApproved: boolean;
  description: string;
  colorImages?: Record<string, string>;
  colorStudioImages?: Record<string, string>;
  colorBlueprints?: Record<string, string>;
  gsmOptions?: string[];
  allowedColors?: string[];
}

export interface Agent {
  uid: string;
  name: string;
  momoNumber: string;
  referralCode: string;
  stats: {
    totalSales: number;
    commissionEarned: number;
    designsApproved: number;
  };
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  size: string;
  gsm: GSM;
  price: number;
  color: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  totalAmount: number;
  depositAmount: number;
  remainingAmount: number;
  momoReference: string;
  status: 'pending' | 'partially_paid' | 'completed' | 'cancelled';
  createdAt: number;
  agentId?: string;
}
