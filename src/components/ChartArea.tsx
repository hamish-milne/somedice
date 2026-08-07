import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartData,
  type ChartDataset,
  type Point,
} from "chart.js";
import { Scatter } from "react-chartjs-2";
import type { Output } from "../lib/common";
import { useStore, useWatch } from "tinystate";
import { useMemo } from "react";

// Register Chart.js components
ChartJS.register(LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function* seriesColorGenerator() {
  let hue = 0;
  while (true) {
    yield [`hsl(${hue}, 70%, 50%)`, `hsla(${hue}, 70%, 50%, 0.5)`];
    hue = (hue + 60) % 360; // Change hue for next color
  }
}

function* labelGenerator() {
  let index = 0;
  while (true) {
    yield `Series ${index + 1}`;
    index++;
  }
}

function outputsToChartData(outputs: Output[]): ChartData<"scatter"> {
  const datasets: ChartDataset<"scatter", Point[]>[] = [];
  const colorGen = seriesColorGenerator();
  const labelGen = labelGenerator();

  for (const [name, die] of outputs) {
    const [borderColor, backgroundColor] = colorGen.next().value!;
    const label = name || labelGen.next().value!;

    const totalWeight = die.reduce((sum, [, weight]) => sum + weight, 0);
    const points: { x: number; y: number }[] = die.map(([value, weight]) => ({
      x: value,
      y: 100 * (weight / totalWeight), // Normalize to probability
    }));
    // Add points with y=0 for values not present in the die to ensure a continuous line
    if (points.length > 0) {
      for (let x = points[0].x, x2 = x, i = 1; i < points.length; i++) {
        x2 = points[i].x;
        for (x++; x < x2; x++) {
          points.splice(i, 0, { x, y: 0 });
          i++;
        }
      }
    }

    datasets.push({
      label,
      data: points,
      borderColor,
      backgroundColor,
    });
  }
  return { datasets };
}

const options: ChartOptions<"scatter"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top",
    },
  },
  datasets: {
    scatter: {
      showLine: true,
      stepped: "middle",
      borderWidth: 2,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: "Probability",
      },
      ticks: {
        // Add a percentage sign to the y-axis ticks
        callback: function (value) {
          return value + "%";
        },
      },
    },
    x: {
      title: {
        display: true,
        text: "Value",
      },
      ticks: {
        stepSize: 1, // Ensure x-axis ticks are integers
      },
    },
  },
};

export function ChartArea() {
  const store = useStore();

  const outputs = useWatch(store, "outputs");
  const data = useMemo(() => outputsToChartData(outputs), [outputs]);

  return (
    <div className="h-full p-2 sm:p-6 bg-white min-h-96 overflow-x-hidden">
      <Scatter data={data} options={options} />
    </div>
  );
}
