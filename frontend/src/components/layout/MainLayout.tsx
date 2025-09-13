// @ts-nocheck
'use client';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Button, ButtonText } from '@/components/ui/button';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <View className="h-screen flex flex-col bg-gray-100">
      {/* 頂部導航欄 */}
      <Navbar />

      {/* 主要內容區域 */}
      <View className="flex-1 flex flex-row overflow-hidden">
        {/* 側邊欄 */}
        <Sidebar isOpen={sidebarOpen} />

        {/* 主要內容 */}
        <View className="flex-1 flex flex-col">
          {/* 內容工具欄 */}
          <View className="bg-white border-b border-gray-200 px-6 py-3 flex-row items-center justify-between">
            {/* 側邊欄切換按鈕 */}
            <Button
              variant="outline"
              size="sm"
              onPress={() => setSidebarOpen(!sidebarOpen)}
              className="mr-4"
            >
              <ButtonText className="text-lg">
                {sidebarOpen ? '👈' : '👉'}
              </ButtonText>
            </Button>

            {/* 麵包屑導航 */}
            <View className="flex-row items-center flex-1">
              <ButtonText className="text-sm text-gray-500">首頁</ButtonText>
              <ButtonText className="text-sm text-gray-400 mx-2">/</ButtonText>
              <ButtonText className="text-sm text-gray-900 font-medium">交易大廳</ButtonText>
            </View>

            {/* 右側快速操作 */}
            <View className="flex-row items-center space-x-2">
              <Button variant="solid" action="positive" size="sm">
                <ButtonText>🟢 買入</ButtonText>
              </Button>
              <Button variant="solid" action="negative" size="sm">
                <ButtonText>🔴 賣出</ButtonText>
              </Button>
            </View>
          </View>

          {/* 滾動內容區域 */}
          <View className="flex-1 overflow-auto p-6">
            <View className="max-w-7xl mx-auto">
              {children}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
