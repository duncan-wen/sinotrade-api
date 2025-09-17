import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectItem,
} from '@/components/ui/select'
import { ChevronDownIcon } from '@/components/ui/icon'

export default function SelectComponent(props: {
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
    ...restProps
  } = props

  return (
    <Select defaultValue={value} onValueChange={onValueChange} {...restProps}>
      <SelectTrigger variant="rounded" size="md">
        <SelectInput placeholder={placeholder} />
        <SelectIcon className="mr-3" as={ChevronDownIcon} />
      </SelectTrigger>
      <SelectPortal>
        <SelectBackdrop />
        <SelectContent>
          <SelectDragIndicatorWrapper>
            <SelectDragIndicator />
          </SelectDragIndicatorWrapper>
          {props.options.map((option) => (
            <SelectItem
              key={option.value}
              label={option.label}
              value={option.value}
            />
          ))}
        </SelectContent>
      </SelectPortal>
    </Select>
  )
}
