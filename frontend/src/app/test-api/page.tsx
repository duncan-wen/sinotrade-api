/**
 * API 測試頁面
 * 用於測試前後端串接功能
 */
'use client'

import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider'
import { queryClient } from '@/lib/queryClient'
import SimpleApiTest from '@/components/testing/SimpleApiTest'

export default function TestApiPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <GluestackUIProvider mode="light">
        <div className="min-h-screen bg-gray-100">
          <SimpleApiTest />
        </div>

        {/* React Query DevTools - 只在開發環境顯示 */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </GluestackUIProvider>
    </QueryClientProvider>
  )
}
