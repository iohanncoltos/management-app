"use client";

import "./chart-base";

import type { ChartData, ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";

interface BarChartProps {
  data: ChartData<"bar">;
  options?: ChartOptions<"bar">;
  height?: number;
}

export function BarChart({ data, options, height = 220 }: BarChartProps) {
  return <Bar data={data} options={options} height={height} />;
}
