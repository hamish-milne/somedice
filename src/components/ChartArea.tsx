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
import type { DisplayMode } from "../App";
import { useMemo } from "preact/hooks";

// Register Chart.js components
ChartJS.register(LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function* seriesColorGenerator(n: number) {
  for (let i = 0; i < n; i++) {
    const hue = (i * 360) / n;
    const borderColor = `hsl(${hue}, 70%, 50%)`;
    const backgroundColor = `hsla(${hue}, 70%, 50%, 0.5)`;
    yield [borderColor, backgroundColor];
  }
}

function* labelGenerator() {
  let index = 0;
  while (true) {
    yield `Series ${index + 1}`;
    index++;
  }
}

function outputsToChartData(outputs: Output[], displayMode: DisplayMode): ChartData<"scatter"> {
  const datasets: ChartDataset<"scatter", Point[]>[] = [];
  const colorGen = seriesColorGenerator(outputs.length);
  const labelGen = labelGenerator();

  for (const [name, die] of outputs) {
    const [borderColor, backgroundColor] = colorGen.next().value!;
    const label = name || labelGen.next().value!;

    const points: { x: number; y: number }[] = die.map(([value, weight]) => ({
      x: value,
      y: 100 * weight, // Normalize to probability
    }));
    // Add points with y=0 for values not present in the die to ensure a continuous line
    if (points.length > 0) {
      for (let x = points[0].x, x2 = x, i = 1; i < points.length; i++) {
        x2 = points[i].x;
        if (x + 1 < x2) {
          points.splice(i, 0, { x: x + 1, y: 0 }, { x: x2 - 1, y: 0 });
          i += 2; // Skip the newly added points
        }
        x = x2;
      }
    }

    switch (displayMode) {
      case "atLeast":
        for (let i = points.length - 2; i >= 0; i--) {
          points[i].y += points[i + 1].y;
          points[i].y = Math.min(points[i].y, 100);
        }
        break;
      case "atMost":
        for (let i = 1; i < points.length; i++) {
          points[i].y += points[i - 1].y;
          points[i].y = Math.min(points[i].y, 100);
        }
        break;
      default:
        break;
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
  const displayMode = useWatch(store, "displayMode");
  const displayState = useWatch(store, "displayState");
  const isVisible = displayState === "output" && displayMode !== "documentation";
  const data = useMemo(() => outputsToChartData(outputs, displayMode), [outputs, displayMode]);

  return (
    <div
      className="h-full p-2 sm:p-6 min-h-96 overflow-x-hidden data-hidden:hidden"
      data-hidden={isVisible ? undefined : true}
    >
      <Scatter data={data} options={options} />
    </div>
  );
}
