import type { ReactNode } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ChartCardProps {
  title: string
  description?: string
  className?: string
  children: ReactNode
}

function ChartCard({ title, description, className, children }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

interface ChartTooltipEntry {
  name?: string
  value?: number | string
  color?: string
  fill?: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: ChartTooltipEntry[]
  label?: string
  formatter?: (value: number | string, name?: string) => string
}

function ChartTooltip({ active, payload, label, formatter }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-md border bg-popover px-3 py-1.5 text-xs shadow-sm">
      {label && <p className="mb-1 font-medium text-popover-foreground">{label}</p>}
      {payload.map((entry, i) => (
        <p
          key={i}
          className="flex items-center gap-1.5 text-muted-foreground"
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color ?? entry.fill ?? "var(--chart-1)" }}
          />
          <span>{entry.name}</span>
          <span className="ml-auto pl-2 font-medium text-popover-foreground">
            {formatter ? formatter(entry.value as number, entry.name) : entry.value}
          </span>
        </p>
      ))}
    </div>
  )
}

interface ChartLegendItem {
  label: string
  color: string
}

function ChartLegend({ items }: { items: ChartLegendItem[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <span
          key={item.label}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  )
}

interface DonutDatum {
  name: string
  value: number
  color: string
}

interface DonutChartProps {
  data: DonutDatum[]
  centerTitle: string
  centerValue: string
}

function DonutChart({ data, centerTitle, centerValue }: DonutChartProps) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold">{centerValue}</span>
        <span className="text-xs text-muted-foreground">{centerTitle}</span>
      </div>
    </div>
  )
}

export { ChartCard, ChartTooltip, ChartLegend, DonutChart }
export type { DonutDatum, ChartLegendItem }
