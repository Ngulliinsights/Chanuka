export interface MarketMetrics {
  totalVolume: number;
  averagePrice: number;
  priceFluctuation: number;
  timestamp: Date;
}

export interface PriceData {
  productId: string;
  price: number;
  currency: string;
  updatedAt: Date;
}
