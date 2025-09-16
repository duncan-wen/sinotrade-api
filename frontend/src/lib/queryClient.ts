/**
 * TanStack Query 配置
 * 統一管理查詢客戶端設置
 */
import { QueryClient } from '@tanstack/react-query';
import { websocketService } from '@/services/websocket';

/**
 * 創建 QueryClient 實例
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 數據新鮮度設置
      staleTime: 1000 * 60, // 1分鐘內認為數據新鮮
      gcTime: 1000 * 60 * 5, // 5分鐘後清除快取 (原 cacheTime)

      // 重試設置
      retry: (failureCount, error: any) => {
        // 根據錯誤類型決定是否重試
        if (error?.status === 401 || error?.status === 403) {
          return false; // 認證錯誤不重試
        }
        if (error?.status >= 500) {
          return failureCount < 3; // 伺服器錯誤重試3次
        }
        return failureCount < 1; // 其他錯誤重試1次
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // 網路狀態相關
      refetchOnWindowFocus: false, // 視窗聚焦時不自動重新獲取
      refetchOnReconnect: true,    // 網路重連時重新獲取
      refetchOnMount: true,        // 組件掛載時重新獲取

      // 網路模式
      networkMode: 'online', // 只在線上時執行查詢
    },
    mutations: {
      // Mutation 設置
      retry: 1,
      gcTime: 1000 * 60 * 5,
      networkMode: 'online',

      // 全域錯誤處理
      onError: (error: any) => {
        console.error('Mutation 錯誤:', error);

        // 可以在這裡添加全域錯誤處理邏輯
        // 例如：顯示 toast 通知、記錄錯誤日誌等
        if (error?.status === 401) {
          // 處理認證過期
          console.warn('認證過期，請重新登入');
        }
      },
    },
  },
});

/**
 * 設置 QueryClient 的 WebSocket 整合
 */
websocketService.setQueryClient(queryClient);

/**
 * 開發環境的調試工具
 */
if (process.env.NODE_ENV === 'development') {
  // 在開發環境中啟用查詢日誌
  queryClient.setMutationDefaults(['*'], {
    onMutate: (variables) => {
      console.log('🔄 Mutation 開始:', variables);
    },
    onSuccess: (data, variables) => {
      console.log('✅ Mutation 成功:', { data, variables });
    },
    onError: (error, variables) => {
      console.error('❌ Mutation 失敗:', { error, variables });
    },
  });

  // 監控快取變化
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'added') {
      console.log('📦 查詢快取已添加:', event.query.queryKey);
    } else if (event.type === 'removed') {
      console.log('🗑️ 查詢快取已移除:', event.query.queryKey);
    }
  });
}

/**
 * 清除所有快取
 */
export const clearAllCache = () => {
  queryClient.clear();
  console.log('🧹 已清除所有查詢快取');
};

/**
 * 預取關鍵數據
 */
export const prefetchCriticalData = async () => {
  try {
    // 預取系統健康狀態
    await queryClient.prefetchQuery({
      queryKey: ['health'],
      queryFn: () => fetch('/api/health').then(res => res.json()),
      staleTime: 1000 * 30,
    });

    // 預取市場狀態
    await queryClient.prefetchQuery({
      queryKey: ['market', 'status'],
      queryFn: () => fetch('/api/market/status').then(res => res.json()),
      staleTime: 1000 * 60,
    });

    console.log('✅ 關鍵數據預取完成');
  } catch (error) {
    console.error('❌ 關鍵數據預取失敗:', error);
  }
};

/**
 * 獲取快取統計信息
 */
export const getCacheStats = () => {
  const queryCache = queryClient.getQueryCache();
  const mutationCache = queryClient.getMutationCache();

  return {
    queries: {
      total: queryCache.getAll().length,
      stale: queryCache.getAll().filter(query => query.isStale()).length,
      fetching: queryCache.getAll().filter(query => query.state.isFetching).length,
    },
    mutations: {
      total: mutationCache.getAll().length,
      pending: mutationCache.getAll().filter(mutation => mutation.state.isPending).length,
    },
  };
};

export default queryClient;
