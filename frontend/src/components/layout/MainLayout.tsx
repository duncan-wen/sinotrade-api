// @ts-nocheck
'use client'
import React, { useState } from 'react'
import { View } from 'react-native'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { Button, ButtonText } from '@/components/ui/button'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <View className="min-h-screen flex flex-col bg-gray-100">
      {/* 頂部導航欄 */}
      <Navbar />

      {/* 主要內容區域 */}
      <View className="flex-1 flex flex-row relative">
        {/* 側邊欄 */}
        <Sidebar isOpen={sidebarOpen} />

        {/* 手機版覆蓋層 */}
        {sidebarOpen && (
          <View
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onPress={() => setSidebarOpen(false)}
          />
        )}

        {/* 主要內容 */}
        <View className="flex-1 flex flex-col lg:relative">
          {/* 內容工具欄 */}
          <View className="bg-white border-b border-gray-200 px-3 lg:px-6 py-2 flex-row items-center justify-between">
            {/* 側邊欄切換按鈕 */}
            <Button
              variant="outline"
              size="sm"
              onPress={() => setSidebarOpen(!sidebarOpen)}
              className="mr-2 lg:mr-4"
            >
              <ButtonText className="text-lg">
                {sidebarOpen ? '👈' : '👉'}
              </ButtonText>
            </Button>

            {/* 麵包屑導航 */}
            <View className="flex-row items-center flex-1">
              <ButtonText className="text-xs lg:text-sm text-gray-500 hidden sm:block">
                首頁
              </ButtonText>
              <ButtonText className="text-xs lg:text-sm text-gray-400 mx-1 lg:mx-2 hidden sm:block">
                /
              </ButtonText>
              <ButtonText className="text-xs lg:text-sm text-gray-900 font-medium">
                交易大廳
              </ButtonText>
            </View>

            {/* 右側快速操作 */}
            <View className="flex-row items-center space-x-1 lg:space-x-2">
              <Button
                variant="solid"
                action="positive"
                size="sm"
                className="hidden sm:flex"
              >
                <ButtonText className="text-xs lg:text-sm">🟢 買入</ButtonText>
              </Button>
              <Button
                variant="solid"
                action="negative"
                size="sm"
                className="hidden sm:flex"
              >
                <ButtonText className="text-xs lg:text-sm">🔴 賣出</ButtonText>
              </Button>
              {/* 手機版簡化按鈕 */}
              <Button
                variant="solid"
                action="positive"
                size="sm"
                className="sm:hidden"
              >
                <ButtonText>🟢</ButtonText>
              </Button>
              <Button
                variant="solid"
                action="negative"
                size="sm"
                className="sm:hidden"
              >
                <ButtonText>🔴</ButtonText>
              </Button>
            </View>
          </View>

          {/* 滾動內容區域 */}
          <View className="flex-1 p-2 lg:p-3">
            <View className="w-full pb-16">{children}</View>
          </View>
        </View>
      </View>
    </View>
  )
}
