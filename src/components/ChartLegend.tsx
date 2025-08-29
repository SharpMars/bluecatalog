import { createMemo, createSignal, For, Match, onCleanup, onMount, Switch } from "solid-js";

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

  let [maxWidth, setMaxWidth] = createSignal(-1);

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

  const verticalPos = (startPos: number, i: number) => startPos + i * 10 + i * 10;

  const splitsForHorizontal = createMemo(() => {
    if (!props.isHorizontal || maxWidth() == -1) return;

    const canvas = new OffscreenCanvas(0, 0);
    const ctx = canvas.getContext("2d");
    ctx.font = "16px DM Sans";

    const box = 30;
    const gap = 5;
    const groupGap = 20;

    const res = [];
    const labels = [...props.labels];

    while (labels.length > 0) {
      const set = [];
      let width = 0;

      while (true) {
        if (labels.length == 0) break;

        const nextLabel = labels[0];
        const addWidth = box + gap + ctx.measureText(nextLabel).width;

        const isWider = width + (set.length > 0 ? groupGap : 0) + addWidth > maxWidth();

        if (isWider && set.length != 0) break;

        width += addWidth + (set.length > 0 ? groupGap : 0);
        set.push(nextLabel);
        labels.shift();
      }

      res.push(set);
    }

    return res;
  });

  const startPosForVertical = createMemo(() => {
    if (props.isHorizontal) return;
    const height = 300;
    const rectHeight = 20;
    const gap = 10;

    const middle = height / 2;
    const halfCount = props.labels.length / 2;

    return middle - halfCount * rectHeight - halfCount * gap;
  });

  const horizontalModePos = createMemo(() => {
    if (splitsForHorizontal() == null) return;

    const res: { x: number; y: number }[] = [];

    const box = 30;
    const gap = 5;

    const canvas = new OffscreenCanvas(0, 0);
    const ctx = canvas.getContext("2d");
    ctx.font = "16px DM Sans";
    const startY = 2.5;

    let labelIndex = 0;

    for (let i = 0; i < splitsForHorizontal().length; i++) {
      const line: string[] = splitsForHorizontal()[i];
      const lineWidth =
        line.map((val: string) => box + gap + ctx.measureText(val).width).reduce((a, b) => a + b) +
        (line.length - 1) * 20;

      const currY = startY + i * 20;
      const linePos: { x: number; y: number }[] = [];

      const startPos = maxWidth() / 2 - lineWidth / 2;

      for (let j = 0; j < line.length; j++) {
        const prevWidth =
          j == 0
            ? 0
            : line
                .slice(0, j)
                .map((val: string) => box + gap + ctx.measureText(val).width)
                .reduce((a, b) => a + b);

        labelIndex++;

        const x = startPos + j * 20 + prevWidth;

        linePos.push({ x: x, y: currY });
      }

      res.push(...linePos);
    }

    return res;
  });

  let svg: SVGSVGElement;
  let resizeObserver: ResizeObserver;

  onMount(() => {
    if (svg.isConnected && props.isHorizontal) {
      resizeObserver = new ResizeObserver((entries) => {
        if (entries[0].target.computedStyleMap().get("display") == "block") {
          setMaxWidth(entries[0].contentRect.width);
        } else setMaxWidth(-1);
      });
      resizeObserver.observe(svg.parentElement);
    }
  });

  onCleanup(() => {
    if (!resizeObserver) return;
    resizeObserver.disconnect();
    resizeObserver = null;
  });

  return (
    <svg
      width={props.isHorizontal && maxWidth() != -1 ? maxWidth() : fullHorizontalWidth() + 5}
      height={props.isHorizontal ? (splitsForHorizontal() ? 2.5 + splitsForHorizontal().length * 20 : 0) : 300}
      ref={svg}
    >
      <For each={props.labels}>
        {(v, i) => {
          return (
            <Switch>
              <Match when={!props.isHorizontal}>
                <rect
                  x={1}
                  y={verticalPos(startPosForVertical(), i())}
                  width={30}
                  height={15}
                  fill={colors[i()]}
                  stroke="gray"
                  rx={"0.25rem"}
                  ry={"0.25rem"}
                ></rect>
                <text
                  x={36}
                  y={verticalPos(startPosForVertical(), i())}
                  text-anchor="start"
                  dominant-baseline="hanging"
                  fill="currentColor"
                >
                  {v}
                </text>
              </Match>
              <Match when={props.isHorizontal && horizontalModePos()}>
                <rect
                  x={horizontalModePos()[i()].x}
                  y={horizontalModePos()[i()].y}
                  width={30}
                  height={15}
                  fill={colors[i()]}
                  stroke="gray"
                  rx={"0.25rem"}
                  ry={"0.25rem"}
                ></rect>
                <text
                  x={horizontalModePos()[i()].x + 35}
                  y={horizontalModePos()[i()].y}
                  text-anchor="start"
                  dominant-baseline="hanging"
                  fill="currentColor"
                >
                  {v}
                </text>
              </Match>
            </Switch>
          );
        }}
      </For>
    </svg>
  );
}
