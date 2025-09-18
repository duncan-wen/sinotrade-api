import React from 'react'

export default function NativeSelectComponent(props: {
  className?: string
  options: { label: string; value: string }[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
}) {
  const {
    value,
    onValueChange,
    placeholder = 'Select option',
    className = '',
    options,
  } = props

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onValueChange?.(event.target.value)
  }

  return (
    <select
      value={value || ''}
      onChange={handleChange}
      className={`
        w-full px-3 py-2 border border-gray-300 rounded-md
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        bg-white text-gray-900
        ${className}
      `}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
