import React from 'react'
import { View } from 'react-native'
import { cssInterop } from 'nativewind'
import type { ViewProps } from 'react-native'

import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils'
import { boxStyle } from './styles'

cssInterop(View, { className: 'style' })

type IBoxProps = ViewProps &
  VariantProps<typeof boxStyle> & {
    className?: string
  }

const Box = React.forwardRef<React.ComponentRef<typeof View>, IBoxProps>(
  function Box({ className, ...props }, ref) {
    return (
      <View
        ref={ref}
        {...props}
        // @ts-ignore - NativeWind className support
        className={boxStyle({ class: className })}
      />
    )
  }
)

Box.displayName = 'Box'
export { Box }
