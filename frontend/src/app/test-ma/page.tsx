'use client'
import React, { useState, useEffect } from 'react'

export default function TestMAPage() {
  const [maData, setMaData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMaData = async () => {
      try {
        const response = await fetch(
          '/api/klines/TXFR1?interval=1d&limit=50&ma_periods=5,10,20&include_indicators=true'
        )
        const data = await response.json()

        console.log('🔍 完整後端響應:', data)

        if (data.data && data.data.length > 0) {
          console.log('🔍 第一筆數據:', data.data[0])
          console.log('🔍 數據格式檢測:', {
            hasKline: !!data.data[0].kline,
            hasMa: !!data.data[0].ma,
            hasDirectProps: !!data.data[0].open,
          })
        }

        setMaData(data)
      } catch (err) {
        console.error('❌ 獲取MA數據失敗:', err)
        setError(err instanceof Error ? err.message : '未知錯誤')
      }
    }

    fetchMaData()
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">MA 數據測試頁面</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          錯誤: {error}
        </div>
      )}

      {maData && (
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">API 響應概覽</h2>
            <p>
              <strong>Symbol:</strong> {maData.symbol}
            </p>
            <p>
              <strong>Interval:</strong> {maData.interval}
            </p>
            <p>
              <strong>Count:</strong> {maData.count}
            </p>
            <p>
              <strong>包含指標:</strong>{' '}
              {maData.indicators_included ? '是' : '否'}
            </p>
          </div>

          {maData.data && maData.data.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">數據樣本 (前3筆)</h2>
              {maData.data.slice(0, 3).map((item: any, index: number) => (
                <div key={index} className="border-b pb-2 mb-2 last:border-b-0">
                  <h3 className="font-medium">第 {index + 1} 筆數據:</h3>

                  {item.kline && (
                    <div className="ml-4 mt-2">
                      <h4 className="font-medium text-blue-600">K線數據:</h4>
                      <p>時間: {item.timestamp}</p>
                      <p>開盤: {item.kline.open}</p>
                      <p>收盤: {item.kline.close}</p>
                      <p>成交量: {item.kline.volume}</p>
                    </div>
                  )}

                  {item.ma && (
                    <div className="ml-4 mt-2">
                      <h4 className="font-medium text-red-600">MA數據:</h4>
                      <p>MA5: {item.ma.ma5}</p>
                      <p>MA10: {item.ma.ma10}</p>
                      <p>MA20: {item.ma.ma20}</p>
                    </div>
                  )}

                  {!item.kline && item.open && (
                    <div className="ml-4 mt-2">
                      <h4 className="font-medium text-purple-600">
                        直接OHLCV格式:
                      </h4>
                      <p>時間: {item.time || item.timestamp}</p>
                      <p>開盤: {item.open}</p>
                      <p>收盤: {item.close}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="bg-gray-100 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">完整 JSON 數據</h2>
            <pre className="text-xs overflow-auto max-h-96 bg-white p-2 rounded">
              {JSON.stringify(maData, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {!maData && !error && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2">載入中...</p>
        </div>
      )}
    </div>
  )
}
