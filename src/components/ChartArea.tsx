import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Sample data representing dice distributions
const sampleData = {
  labels: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  datasets: [
    {
      label: "1d6",
      data: [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
      borderColor: "rgb(59, 130, 246)",
      backgroundColor: "rgba(59, 130, 246, 0.5)",
      stepped: "before" as const,
      borderWidth: 2,
    },
    {
      label: "2d6",
      data: [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1],
      borderColor: "rgb(239, 68, 68)",
      backgroundColor: "rgba(239, 68, 68, 0.5)",
      stepped: "before" as const,
      borderWidth: 2,
    },
    {
      label: "3d6",
      data: [0, 0, 1, 3, 6, 10, 15, 18, 18, 15, 10, 6],
      borderColor: "rgb(34, 197, 94)",
      backgroundColor: "rgba(34, 197, 94, 0.5)",
      stepped: "before" as const,
      borderWidth: 2,
    },
  ],
};

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
    },
    title: {
      display: true,
      text: "Dice Distribution",
      font: {
        size: 16,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: "Count",
      },
    },
    x: {
      title: {
        display: true,
        text: "Value",
      },
    },
  },
};

export function ChartArea() {
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 p-6">
        <Line data={sampleData} options={options} />
      </div>
    </div>
  );
}
