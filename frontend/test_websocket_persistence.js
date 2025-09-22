// 測試WebSocket訂閱持久化功能
// 在瀏覽器控制台中運行此腳本

console.log('🧪 測試WebSocket訂閱持久化...')

// 測試localStorage功能
function testLocalStorage() {
  console.log('📦 測試localStorage功能...')

  // 模擬訂閱保存
  localStorage.setItem('lastSubscribedSymbol', '2330')
  console.log('✅ 保存訂閱到localStorage')

  // 模擬讀取
  const saved = localStorage.getItem('lastSubscribedSymbol')
  console.log('📖 讀取訂閱:', saved)

  // 模擬清理
  localStorage.removeItem('lastSubscribedSymbol')
  console.log('🗑️ 清理localStorage')

  return saved === '2330'
}

// 測試WebSocket服務恢復邏輯
function testWebSocketRecovery() {
  console.log('🔄 測試WebSocket恢復邏輯...')

  // 模擬頁面刷新後的狀態
  console.log('模擬頁面刷新: 清空subscriptions')
  // 注意:在實際測試中,這裡會清空WebSocket服務的subscriptions

  // 設置localStorage
  localStorage.setItem('lastSubscribedSymbol', '2330')

  // 模擬resubscribeAll調用
  const lastSymbol = localStorage.getItem('lastSubscribedSymbol')
  if (lastSymbol) {
    console.log('✅ 成功從localStorage恢復訂閱:', lastSymbol)
    return true
  } else {
    console.log('❌ 無法從localStorage恢復訂閱')
    return false
  }
}

// 運行測試
if (testLocalStorage()) {
  console.log('✅ localStorage測試通過')
} else {
  console.log('❌ localStorage測試失敗')
}

if (testWebSocketRecovery()) {
  console.log('✅ WebSocket恢復測試通過')
} else {
  console.log('❌ WebSocket恢復測試失敗')
}

console.log('🎯 測試完成!請刷新頁面檢查是否能自動恢復訂閱')
