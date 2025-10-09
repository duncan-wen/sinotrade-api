/**
 * 圖表工具欄按鈕組件
 * 基於 shadcn Button 的專業圖表工具欄按鈕
 */

import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
  // 根據 variant 和 isActive 狀態決定 shadcn Button 的 variant
  const getShadcnVariant = () => {
    if (variant === 'toggle') {
      return isActive ? 'default' : 'outline'
    }
    return 'ghost'
  }

  // 自定義樣式
  const customStyles = cn(
    // 基礎樣式
    'transition-all duration-200 font-medium',
    // Toggle 樣式
    variant === 'toggle' && [
      isActive && [
        'bg-gradient-to-r from-blue-500 to-blue-600',
        'text-white shadow-md shadow-blue-200',
        'hover:from-blue-600 hover:to-blue-700',
        'dark:from-blue-600 dark:to-blue-700',
        'dark:shadow-blue-900/50',
        'border-0',
      ],
      !isActive && [
        'bg-white dark:bg-gray-800',
        'text-blue-600 dark:text-blue-400',
        'border-blue-200 dark:border-blue-800',
        'hover:bg-blue-50 dark:hover:bg-blue-950',
        'hover:border-blue-300 dark:hover:border-blue-700',
        'shadow-sm',
      ],
    ],
    // Action 樣式
    variant === 'action' && [
      'bg-white dark:bg-gray-800',
      'text-gray-700 dark:text-gray-300',
      'hover:bg-gray-100 dark:hover:bg-gray-700',
      'border border-gray-200 dark:border-gray-700',
      'shadow-sm hover:shadow',
    ],
    // 大小樣式
    size === 'sm' && 'h-7 px-2.5 text-xs gap-1',
    size === 'md' && 'h-8 px-3 text-sm gap-1.5',
    className
  )

  return (
    <Button
      variant={getShadcnVariant()}
      size={size === 'md' ? 'default' : 'sm'}
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={customStyles}
    >
      {children}
    </Button>
  )
}

export default ChartButton
