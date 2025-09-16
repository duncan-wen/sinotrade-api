// @ts-nocheck
'use client';
import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, HistogramData, Time } from 'lightweight-charts';
import { View } from 'react-native';

export interface KLineData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradingChartProps {
  data: KLineData[];
  symbol: string;
  className?: string;
  height?: number;
  width?: number;
  showVolume?: boolean;
}

export function TradingChart({
  data,
  symbol,
  className = '',
  height = 400,
  width,
  showVolume = true
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化圖表
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 計算圖表高度分配
    const mainChartHeight = showVolume ? Math.floor(height * 0.7) : height;
    const volumeChartHeight = showVolume ? Math.floor(height * 0.3) : 0;

    // 創建圖表
    const chart = createChart(chartContainerRef.current, {
      width: width || chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      crosshair: {
        mode: 1, // Normal crosshair mode
      },
      rightPriceScale: {
        borderColor: '#cccccc',
      },
      timeScale: {
        borderColor: '#cccccc',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // 創建 K 線系列 - 台股顏色慣例：上漲紅色，下跌綠色
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#ff4444', // 上漲顏色（紅色）- 台股慣例
      downColor: '#00C851', // 下跌顏色（綠色）- 台股慣例
      borderDownColor: '#00C851',
      borderUpColor: '#ff4444',
      wickDownColor: '#00C851',
      wickUpColor: '#ff4444',
    });

    // 創建成交量系列（如果需要顯示）
    let volumeSeries = null;
    if (showVolume) {
      volumeSeries = chart.addHistogramSeries({
        color: '#999999', // 預設灰色，實際顏色由數據決定
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      });

      // 設置成交量價格軸
      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.7, // 成交量圖表在下方 30%
          bottom: 0,
        },
      });
    }

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;
    setIsLoading(false);

    // 響應式調整
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: width || chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height, width, showVolume]);

  // 更新數據
  useEffect(() => {
    if (!candlestickSeriesRef.current || !data.length) return;

    // 轉換 K 線數據格式
    const formattedData: CandlestickData[] = data.map(item => ({
      time: new Date(item.time).getTime() / 1000 as Time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    // 設置 K 線數據
    candlestickSeriesRef.current.setData(formattedData);

    // 設置成交量數據 - 台股顏色慣例：上漲紅色，下跌綠色
    if (volumeSeriesRef.current && showVolume) {
      const volumeData: HistogramData[] = data
        .filter(item => item.volume !== undefined)
        .map(item => {
          const time = new Date(item.time).getTime() / 1000 as Time;
          const isUp = item.close >= item.open;
          return {
            time,
            value: item.volume!,
            color: isUp ? '#ff4444' : '#00C851', // 台股慣例：上漲紅色，下跌綠色
          };
        });

      volumeSeriesRef.current.setData(volumeData);
    }

    // 自動調整視圖
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [data, showVolume]);

  return (
    <View className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* 圖表標題 */}
      <View className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{symbol}</h3>
            <p className="text-sm text-gray-500">K線圖</p>
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">
              1分
            </button>
            <button className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">
              5分
            </button>
            <button className="px-3 py-1 text-xs bg-blue-500 text-white rounded">
              日線
            </button>
            <button className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">
              週線
            </button>
          </div>
        </div>
      </View>

      {/* 圖表容器 */}
      <View className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-gray-500">載入圖表中...</div>
          </div>
        )}
        <div
          ref={chartContainerRef}
          className="w-full min-w-0"
          style={{ height: `${height}px` }}
        />
      </View>

      {/* 圖表工具欄 */}
      <View className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">技術指標:</span>
            <button className="text-blue-600 hover:text-blue-800">MA</button>
            <button className="text-blue-600 hover:text-blue-800">MACD</button>
            <button className="text-blue-600 hover:text-blue-800">RSI</button>
            <button className="text-blue-600 hover:text-blue-800">KD</button>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showVolume}
                onChange={() => {}}
                className="rounded"
              />
              <span className="text-sm text-gray-600">顯示成交量</span>
            </label>
          </div>
          <div className="flex-1"></div>
          <div className="text-gray-500">
            {data.length > 0 && `${data.length} 筆數據`}
          </div>
        </div>
      </View>
    </View>
  );
}
