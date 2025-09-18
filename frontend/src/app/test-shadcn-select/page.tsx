'use client'

import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function TestShadcnSelectPage() {
  const [selectedSymbol, setSelectedSymbol] = React.useState('')

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* 標題 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Shadcn/ui Select 測試</h1>
          <p className="text-muted-foreground">
            使用 Shadcn/ui 的 Select 組件替換 Gluestack UI
          </p>
        </div>

        {/* 期貨選擇器 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">📈 期貨選擇</h2>

          <div className="flex items-center space-x-4">
            <label htmlFor="futures-select" className="text-sm font-medium">
              選擇期貨:
            </label>
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="請選擇期貨商品" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>台指期貨</SelectLabel>
                  <SelectItem value="TXFR1">台指期貨近月 (TXFR1)</SelectItem>
                  <SelectItem value="TXFR2">台指期貨次月 (TXFR2)</SelectItem>
                </SelectGroup>

                <SelectGroup>
                  <SelectLabel>小台指期貨</SelectLabel>
                  <SelectItem value="MXFR1">小台指近月 (MXFR1)</SelectItem>
                  <SelectItem value="MXFR2">小台指次月 (MXFR2)</SelectItem>
                </SelectGroup>

                <SelectGroup>
                  <SelectLabel>個股期貨</SelectLabel>
                  <SelectItem value="CDFR1">台積電期貨近月 (CDFR1)</SelectItem>
                  <SelectItem value="CDFR2">台積電期貨次月 (CDFR2)</SelectItem>
                  <SelectItem value="HONR1">鴻海期貨近月 (HONR1)</SelectItem>
                  <SelectItem value="HONR2">鴻海期貨次月 (HONR2)</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {selectedSymbol && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">當前選擇:</p>
              <p className="font-semibold text-lg">{selectedSymbol}</p>
            </div>
          )}
        </div>

        {/* 多個 Select 範例 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">🎨 其他 Select 範例</h2>

          {/* 水果選擇器 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">水果選擇:</label>
            <Select>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="選擇水果" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>水果</SelectLabel>
                  <SelectItem value="apple">🍎 蘋果</SelectItem>
                  <SelectItem value="banana">🍌 香蕉</SelectItem>
                  <SelectItem value="orange">🍊 橘子</SelectItem>
                  <SelectItem value="grape">🍇 葡萄</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* 時間框架選擇器 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">時間框架:</label>
            <Select defaultValue="5m">
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1分鐘</SelectItem>
                <SelectItem value="5m">5分鐘</SelectItem>
                <SelectItem value="15m">15分鐘</SelectItem>
                <SelectItem value="30m">30分鐘</SelectItem>
                <SelectItem value="1h">1小時</SelectItem>
                <SelectItem value="4h">4小時</SelectItem>
                <SelectItem value="1d">日線</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 對比說明 */}
        <div className="p-6 bg-blue-50 dark:bg-blue-950 rounded-lg border">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            ✅ Shadcn/ui Select 優勢
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• 🚫 無警告訊息 (取代 Gluestack UI)</li>
            <li>• 🎨 完整的主題支援 (明暗模式)</li>
            <li>• ♿ 內建無障礙功能 (Radix UI)</li>
            <li>• 🎯 TypeScript 支援完整</li>
            <li>• 🔧 高度可客製化</li>
            <li>• 📱 響應式設計</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
