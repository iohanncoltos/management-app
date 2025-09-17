"use client";

import "./chart-base";

import type { ChartData, ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";

interface LineChartProps {
  data: ChartData<"line">;
  options?: ChartOptions<"line">;
  height?: number;
}

export function LineChart({ data, options, height = 220 }: LineChartProps) {
  return <Line data={data} options={options} height={height} />;
}
