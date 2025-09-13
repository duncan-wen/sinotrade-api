// @ts-nocheck
'use client';
import React from 'react';
import { View, Text } from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';

export function Navbar() {
  return (
    <View className="bg-white border-b border-gray-200 px-6 py-4 flex-row items-center justify-between shadow-sm">
      {/* Logo 區域 */}
      <View className="flex-row items-center">
        <Text className="text-2xl font-bold text-gray-900">
          📈 SinoTrade
        </Text>
      </View>

      {/* 中間導航 */}
      <View className="flex-row items-center space-x-6 hidden md:flex">
        <Button variant="link" action="default">
          <ButtonText className="text-gray-600 hover:text-gray-900">
            市場總覽
          </ButtonText>
        </Button>
        <Button variant="link" action="default">
          <ButtonText className="text-gray-600 hover:text-gray-900">
            我的投資組合
          </ButtonText>
        </Button>
        <Button variant="link" action="default">
          <ButtonText className="text-gray-600 hover:text-gray-900">
            研究報告
          </ButtonText>
        </Button>
      </View>

      {/* 右側用戶區域 */}
      <View className="flex-row items-center space-x-4">
        {/* 通知 */}
        <Button variant="outline" size="sm" className="rounded-full p-2">
          <ButtonText className="text-lg">🔔</ButtonText>
        </Button>

        {/* 用戶資料 */}
        <View className="flex-row items-center space-x-3">
          <View className="bg-blue-500 rounded-full w-8 h-8 items-center justify-center">
            <Text className="text-white font-semibold text-sm">U</Text>
          </View>
          <View className="hidden md:block">
            <Text className="text-sm font-medium text-gray-900">用戶名稱</Text>
            <Text className="text-xs text-gray-500">可用資金: $50,000</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
