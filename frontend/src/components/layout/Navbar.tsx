// @ts-nocheck
'use client'
import React from 'react'
import { View, Text } from 'react-native'
import { Button, ButtonText } from '@/components/ui/button'
import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
  AvatarBadge,
} from '@/components/ui/avatar'

export function Navbar() {
  return (
    <View className="bg-white border-b border-gray-200 px-6 py-3 flex-row items-center justify-between shadow-sm">
      {/* Logo 區域 */}
      <View className="flex-row items-center">
        <Text className="text-2xl font-bold text-gray-900">📈 SinoTrade</Text>
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
          <Avatar size="sm">
            <AvatarFallbackText>Jane Doe</AvatarFallbackText>
            <AvatarImage
              source={{
                uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80',
              }}
            />
            <AvatarBadge />
          </Avatar>
          <View className="hidden md:block">
            <Text className="text-sm font-medium text-gray-900">用戶名稱</Text>
            <Text className="text-xs text-gray-500">可用資金: $50,000</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
