import Dialog from "@corvu/dialog";
import ldb from "localdata";
import { colorScheme, setColorScheme } from "../app";
import { onMount } from "solid-js";

export default function Settings() {
  let autoRadio: HTMLInputElement;
  let lightRadio: HTMLInputElement;
  let darkRadio: HTMLInputElement;

  onMount(() => {
    switch (colorScheme()) {
      case "auto":
        autoRadio.checked = true;
        break;
      case "light":
        lightRadio.checked = true;
        break;
      case "dark":
        darkRadio.checked = true;
        break;
    }
  });

  return (
    <section class="p-2">
      <h1 class="text-8 font-700 m-b-2 light:text-black dark:text-white">
        Settings
      </h1>
      <h2 class="text-7 font-600 light:text-black dark:text-white">Cache</h2>
      <Dialog>
        <Dialog.Trigger class="p-2 rounded bg-red-700 b-1 b-red-600 b-solid text-white">
          Clear cache
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay class="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content class="fixed left-50% top-50% z-50 min-w-80 translate-x--50% translate-y--50% rounded-lg b-2 b-neutral-700 px-6 py-5 bg-neutral-800 text-white">
            <Dialog.Label class="text-lg font-bold">Clear cache</Dialog.Label>
            <div class="mt-3 flex justify-between">
              <Dialog.Close class="rounded-md px-3 py-2 bg-neutral-600">
                Close
              </Dialog.Close>
              <Dialog.Close
                class="rounded-md px-3 py-2 bg-red-700"
                on:click={() => {
                  ldb.delete("likes-cache");
                }}
              >
                Confirm
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
      <h2 class="text-7 font-600 light:text-black dark:text-white">Theme</h2>
      <fieldset class="flex gap-2 light:text-black dark:text-white">
        <input
          type="radio"
          id="auto"
          value="auto"
          name="theme"
          ref={autoRadio}
          onchange={() => {
            setColorScheme("auto");
          }}
        />
        <label for="auto">System</label>
        <input
          type="radio"
          id="light"
          value="light"
          name="theme"
          ref={lightRadio}
          onchange={() => {
            setColorScheme("light");
          }}
        />
        <label for="light">Light</label>
        <input
          type="radio"
          id="dark"
          value="dark"
          name="theme"
          ref={darkRadio}
          onchange={() => {
            setColorScheme("dark");
          }}
        />
        <label for="dark">Dark</label>
      </fieldset>
    </section>
  );
}
