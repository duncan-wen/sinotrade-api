/**
 * 全域類型定義
 * 解決 Gluestack UI v3、React Native Web、NativeWind 的兼容性問題
 */

// ================================
// React Native 組件 className 支援 - 使用 module augmentation
// ================================
declare module 'react-native' {
  // 擴展介面而不重新聲明匯出
  interface ViewProps {
    className?: string
  }

  interface TextProps {
    className?: string
  }

  interface ImageProps {
    className?: string
  }

  interface TouchableOpacityProps {
    className?: string
  }

  interface PressableProps {
    className?: string
  }

  interface ScrollViewProps {
    className?: string
  }
}

// ================================
// React Native Web 組件 className 支援
// ================================
declare module 'react-native-web' {
  interface ViewProps {
    className?: string
  }

  interface TextProps {
    className?: string
  }

  interface ImageProps {
    className?: string
  }

  interface TouchableOpacityProps {
    className?: string
  }

  interface PressableProps {
    className?: string
  }

  interface ScrollViewProps {
    className?: string
  }
}

// ================================
// Gluestack UI v3 組件類型擴展 - 使用 module augmentation
// ================================

// 擴展現有模組而不是重新聲明
declare module '@gluestack-ui/core/alert/creator' {
  export interface AlertProps {
    className?: string
    style?: any
    context?: any
  }
}

declare module '@gluestack-ui/core/avatar/creator' {
  export interface AvatarProps {
    className?: string
    style?: any
  }
}

declare module '@gluestack-ui/core/button/creator' {
  export interface ButtonProps {
    className?: string
    style?: any
  }
}

declare module '@gluestack-ui/core/input/creator' {
  export interface InputProps {
    className?: string
    style?: any
  }
}

declare module '@gluestack-ui/core/box/creator' {
  export interface BoxProps {
    className?: string
    style?: any
  }
}

declare module '@gluestack-ui/core/icon/creator' {
  export interface IconProps {
    className?: string
    style?: any
    size?: number | string
  }

  // 保留原始匯出
  export const PrimitiveIcon: any
  export const UIIcon: any
}

// 添加其他常用組件的匯出定義
declare module '@gluestack-ui/core/text/creator' {
  export const UIText: any
}

declare module '@gluestack-ui/core/view/creator' {
  export const UIView: any
}

declare module '@gluestack-ui/core/pressable/creator' {
  export const UIPressable: any
}

declare module '@gluestack-ui/core/image/creator' {
  export const UIImage: any
}

declare module '@gluestack-ui/core/spinner/creator' {
  export const UISpinner: any
}

declare module '@gluestack-ui/core/toast/creator' {
  export const UIToast: any
}

declare module '@gluestack-ui/core/modal/creator' {
  export const UIModal: any
}

declare module '@gluestack-ui/core/popover/creator' {
  export const UIPopover: any
}

declare module '@gluestack-ui/core/menu/creator' {
  export const UIMenu: any
}

declare module '@gluestack-ui/core/actionsheet/creator' {
  export const UIActionsheet: any
}

declare module '@gluestack-ui/core/hstack/creator' {
  export const UIHStack: any
}

declare module '@gluestack-ui/core/vstack/creator' {
  export const UIVStack: any
}

declare module '@gluestack-ui/core/center/creator' {
  export const UICenter: any
}

declare module '@gluestack-ui/core/badge/creator' {
  export const UIBadge: any
}

declare module '@gluestack-ui/core/divider/creator' {
  export const UIDivider: any
}

declare module '@gluestack-ui/core/heading/creator' {
  export const UIHeading: any
}

declare module '@gluestack-ui/core/link/creator' {
  export const UILink: any
}

declare module '@gluestack-ui/core/checkbox/creator' {
  export const UICheckbox: any
}

declare module '@gluestack-ui/core/radio/creator' {
  export const UIRadio: any
}

declare module '@gluestack-ui/core/switch/creator' {
  export const UISwitch: any
}

declare module '@gluestack-ui/core/textarea/creator' {
  export const UITextarea: any
}

declare module '@gluestack-ui/core/select/creator' {
  export const UISelect: any
}

declare module '@gluestack-ui/core/slider/creator' {
  export const UISlider: any
}

declare module '@gluestack-ui/core/progress/creator' {
  export const UIProgress: any
}

declare module '@gluestack-ui/core/fab/creator' {
  export const UIFab: any
}

declare module '@gluestack-ui/core/card/creator' {
  export const UICard: any
}

// ================================
// 全域 JSX 元素支援
// ================================
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}

// ================================
// TypeScript 實用類型
// ================================
declare global {
  type ClassNameProp = {
    className?: string
  }

  type StyleProp = {
    style?: any
  }

  type ComponentWithClassName<T = {}> = T & ClassNameProp & StyleProp
}
