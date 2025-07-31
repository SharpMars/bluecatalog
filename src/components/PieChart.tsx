import { createMemo, createUniqueId, For, Show } from "solid-js";

interface Point {
  x: number;
  y: number;
}

export default function PieChart(props: { padding: number; labels: string[]; data: number[] }) {
  const id = createUniqueId();

  const textDistanceScale = (60 + 100 / 2) / 150;

  function toRadians(x: number) {
    return x * (Math.PI / 180);
  }

  const summedData = createMemo(() => props.data.reduce((a, b) => a + b));
  const endPositionsPerSegment = createMemo(() => {
    const res: {
      start: Point;
      end: Point;
      peak: Point;
      text: Point;
      startAngle: number;
      angle: number;
      centerAngleOnCircle: number;
    }[] = [];

    let sumDegrees = 0;

    for (const segmentData of props.data) {
      const angle = 360 * (segmentData / summedData());
      const sumRadians = toRadians(sumDegrees);
      const summedRadians = toRadians(angle + sumDegrees);

      const textAngle = angle / 2;
      const textRadians = toRadians(textAngle + sumDegrees);

      res.push({
        start: {
          x: Math.cos(sumRadians) * (150 - props.padding) + 150,
          y: Math.sin(sumRadians) * (150 - props.padding) + 150,
        },
        end: {
          x: Math.cos(summedRadians) * (150 - props.padding) + 150,
          y: Math.sin(summedRadians) * (150 - props.padding) + 150,
        },
        peak: {
          x: Math.cos(textRadians) * (150 - props.padding) + 150,
          y: Math.sin(textRadians) * (150 - props.padding) + 150,
        },
        text: {
          x: Math.cos(textRadians) * (150 * textDistanceScale - props.padding) + 150,
          y: Math.sin(textRadians) * (150 * textDistanceScale - props.padding) + 150,
        },
        startAngle: sumDegrees,
        angle: angle,
        centerAngleOnCircle: (-(textAngle + sumDegrees) % 360) + 360,
      });

      sumDegrees += angle;
    }

    return res;
  });

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

  const textColors = [
    "rgb(34, 34, 34)",
    "rgb(231, 236, 187)",
    "rgb(255, 255, 255)",
    "rgb(0, 0, 0)",
    "rgb(39, 19, 7)",
    "rgb(20, 29, 77)",
    "rgb(0,0,0)",
    "rgb(255, 255, 255)",
    "rgb(255, 255, 255)",
  ];

  // onMount(() => {
  //   for (let i = 0; i < props.data.length; i++) {
  //     console.log(
  //       `text-${id}-${i}`, (document.getElementById(`text-${id}-${i}`) as unknown as SVGTextElement).getBBox()
  //     );
  //   }
  // });

  function inCircle(halfSize: number, r: number, p: Point) {
    const distance = Math.pow(p.x - halfSize, 2) + Math.pow(p.y - halfSize, 2);
    return distance < Math.pow(r, 2);
  }

  //based of https://www.geeksforgeeks.org/dsa/check-if-two-given-line-segments-intersect#using-orientation-of-lines-o1-time-and-o1-space
  function onSegment(p: Point, a: Point, b: Point) {
    return (
      p.x <= Math.max(a.x, b.x) && p.x >= Math.min(a.x, b.x) && p.y <= Math.max(a.y, b.y) && p.y >= Math.min(a.y, b.y)
    );
  }

  function orientation(a: Point, b: Point, c: Point) {
    let val = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);

    // collinear
    if (val === 0) return 0;

    // clock or counterclock wise
    // 1 for clockwise, 2 for counterclockwise
    return val > 0 ? 1 : 2;
  }

  function doIntersect(a: Point, b: Point, c: Point, d: Point) {
    // find the four orientations needed
    // for general and special cases
    let o1 = orientation(a, b, c);
    let o2 = orientation(a, b, d);
    let o3 = orientation(c, d, a);
    let o4 = orientation(c, d, b);

    // general case
    if (o1 !== o2 && o3 !== o4) return true;

    // special cases
    // p1, q1 and p2 are collinear and p2 lies on segment p1q1
    if (o1 === 0 && onSegment(a, c, b)) return true;

    // p1, q1 and q2 are collinear and q2 lies on segment p1q1
    if (o2 === 0 && onSegment(a, d, b)) return true;

    // p2, q2 and p1 are collinear and p1 lies on segment p2q2
    if (o3 === 0 && onSegment(c, a, d)) return true;

    // p2, q2 and q1 are collinear and q1 lies on segment p2q2
    if (o4 === 0 && onSegment(c, b, d)) return true;

    return false;
  }

  let tooltip: HTMLDivElement;

  return (
    <div>
      <div
        hidden
        ref={tooltip}
        class="bg-gray w-fit shadow-[0_0_16px_#000000] absolute z-1 select-none pointer-events-none rounded min-w-4rem p-2 overflow-hidden"
      >
        <div class="color h-4px absolute w-full left-0 top-0"></div>
        <p class="title font-bold">{props.labels[0]}</p>
        <p class="value">{props.data[0]}</p>
      </div>
      <svg
        viewBox="0 0 300 300"
        class="w-300px h-300px drop-shadow-[0_0_12px_#000000A0] [&>g>g:hover]:scale-110 [&>g>g]:transition-ease-in-out [&>g>g]:transition-all [&>g>g]:transition-100"
      >
        <defs>
          <mask id="clip" style={{ "mask-type": "luminance" }}>
            <rect x={0} y={0} width={300} height={300} fill="white"></rect>
            <circle cx="150" cy="150" r="50" fill="black"></circle>
          </mask>
        </defs>
        <g
          onpointerleave={() => {
            if (!window.matchMedia("(pointer: coarse)").matches) tooltip.hidden = true;
          }}
        >
          <For each={endPositionsPerSegment()}>
            {(v, i) => {
              return (
                <g
                  class="origin-center focus:outline-none"
                  tabindex={-1}
                  onblur={() => {
                    if (window.matchMedia("(pointer: coarse)").matches) tooltip.hidden = true;
                  }}
                  onpointerenter={(ev) => {
                    if (window.matchMedia("(pointer: coarse)").matches) {
                      ev.currentTarget.focus();
                      tooltip.hidden = false;
                      tooltip.style.left = ev.pageX + "px";
                      tooltip.style.top = ev.pageY + "px";

                      (tooltip.querySelector(".title") as HTMLParagraphElement).innerText = props.labels[i()];
                      (tooltip.querySelector(".value") as HTMLParagraphElement).innerText = props.data[i()].toString();
                      (tooltip.querySelector(".color") as HTMLDivElement).style.backgroundColor = colors[i()];
                    }
                  }}
                  onpointermove={(ev) => {
                    if (window.matchMedia("(pointer: coarse)").matches) return;
                    tooltip.hidden = false;
                    tooltip.style.left = ev.pageX + 16 + "px";
                    tooltip.style.top = ev.pageY + 16 + "px";

                    (tooltip.querySelector(".title") as HTMLParagraphElement).innerText = props.labels[i()];
                    (tooltip.querySelector(".value") as HTMLParagraphElement).innerText = props.data[i()].toString();
                    (tooltip.querySelector(".color") as HTMLDivElement).style.backgroundColor = colors[i()];
                  }}
                >
                  <path
                    id={`slice-${id}-${i()}`}
                    mask="url(#clip)"
                    fill={colors[i()]}
                    stroke="white"
                    stroke-width={0}
                    d={`M ${150} ${150} L ${v.start.x} ${v.start.y} A ${
                      150 - props.padding
                    } ${150 - props.padding} 0 ${v.angle > 180 ? "1" : "0"} 1 ${v.end.x} ${v.end.y} Z`}
                  ></path>
                  <Show when={v.angle > 18}>
                    <text
                      class="select-none pointer-events-none"
                      id={`text-${id}-${i()}`}
                      x={v.text.x}
                      y={v.text.y}
                      fill={textColors[i()]}
                      text-anchor="middle"
                      dominant-baseline="middle"
                      font-size="12"
                    >
                      {(() => {
                        let data = props.data[i()].toString();

                        let maxLength = data.length;

                        const letterWidth = 2;
                        //const textWidth = data.length * letterWidth;

                        const canvas = new OffscreenCanvas(0, 0);
                        const context = canvas.getContext("2d");
                        context.font = "10px DM Sans";

                        if (v.angle < 80) {
                          const center: Point = { x: 150, y: 150 };

                          const line1 = [center, v.start];
                          const line2 = [v.start, v.peak];
                          const line3 = [v.peak, v.end];
                          const line4 = [v.end, center];

                          function intersects(lines: Point[][], textLeft: Point, textRight: Point) {
                            const intersect1 = doIntersect(lines[0][0], lines[0][1], textLeft, textRight);
                            const intersect2 = doIntersect(lines[1][0], lines[1][1], textLeft, textRight);
                            const intersect3 = doIntersect(lines[2][0], lines[2][1], textLeft, textRight);
                            const intersect4 = doIntersect(lines[3][0], lines[3][1], textLeft, textRight);

                            return intersect1 || intersect2 || intersect3 || intersect4;
                          }

                          let textLeft = {
                            x: v.text.x - context.measureText(data).width / 2,
                            y: v.text.y,
                          };
                          let textRight = {
                            x: v.text.x + context.measureText(data).width / 2,
                            y: v.text.y,
                          };

                          let lettersDiscarded = 0;

                          while (intersects([line1, line2, line3, line4], textLeft, textRight)) {
                            if (maxLength - lettersDiscarded <= 0) break;
                            lettersDiscarded++;

                            textLeft = {
                              x:
                                v.text.x - context.measureText(data.slice(0, data.length - lettersDiscarded)).width / 2,
                              y: v.text.y,
                            };
                            textRight = {
                              x:
                                v.text.x + context.measureText(data.slice(0, data.length - lettersDiscarded)).width / 2,
                              y: v.text.y,
                            };
                          }

                          maxLength -= lettersDiscarded;
                        }
                        //}

                        // if (
                        //   v.centerAngleOnCircle % 180 > 15 &&
                        //   v.centerAngleOnCircle % 180 < 165 &&
                        //   v.angle < 90
                        // ) {
                        //   maxLength -= Math.ceil(
                        //     (v.centerAngleOnCircle / v.angle + 2) *
                        //       (1 - (textDistanceScale + 0.25) + textDistanceScale)
                        //   );
                        // }

                        // if (data.length > maxLength) {
                        //   data = data
                        //     .slice(0, data.length - (data.length - maxLength))
                        //     .padEnd(maxLength + 3, ".");
                        // }

                        if (maxLength == data.length) return data;
                        else {
                          return data.slice(0, maxLength - 2).padEnd(maxLength + 1, ".");
                        }
                      })()}
                    </text>
                  </Show>
                </g>
              );
            }}
          </For>
        </g>
      </svg>
    </div>
  );
}
