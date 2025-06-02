import { createSignal, JSXElement, onMount, Setter, Show } from "solid-js";

export function TextInput(props: {
  placeholder: string;
  icon?: JSXElement;
  onChange?: (value: string, setErrorState: Setter<boolean>) => void;
  initialValue?: string;
}) {
  const [hasText, setHasText] = createSignal(false);
  const [isErrorState, setIsErrorState] = createSignal(false);
  let inputElement: HTMLInputElement;

  onMount(() => {
    if (props.initialValue && props.initialValue.length > 0) {
      setHasText(true);
    }
  });

  return (
    <div
      class="b-gray b-1 b-solid rounded p-1 light:[&:focus-within]:b-gray-900 dark:[&:focus-within]:b-gray-100 box-content [&:focus-within]:b-2 [&:focus-within]:m--1px light:text-black dark:text-white flex overflow-hidden gap-1 cursor-text"
      style={isErrorState() ? { "border-color": "red" } : undefined}
      onclick={() => inputElement.focus()}
    >
      <Show when={props.icon}>
        <div>{props.icon}</div>
      </Show>
      <input
        class="border-none outline-0 placeholder-neutral-500 flex-1 transition-100 transition-all transition-ease-in-out"
        type="text"
        placeholder={props.placeholder}
        ref={inputElement}
        oninput={(ev) => {
          if (ev.currentTarget.value.length > 0) {
            setHasText(true);
          }
        }}
        onchange={(ev) => {
          props.onChange(ev.currentTarget.value, setIsErrorState);
          setHasText(ev.currentTarget.value.length > 0);
        }}
        onBlur={(ev) => {
          if (ev.currentTarget.value.trim() == "") {
            ev.currentTarget.value = "";
            setHasText(false);
          }
        }}
        value={/*@once*/ props.initialValue ?? ""}
      ></input>
      <Show when={hasText()}>
        <button
          class="text-5 aspect-ratio-square p-x-2px group"
          onclick={(ev) => {
            ev.stopPropagation();
            inputElement.value = "";
            inputElement.dispatchEvent(new Event("change"));
          }}
        >
          <div class="i-mingcute-close-fill group-hover:rotate-180 transition-400 transition-all transition-ease-in-out"></div>
        </button>
      </Show>
    </div>
  );
}
