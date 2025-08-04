import { createMemo, For, Match, Switch } from "solid-js";

export default function ChartLegend(props: { labels: string[]; isHorizontal: boolean }) {
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

  const horizontalWidths = createMemo(() => {
    if (!props.isHorizontal) return;

    const canvas = new OffscreenCanvas(0, 0);
    const ctx = canvas.getContext("2d");
    ctx.font = "16px DM Sans";

    const box = 30;
    const gap = 5;

    const widths = [];

    for (const label of props.labels) {
      const textSize = ctx.measureText(label);

      widths.push(box + gap + textSize.width);
    }

    return widths;
  });

  const fullHorizontalWidth = createMemo(() => {
    if (props.isHorizontal)
      return horizontalWidths().reduce((prev, next) => prev + next) + (horizontalWidths().length - 1) * 20;
    else {
      const canvas = new OffscreenCanvas(0, 0);
      const ctx = canvas.getContext("2d");
      ctx.font = "16px DM Sans";

      const box = 30;
      const gap = 5;

      const longest = props.labels.reduce((a, b) => (a.length > b.length ? a : b));
      return box + gap + ctx.measureText(longest).width;
    }
  });

  const startPos = createMemo(() => {
    if (!props.isHorizontal) {
      const height = 300;
      const rectHeight = 20;
      const gap = 10;

      const middle = height / 2;
      const halfCount = props.labels.length / 2;

      return middle - halfCount * rectHeight - halfCount * gap;
    } else {
      let fullWidth = fullHorizontalWidth();
      const halfWidth = fullWidth / 2;
      const middle = (fullWidth + 5) / 2;

      return middle - halfWidth;
    }
  });

  const verticalPos = (startPos: number, i: number) => startPos + i * 10 + i * 10;
  const horizontalPos = (startPos: number, i: number) => {
    const prevWidth =
      i == 0
        ? 0
        : horizontalWidths()
            .slice(0, i)
            .reduce((prev, next) => prev + next);

    return startPos + i * 20 + prevWidth;
  };

  return (
    <svg width={fullHorizontalWidth() + 5} height={props.isHorizontal ? 20 : 300}>
      <For each={props.labels}>
        {(v, i) => {
          return (
            <Switch>
              <Match when={!props.isHorizontal}>
                <rect
                  x={1}
                  y={verticalPos(startPos(), i())}
                  width={30}
                  height={15}
                  fill={colors[i()]}
                  stroke="gray"
                  rx={"0.25rem"}
                  ry={"0.25rem"}
                ></rect>
                <text
                  x={36}
                  y={verticalPos(startPos(), i())}
                  text-anchor="start"
                  dominant-baseline="hanging"
                  fill="currentColor"
                >
                  {props.labels[i()]}
                </text>
              </Match>
              <Match when={props.isHorizontal}>
                <rect
                  x={horizontalPos(startPos(), i())}
                  y={2.5}
                  width={30}
                  height={15}
                  fill={colors[i()]}
                  stroke="gray"
                  rx={"0.25rem"}
                  ry={"0.25rem"}
                ></rect>
                <text
                  x={horizontalPos(startPos(), i()) + 35}
                  y={2.5}
                  text-anchor="start"
                  dominant-baseline="hanging"
                  fill="currentColor"
                >
                  {props.labels[i()]}
                </text>
              </Match>
            </Switch>
          );
        }}
      </For>
    </svg>
  );
}
