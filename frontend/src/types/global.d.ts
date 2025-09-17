/**
 * 專為 Gluestack UI v3 className 支援的類型定義
 * 僅擴展需要的組件,避免影響其他系統
 */

// ================================
// 僅針對 Gluestack UI 組件的 className 支援
// ================================

// 為 Gluestack UI 組件添加 className 支援,不影響原生 React Native
declare module '@gluestack-ui/core/alert/creator' {
  export const createAlert: any
  export const PrimitiveIcon: any
  export const UIIcon: any
}

declare module '@gluestack-ui/core/avatar/creator' {
  export const createAvatar: any
}

declare module '@gluestack-ui/core/button/creator' {
  export const createButton: any
}

declare module '@gluestack-ui/core/input/creator' {
  export const createInput: any
}

declare module '@gluestack-ui/core/box/creator' {
  export const createBox: any
}

declare module '@gluestack-ui/core/icon/creator' {
  export const createIcon: any
  export const PrimitiveIcon: any
  export const UIIcon: any
}

declare module '@gluestack-ui/core/text/creator' {
  export const createText: any
  export const UIText: any
}

declare module '@gluestack-ui/core/view/creator' {
  export const createView: any
  export const UIView: any
}

declare module '@gluestack-ui/core/badge/creator' {
  export const createBadge: any
  export const UIBadge: any
}

declare module '@gluestack-ui/core/card/creator' {
  export const createCard: any
  export const UICard: any
}

// ================================
// TypeScript 實用類型 (最小化全域影響)
// ================================
declare global {
  type GluestackClassName = {
    className?: string
  }
}
