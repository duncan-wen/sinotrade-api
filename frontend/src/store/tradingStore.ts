import { create } from 'zustand'

interface TradingState {
  selectedSymbol: string
  setSelectedSymbol: (symbol: string) => void
}

export const useTradingStore = create<TradingState>((set) => ({
  selectedSymbol: 'TSE2330', // Default symbol
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
}))
