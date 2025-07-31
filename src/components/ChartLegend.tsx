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
    <svg width={100} height={300}>
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
                rx={"0.25rem"}
                ry={"0.25rem"}
              ></rect>
              <text
                x={35}
                y={startPos() + i() * 10 + i() * 10}
                text-anchor="left"
                dominant-baseline="hanging"
                fill="currentColor"
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
