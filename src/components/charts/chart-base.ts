import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale,
);

ChartJS.defaults.color = "#eaf0f6";
ChartJS.defaults.font.family = "var(--font-inter, 'Inter', sans-serif)";
ChartJS.defaults.scale.grid.color = "rgba(154, 164, 178, 0.25)";
ChartJS.defaults.scale.ticks.color = "#9aa4b2";
ChartJS.defaults.plugins.legend.labels.color = "#9aa4b2";
ChartJS.defaults.plugins.tooltip.backgroundColor = "rgba(22, 26, 34, 0.9)";
ChartJS.defaults.plugins.tooltip.borderColor = "rgba(176, 54, 54, 0.3)";
ChartJS.defaults.plugins.tooltip.titleColor = "#eaf0f6";
ChartJS.defaults.plugins.tooltip.bodyColor = "#eaf0f6";
