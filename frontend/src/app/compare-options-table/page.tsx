'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  OptionsContractSelector,
  OptionsContractSelectorTable,
} from '@/components/trading'
import type { OptionContract } from '@/types/api'

export default function CompareOptionsTablePage() {
  const handleContractSelect = (contract: OptionContract) => {
    console.log('🎯 選中的合約:', contract)
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* 頁面標題 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            選擇權T字報價表 - 設計比較
          </CardTitle>
          <div className="text-center text-gray-600">
            比較 CSS Grid 布局 vs shadcn Table 組件的視覺效果
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Grid 版本說明 */}
            <div className="text-center">
              <Badge variant="default" className="mb-2">
                CSS Grid 版本
              </Badge>
              <div className="text-sm text-gray-600">
                <p>✅ 自定義布局更靈活</p>
                <p>✅ 黑色主題更適合交易</p>
                <p>✅ 響應式設計更精確</p>
                <p>⚠️ 需要手動實現表格功能</p>
              </div>
            </div>

            {/* Table 版本說明 */}
            <div className="text-center">
              <Badge variant="secondary" className="mb-2">
                shadcn Table 版本
              </Badge>
              <div className="text-sm text-gray-600">
                <p>✅ 標準表格語義更好</p>
                <p>✅ 內建排序、篩選功能</p>
                <p>✅ 無障礙支援更完整</p>
                <p>⚠️ 樣式客製化較受限</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Grid 版本 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">CSS Grid 版本</h2>
          <Badge variant="default">原版</Badge>
        </div>
        <OptionsContractSelector
          onContractSelect={handleContractSelect}
          className="border-2 border-blue-200 rounded-lg p-4"
        />
      </div>

      <Separator className="my-8" />

      {/* Table 版本 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">shadcn Table 版本</h2>
          <Badge variant="secondary">新版</Badge>
        </div>
        <OptionsContractSelectorTable
          onContractSelect={handleContractSelect}
          className="border-2 border-green-200 rounded-lg p-4"
        />
      </div>

      {/* 比較總結 */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>🎯 比較總結</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-blue-600 mb-2">
                CSS Grid 版本適合:
              </h3>
              <ul className="space-y-1 text-sm">
                <li>• 需要完全自定義的視覺設計</li>
                <li>• 交易系統的專業外觀</li>
                <li>• 複雜的響應式布局需求</li>
                <li>• 高度客製化的交互效果</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-green-600 mb-2">
                Table 版本適合:
              </h3>
              <ul className="space-y-1 text-sm">
                <li>• 需要標準表格功能 (排序、篩選)</li>
                <li>• 重視無障礙訪問性</li>
                <li>• 快速開發和一致性設計</li>
                <li>• 與其他 shadcn 組件整合</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
