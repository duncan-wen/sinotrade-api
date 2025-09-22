/**
 * 圖表工具欄按鈕組件
 * 統一管理按鈕樣式和行為
 */

import React from 'react'

// 按鈕類型
type ButtonVariant = 'toggle' | 'action'

// 按鈕大小
type ButtonSize = 'sm' | 'md'

interface ChartButtonProps {
  children: React.ReactNode
  onClick: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  isActive?: boolean
  title?: string
  disabled?: boolean
  className?: string
}

// 基礎樣式
const baseStyles =
  'rounded transition-all font-medium focus:outline-none focus:ring-2 focus:ring-blue-300'

// 大小樣式
const sizeStyles = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
}

// 變體樣式
const variantStyles = {
  toggle: {
    active: 'bg-blue-500 text-white hover:bg-blue-600',
    inactive: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  },
  action: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
}

const ChartButton: React.FC<ChartButtonProps> = ({
  children,
  onClick,
  variant = 'action',
  size = 'sm',
  isActive = false,
  title,
  disabled = false,
  className = '',
}) => {
  // 組合樣式
  const getButtonStyles = () => {
    let styles = `${baseStyles} ${sizeStyles[size]}`

    if (variant === 'toggle') {
      styles += ` ${isActive ? variantStyles.toggle.active : variantStyles.toggle.inactive}`
    } else {
      styles += ` ${variantStyles.action}`
    }

    if (disabled) {
      styles += ' opacity-50 cursor-not-allowed'
    }

    return `${styles} ${className}`
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={getButtonStyles()}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default ChartButton
