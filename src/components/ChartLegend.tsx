import { createMemo, For } from "solid-js";

export default function ChartLegend(props: { labels: string[] }) {
  const colors = [
    "rgb(221,221,221)",
    "rgb(46,37,133)",
    "rgb(51,117,56)",
    "rgb(93,168,153)",
    "rgb(148,203,236)",
    "rgb(220,205,125)",
    "rgb(194,106,119)",
    "rgb(159,74,150)",
    "rgb(126,41,84)",
  ];

  const startPos = createMemo(() => {
    const height = 300;
    const rectHeight = 20;
    const gap = 10;

    const middle = height / 2;
    const halfCount = props.labels.length / 2;

    return middle - halfCount * rectHeight - halfCount * gap;
  });

  return (
    <svg width={60} height={300}>
      <For each={props.labels}>
        {(v, i) => {
          return (
            <>
              <rect
                x={0}
                y={startPos() + i() * 10 + i() * 10}
                width={30}
                height={15}
                fill={colors[i()]}
                stroke="gray"
              ></rect>
              <text
                x={45}
                y={startPos() + i() * 10 + i() * 10}
                text-anchor="middle"
                dominant-baseline="hanging"
                fill="white"
              >
                {props.labels[i()]}
              </text>
            </>
          );
        }}
      </For>
    </svg>
  );
}
