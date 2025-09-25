'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { OptionsContractSelector } from '@/components/trading'

// 合約資訊界面 (與元件中的定義相同)
interface OptionContract {
  code: string
  symbol: string
  name: string
  option_type: string
  strike_price: number
  delivery_date: string
  delivery_month: string
  option_right: string
  distance_from_futures: number
  moneyness: string
}

export default function TestOptionsSelector() {
  const [selectedContract, setSelectedContract] =
    useState<OptionContract | null>(null)

  const handleContractSelect = (contract: OptionContract) => {
    setSelectedContract(contract)
    console.log('選中的合約:', contract)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 頁面標題 */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">選擇權合約選擇器測試</h1>
        <p className="text-gray-600">
          測試選擇權合約選擇元件，可選擇不同類型的選擇權並查看本月和下個月的周選合約
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 選擇權合約選擇器 */}
        <div className="lg:col-span-1">
          <OptionsContractSelector
            onContractSelect={handleContractSelect}
            className="h-fit"
          />
        </div>

        {/* 選中的合約詳情 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>選中的合約詳情</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedContract ? (
                <div className="space-y-4">
                  {/* 基本資訊 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        合約代碼
                      </label>
                      <p className="text-lg font-semibold">
                        {selectedContract.symbol}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        合約名稱
                      </label>
                      <p className="text-sm">{selectedContract.name}</p>
                    </div>
                  </div>

                  {/* 選擇權詳情 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        選擇權類型
                      </label>
                      <p className="font-semibold">
                        {selectedContract.option_type}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        權利類型
                      </label>
                      <Badge
                        variant={
                          selectedContract.option_right === 'Call'
                            ? 'default'
                            : 'destructive'
                        }
                      >
                        {selectedContract.option_right}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        價內外狀態
                      </label>
                      <Badge
                        variant={
                          selectedContract.moneyness === 'ITM'
                            ? 'default'
                            : selectedContract.moneyness === 'ATM'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {selectedContract.moneyness}
                      </Badge>
                    </div>
                  </div>

                  {/* 價格資訊 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        履約價
                      </label>
                      <p className="text-xl font-bold text-blue-600">
                        {selectedContract.strike_price?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        與期貨價差
                      </label>
                      <p className="text-lg font-semibold">
                        {selectedContract.distance_from_futures?.toFixed(0)} 點
                      </p>
                    </div>
                  </div>

                  {/* 到期資訊 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        到期月份
                      </label>
                      <p className="font-semibold">
                        {selectedContract.delivery_month}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        到期日
                      </label>
                      <p className="font-semibold">
                        {selectedContract.delivery_date.replace(
                          /(\d{4})(\d{2})(\d{2})/,
                          '$1/$2/$3'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* JSON 詳情 (開發測試用) */}
                  <details className="mt-6">
                    <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700">
                      查看 JSON 詳情
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                      {JSON.stringify(selectedContract, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    請從左側選擇器中選擇一個選擇權合約以查看詳情
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* 使用說明 */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">使用說明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <strong>1. 選擇選擇權類型：</strong>
                <p className="text-gray-600 ml-4">
                  從下拉選單中選擇要查看的選擇權類型 (TX1, TX2, TXO, TX4, TXY,
                  TXU)
                </p>
              </div>

              <div>
                <strong>2. 查看合約列表：</strong>
                <p className="text-gray-600 ml-4">
                  系統會自動載入本月和下個月的周選合約，按買權和賣權分類顯示
                </p>
              </div>

              <div>
                <strong>3. 選擇合約：</strong>
                <p className="text-gray-600 ml-4">
                  點擊任一合約卡片即可查看詳細資訊
                </p>
              </div>

              <div>
                <strong>4. 合約資訊：</strong>
                <p className="text-gray-600 ml-4">
                  包含履約價、到期日、價內外狀態等重要資訊
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
