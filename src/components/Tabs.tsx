import { Accessor, For, Setter } from "solid-js";

export function Tabs(props: {
  values: { value: string; displayName: string }[];
  setValue: (string) => void;
  getValue: Accessor<string>;
}) {
  return (
    <div class="flex text-white dark:b-slate-700 light:b-slate-400 b-1 b-solid rounded-lg overflow-clip">
      <For each={props.values}>
        {(val) => {
          return (
            <button
              class={
                (props.getValue() === val.value ? "pressedin " : "") +
                "dark:bg-slate-700 light:bg-slate-400 p-2 dark:[&:not(.pressedin)]:hover:bg-slate-800 light:[&:not(.pressedin)]:hover:bg-slate-500 dark:[&:not(.pressedin)]:active:bg-slate-900 light:[&:not(.pressedin)]:active:bg-slate-600 dark:[&.pressedin]:bg-slate-900 light:[&.pressedin]:bg-slate-600 transition-all transition-100 transition-ease-linear"
              }
              onclick={() => props.setValue(val.value)}
            >
              {val.displayName}
            </button>
          );
        }}
      </For>
    </div>
  );
}
