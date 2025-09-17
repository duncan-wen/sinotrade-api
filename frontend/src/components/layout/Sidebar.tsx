// @ts-nocheck
'use client'
import React from 'react'
import { View, Text } from 'react-native-web'
import { Button, ButtonText } from '@/components/ui/button'

interface SidebarProps {
  isOpen?: boolean
}

export function Sidebar({ isOpen = true }: SidebarProps) {
  const menuItems = [
    { icon: '🏠', label: '首頁', active: true },
    { icon: '📊', label: '交易', active: false },
    { icon: '💼', label: '投資組合', active: false },
    { icon: '📈', label: '市場數據', active: false },
    { icon: '🔍', label: '研究分析', active: false },
    { icon: '⚡', label: '快速下單', active: false },
    { icon: '📋', label: '交易記錄', active: false },
    { icon: '💰', label: '資金管理', active: false },
  ]

  const watchlist = [
    {
      symbol: 'TSLA',
      name: '特斯拉',
      price: '$248.50',
      change: '+2.3%',
      up: true,
    },
    {
      symbol: 'AAPL',
      name: '蘋果',
      price: '$192.80',
      change: '-0.8%',
      up: false,
    },
    {
      symbol: 'NVDA',
      name: '輝達',
      price: '$721.33',
      change: '+4.1%',
      up: true,
    },
    {
      symbol: '2330.TW',
      name: '台積電',
      price: 'NT$566',
      change: '+1.2%',
      up: true,
    },
  ]

  return (
    <View
      className={`bg-gray-50 border-r border-gray-200 min-h-screen transition-all duration-300 ${
        isOpen
          ? 'w-80 lg:relative lg:translate-x-0 absolute z-50 lg:z-auto'
          : 'w-20 hidden lg:block'
      }`}
    >
      {/* 主選單 */}
      <View className="p-4">
        <Text
          className={`text-lg font-semibold text-gray-900 mb-4 ${!isOpen && 'hidden'}`}
        >
          主要功能
        </Text>

        <View className="space-y-2">
          {menuItems.map((item, index) => (
            <Button
              key={index}
              variant={item.active ? 'solid' : 'outline'}
              action={item.active ? 'primary' : 'default'}
              className={`w-full justify-start ${item.active ? 'bg-blue-50 border-blue-200' : 'bg-transparent border-transparent hover:bg-gray-100'}`}
            >
              <View className="flex-row items-center">
                <Text className="text-lg mr-3">{item.icon}</Text>
                {isOpen && (
                  <ButtonText
                    className={
                      item.active
                        ? 'text-blue-700 font-medium'
                        : 'text-gray-700'
                    }
                  >
                    {item.label}
                  </ButtonText>
                )}
              </View>
            </Button>
          ))}
        </View>
      </View>

      {/* 分隔線 */}
      {isOpen && <View className="h-px bg-gray-200 mx-4 my-4" />}

      {/* 監控清單 */}
      {isOpen && (
        <View className="p-4 flex-1">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            監控清單
          </Text>

          <View className="space-y-3">
            {watchlist.map((stock, index) => (
              <View
                key={index}
                className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm"
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="font-semibold text-gray-900 text-sm">
                    {stock.symbol}
                  </Text>
                  <Text
                    className={`text-sm font-medium ${stock.up ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {stock.change}
                  </Text>
                </View>
                <Text className="text-xs text-gray-500 mb-1">{stock.name}</Text>
                <Text className="text-sm font-medium text-gray-900">
                  {stock.price}
                </Text>
              </View>
            ))}
          </View>

          {/* 新增按鈕 */}
          <Button variant="outline" className="w-full mt-4 border-dashed">
            <ButtonText className="text-gray-500">+ 新增股票</ButtonText>
          </Button>
        </View>
      )}

      {/* 底部設定 */}
      <View className="p-4 border-t border-gray-200">
        <Button variant="outline" className="w-full">
          <View className="flex-row items-center">
            <Text className="text-lg mr-3">⚙️</Text>
            {isOpen && <ButtonText className="text-gray-700">設定</ButtonText>}
          </View>
        </Button>
      </View>
    </View>
  )
}
