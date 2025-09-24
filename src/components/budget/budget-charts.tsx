"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BUDGET_CATEGORY_LABELS, BUDGET_CATEGORY_COLORS } from "@/lib/budgetCategorizer";
import { BudgetCategory } from "@prisma/client";

// Chart.js imports
declare global {
  interface Window {
    Chart: typeof import('chart.js').Chart;
  }
}

interface BudgetTotals {
  total: number;
  totalsByCategory: Record<BudgetCategory, number>;
  linesCount: number;
}

interface BudgetChartsProps {
  totals: BudgetTotals;
}

export function BudgetCharts({ totals }: BudgetChartsProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<import('chart.js').Chart | null>(null);

  useEffect(() => {
    // Dynamically import Chart.js
    const loadChart = async () => {
      if (typeof window !== 'undefined' && !window.Chart) {
        const { Chart, registerables } = await import('chart.js');
        Chart.register(...registerables);
        window.Chart = Chart;
      }
    };

    loadChart();
  }, []);

  useEffect(() => {
    if (!chartRef.current || !window.Chart) return;

    // Destroy existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Prepare data for doughnut chart
    const categories = Object.keys(totals.totalsByCategory) as BudgetCategory[];
    const data = categories.map(cat => totals.totalsByCategory[cat]);
    const labels = categories.map(cat => BUDGET_CATEGORY_LABELS[cat]);
    const colors = categories.map(cat => BUDGET_CATEGORY_COLORS[cat]);

    // Filter out categories with zero values
    const nonZeroData: { label: string; value: number; color: string }[] = [];
    categories.forEach((cat, index) => {
      if (data[index] > 0) {
        nonZeroData.push({
          label: labels[index],
          value: data[index],
          color: colors[index],
        });
      }
    });

    if (nonZeroData.length === 0) {
      // Show empty state
      ctx.clearRect(0, 0, chartRef.current.width, chartRef.current.height);
      ctx.fillStyle = '#6B7280';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('No budget data', chartRef.current.width / 2, chartRef.current.height / 2);
      return;
    }

    // Create doughnut chart
    chartInstanceRef.current = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: nonZeroData.map(d => d.label),
        datasets: [
          {
            data: nonZeroData.map(d => d.value),
            backgroundColor: nonZeroData.map(d => d.color),
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function(context: { parsed: number; label: string }) {
                const value = context.parsed;
                const percentage = ((value / totals.total) * 100).toFixed(1);
                return `${context.label}: €${value.toLocaleString()} (${percentage}%)`;
              },
            },
          },
        },
        cutout: '60%',
      },
    });

    // Cleanup function
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [totals]);

  // Calculate top categories
  const categoryEntries = Object.entries(totals.totalsByCategory)
    .map(([cat, amount]) => ({
      category: cat as BudgetCategory,
      amount,
      label: BUDGET_CATEGORY_LABELS[cat as BudgetCategory],
      color: BUDGET_CATEGORY_COLORS[cat as BudgetCategory],
    }))
    .filter(entry => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Budget by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {totals.total > 0 ? (
            <div className="h-64">
              <canvas ref={chartRef} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p>No budget data to display</p>
                <p className="text-sm mt-1">Add some line items to see the breakdown</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryEntries.length > 0 ? (
            <div className="space-y-3">
              {categoryEntries.map((entry) => {
                const percentage = totals.total > 0 ? (entry.amount / totals.total) * 100 : 0;
                return (
                  <div key={entry.category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="font-medium">{entry.label}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">€{entry.amount.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: entry.color,
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              <p>No categories to display</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}