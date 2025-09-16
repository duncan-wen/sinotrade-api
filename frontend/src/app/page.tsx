// @ts-nocheck
'use client';
import { MainLayout } from '@/components/layout/MainLayout'
import { View, Text } from 'react-native'
import { Button, ButtonText } from '@/components/ui/button'
import { TradingChart } from '@/components/chart'
import { generateMockKLineData, tsmcMockData } from '@/components/chart/mockData'

export default function Home() {
  return (
    <MainLayout>
      {/* 交易大廳主要內容 */}
      <View className="space-y-4">
        {/* 市場總覽卡片 */}
        <View className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { title: '台股指數', value: '17,234', change: '+123 (+0.72%)', up: true },
            { title: '美股道瓊', value: '38,654', change: '-89 (-0.23%)', up: false },
            { title: '投資組合價值', value: '$125,680', change: '+$2,340 (+1.90%)', up: true },
            { title: '今日損益', value: '+$1,250', change: '已實現', up: true },
          ].map((stat, index) => (
            <View key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <Text className="text-sm text-gray-500 mb-1">{stat.title}</Text>
              <Text className="text-2xl font-bold text-gray-900 mb-2">{stat.value}</Text>
              <Text className={`text-sm ${stat.up ? 'text-red-600' : 'text-green-600'}`}>
                {stat.change}
              </Text>
            </View>
          ))}
        </View>

        {/* 快速交易區 */}
        <View className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-3">快速交易</Text>
          <View className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <View className="p-3 bg-green-50 rounded-lg border border-green-200">
              <Text className="font-medium text-green-900 mb-1">📈 熱門股票</Text>
              <Text className="text-sm text-green-700">台積電、聯發科、鴻海</Text>
            </View>
            <View className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Text className="font-medium text-blue-900 mb-1">⚡ 快速下單</Text>
              <Text className="text-sm text-blue-700">一鍵買賣，即時成交</Text>
            </View>
            <View className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <Text className="font-medium text-purple-900 mb-1">🔍 市場分析</Text>
              <Text className="text-sm text-purple-700">AI 智能推薦</Text>
            </View>
          </View>
        </View>

        {/* 圖表展示區域 */}
        <View className="bg-white rounded-lg shadow-sm border border-gray-200">
          <TradingChart
            data={generateMockKLineData(30)}
            symbol="TSMC 台積電"
            height={400}
          />
        </View>

        {/* 多圖表展示 */}
        <View className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <TradingChart
            data={tsmcMockData}
            symbol="2330.TW"
            height={250}
          />
          <TradingChart
            data={generateMockKLineData(15)}
            symbol="AAPL"
            height={250}
          />
        </View>

      </View>
    </MainLayout>
  )
}
