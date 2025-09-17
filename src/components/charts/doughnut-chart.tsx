"use client";

import "./chart-base";

import type { ChartData, ChartOptions } from "chart.js";
import { Doughnut } from "react-chartjs-2";

interface DoughnutChartProps {
  data: ChartData<"doughnut">;
  options?: ChartOptions<"doughnut">;
  size?: number;
}

export function DoughnutChart({ data, options, size = 220 }: DoughnutChartProps) {
  return <Doughnut data={data} options={options} width={size} height={size} />;
}
