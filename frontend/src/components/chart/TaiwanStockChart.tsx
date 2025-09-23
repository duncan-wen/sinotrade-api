'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
  taiwanStockHistoryData,
  formatNumber,
  formatPercentage,
} from './mockTaiwanStockData'

const chartConfig = {
  twiIndex: {
    label: '台股指數',
    color: 'hsl(var(--chart-1))',
  },
  volume: {
    label: '成交量 (億)',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig

export function TaiwanStockChart() {
  // 使用最近7天的數據
  const recentData = taiwanStockHistoryData.slice(-7)
  const currentData = recentData[recentData.length - 1]
  const previousData = recentData[recentData.length - 2]

  const currentValue = currentData.twiIndex
  const change = currentData.change
  const changePercent = currentData.changePercent

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          台股指數 TWI Index
          <span className="text-lg font-normal text-muted-foreground">
            {formatNumber(currentValue)}
          </span>
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <span
            className={`font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {change >= 0 ? '+' : ''}
            {change} ({formatPercentage(changePercent)})
          </span>
          <span className="text-sm text-muted-foreground">近一週走勢</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={recentData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                const date = new Date(value)
                return `${date.getMonth() + 1}/${date.getDate()}`
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(value) => {
                    const date = new Date(value)
                    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
                  }}
                  formatter={(value, name) => [
                    name === 'twiIndex'
                      ? `${Number(value).toLocaleString()} 點`
                      : `${Number(value).toFixed(1)} 億`,
                    chartConfig[name as keyof typeof chartConfig]?.label ||
                      name,
                  ]}
                />
              }
            />
            <Line
              dataKey="twiIndex"
              type="monotone"
              stroke="var(--color-twiIndex)"
              strokeWidth={2}
              dot={{
                fill: 'var(--color-twiIndex)',
                strokeWidth: 2,
                r: 4,
              }}
              activeDot={{
                r: 6,
                stroke: 'var(--color-twiIndex)',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div
          className={`flex gap-2 leading-none font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}
        >
          {change >= 0 ? '本週上漲' : '本週下跌'}{' '}
          {Math.abs(changePercent).toFixed(2)}%
          {change >= 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
        </div>
        <div className="text-muted-foreground leading-none">
          顯示過去一週台股指數走勢數據
        </div>
      </CardFooter>
    </Card>
  )
}
