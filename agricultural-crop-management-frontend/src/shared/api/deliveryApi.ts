import httpClient from "./http";

export interface CalculateShippingRequest {
  senderProvince: string;
  recipientProvince: string;
  weightKg: number;
  requiresColdChain: boolean;
  prefersSameDay: boolean;
  senderLat?: number;
  senderLon?: number;
  recipientLat?: number;
  recipientLon?: number;
  isGroupedDelivery?: boolean;
}

export interface ShippingOption {
  type: "standard" | "same_day";
  providerId: number;
  providerName: string;
  shippingFeeVnd: number;
  estimatedHours: number;
  isSameDay: boolean;
  isColdChain: boolean;
}

export interface DeliveryOrder {
  id: number;
  marketplaceOrderId: number;
  providerId: number;
  trackingNumber: string | null;
  status: "PENDING" | "PICKUP_SCHEDULED" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "RETURNED" | "CANCELLED";
  shippingFeeVnd: number;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  isPerishable: boolean;
  requiresColdChain: boolean;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientProvince: string;
  weightKg: number;
  createdAt: string;
  updatedAt: string;
}

export const deliveryApi = {
  calculate: async (req: CalculateShippingRequest): Promise<ShippingOption[]> => {
    const response = await httpClient.post<ShippingOption[]>("/api/v1/delivery/calculate", req);
    return response.data;
  },
  getDeliveryOrdersByMarketplaceId: async (marketplaceOrderId: number): Promise<DeliveryOrder[]> => {
    const response = await httpClient.get<DeliveryOrder[]>(`/api/v1/delivery/orders/marketplace/${marketplaceOrderId}`);
    return response.data;
  },
  createDeliveryOrder: async (req: {
    marketplaceOrderId: number;
    providerId: number;
    shippingFeeVnd: number;
    isPerishable: boolean;
    requiresColdChain: boolean;
    recipientName: string;
    recipientPhone: string;
    recipientAddress: string;
    recipientProvince: string;
    weightKg: number;
  }): Promise<DeliveryOrder> => {
    const response = await httpClient.post<DeliveryOrder>("/api/v1/delivery/orders", req);
    return response.data;
  },
  getAllDeliveryOrders: async (): Promise<DeliveryOrder[]> => {
    const response = await httpClient.get<DeliveryOrder[]>("/api/v1/delivery/orders");
    return response.data;
  },
  updateDeliveryStatus: async (id: number, status: DeliveryOrder["status"]): Promise<DeliveryOrder> => {
    const response = await httpClient.put<DeliveryOrder>(`/api/v1/delivery/orders/${id}/status?status=${status}`);
    return response.data;
  },
};
