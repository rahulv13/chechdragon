
'use client';

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Pie,
  PieChart,
  Cell,
  Legend,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent,
} from '@/components/ui/chart';

type DashboardChartsProps = {
  activityData: any[];
  distributionData: any[];
  chartType?: 'bar' | 'pie';
};

const chartConfig = {
  anime: {
    label: 'Anime',
    color: 'hsl(var(--chart-1))',
  },
  manga: {
    label: 'Manga',
    color: 'hsl(var(--chart-2))',
  },
  manhwa: {
    label: 'Manhwa',
    color: 'hsl(var(--chart-3))',
  },
};

const distributionConfig = {
    watching: { label: 'Watching', color: 'hsl(var(--chart-1))' },
    reading: { label: 'Reading', color: 'hsl(var(--chart-2))' },
    planned: { label: 'Planned', color: 'hsl(var(--chart-3))' },
    completed: { label: 'Completed', color: 'hsl(var(--chart-4))' },
}

export default function DashboardCharts({
  activityData,
  distributionData,
  chartType = 'bar',
}: DashboardChartsProps) {
  if (chartType === 'pie') {
    return (
      <ChartContainer
        config={distributionConfig}
        className="mx-auto aspect-square max-h-[300px]"
      >
        <PieChart>
          <Tooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={distributionData}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            strokeWidth={5}
          >
             {distributionData.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.fill} />
            ))}
          </Pie>
          <Legend content={<ChartLegendContent />} />
        </PieChart>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart accessibilityLayer data={activityData}>
        <XAxis
          dataKey="name"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <Legend content={<ChartLegendContent />} />
        <Bar
          dataKey="anime"
          fill="var(--color-anime)"
          radius={4}
          barSize={15}
        />
        <Bar 
            dataKey="manga" 
            fill="var(--color-manga)" 
            radius={4} 
            barSize={15} 
        />
        <Bar
            dataKey="manhwa"
            fill="var(--color-manhwa)"
            radius={4}
            barSize={15}
        />
      </BarChart>
    </ChartContainer>
  );
}
