export interface PredictionMarket {
  id: string;
  name: string;
  description: string;
  yesPrice: number; // Price in basis points (0-10000)
  noPrice: number;  // Price in basis points (0-10000)
  volume24h: number;
  liquidity: number;
  endDate?: Date;
  category?: string;
}

export interface MarketData {
  markets: PredictionMarket[];
  timestamp: number;
}

export type Position = 'YES' | 'NO';
