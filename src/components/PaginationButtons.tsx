import { Accessor, Setter } from "solid-js";

export function PaginationButtons(props: {
  currentIndex: Accessor<number>;
  setCurrentIndex: Setter<number>;
  pageCount: number;
}) {
  return (
    <div class="flex justify-center flex-row text-white">
      <button
        onclick={() =>
          props.setCurrentIndex(
            props.currentIndex() - 1 < 0
              ? props.pageCount - 1
              : props.currentIndex() - 1
          )
        }
        class="rounded-l-lg dark:bg-slate-700 light:bg-slate-400 p-2 text-5 dark:hover:bg-slate-800 light:hover:bg-slate-500 dark:active:bg-slate-900 light:active:bg-slate-600 transition-all transition-100 transition-ease-linear dark:b-slate-700 light:b-slate-400 b-l-1 b-t-1 b-b-1 b-solid"
      >
        <div class="i-mingcute-left-fill"></div>
      </button>
      <div class="flex items-center dark:bg-slate-700 light:bg-slate-400 b-t-1 b-b-1 dark:b-slate-700 light:b-slate-400 b-solid p-x-1">
        <input
          type="number"
          min={1}
          max={props.pageCount}
          value={(props.currentIndex() + 1).toString()}
          onkeypress={(e) => {
            if (e.key != "Enter") return;

            const val = e.currentTarget.value;
            try {
              const newIndex = parseInt(val);

              if (newIndex > props.pageCount) throw new Error();

              if (newIndex < 1) throw new Error();

              props.setCurrentIndex(newIndex - 1);
              e.currentTarget.value = newIndex.toString();
              e.currentTarget.blur();
            } catch (error) {
              e.currentTarget.value = (props.currentIndex() + 1).toString();
              e.currentTarget.blur();
            }
          }}
          onblur={(e) => {
            const val = e.target.value;
            try {
              const newIndex = parseInt(val);

              if (newIndex > props.pageCount) throw new Error();

              if (newIndex < 1) throw new Error();

              props.setCurrentIndex(newIndex - 1);
              e.target.value = newIndex.toString();
            } catch (error) {
              e.target.value = (props.currentIndex() + 1).toString();
            }
          }}
          class="w-min field-sizing-content text-center m-0 moz-appearance-textfield [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-x-2"
        ></input>
        <span class="dark:text-slate-400 light:text-white scale-y-150 translate-y--10% select-none">
          /
        </span>
        <p class="p-x-2">{props.pageCount}</p>
      </div>
      <button
        onclick={() =>
          props.setCurrentIndex((props.currentIndex() + 1) % props.pageCount)
        }
        class="rounded-r-lg dark:bg-slate-700 light:bg-slate-400 p-2 text-5 dark:hover:bg-slate-800 light:hover:bg-slate-500 dark:active:bg-slate-900 light:active:bg-slate-600 transition-all transition-100 transition-ease-linear dark:b-slate-700 light:b-slate-400 b-r-1 b-t-1 b-b-1 b-solid"
      >
        <div class="i-mingcute-right-fill"></div>
      </button>
    </div>
  );
}
