import { createWindowSize } from "@solid-primitives/resize-observer";
import { Accessor, createMemo, Index, JSXElement, mapArray, Match, Switch } from "solid-js";

export function Masonry<T extends readonly any[], U extends JSXElement>(props: {
  each?: T;
  children: ((item: T[number], index: Accessor<number>) => U) | JSXElement[];
  columns: number;
  maxWidth: number;
  gap: number;
  verticalOnlyGap: number;
}) {
  const windowSize = createWindowSize();
  const curCols = createMemo(() => {
    return calculateColumns(props.columns, windowSize.width);
  });

  const splitChildren = createMemo(() => {
    const splitted = Array.from({ length: curCols() > 0 ? curCols() : 1 }, () => {
      return [];
    });

    let i = 0;

    if (!props.each && !Array.isArray(props.children)) throw new Error("Invalid props passed");

    const children = props.each ? props.each : (props.children as JSXElement[]);

    for (const child of children) {
      if (i >= curCols()) {
        i = 0;
      }
      splitted[i].push(child);
      i++;
    }

    return splitted;
  });

  function calculateColumns(columns: number, windowWidth: number) {
    let neededWidth = props.maxWidth * columns + props.gap * 4 * (columns - 1);

    if (neededWidth < windowWidth - 8) {
      return columns;
    } else {
      return calculateColumns(columns - 1, windowWidth);
    }
  }

  return (
    <div class="flex flex-wrap justify-center w-full" style={{ gap: `${props.gap * 0.25}rem` }}>
      <Index each={splitChildren()}>
        {(item, i) => {
          return (
            <ul
              class="flex flex-col"
              style={{
                gap: curCols() > 1 ? `${props.gap * 0.25}rem` : `${props.verticalOnlyGap * 0.25}rem`,
              }}
            >
              <Switch>
                <Match when={!props.each && Array.isArray(props.children)}>{item()}</Match>
                <Match when={props.each}>
                  {mapArray(item, props.children as (item: T[number], index: Accessor<number>) => U)()}
                </Match>
              </Switch>
            </ul>
          );
        }}
      </Index>
    </div>
  );
}
