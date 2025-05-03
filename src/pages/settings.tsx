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
    <section class="p-4 p-y-0 flex md:justify-center">
      <div class="md:min-w-2xl w-full md:w-a m-x-2 m-t-1">
        <h1 class="text-12 font-700 light:text-black dark:text-white">
          Settings
        </h1>
        <hr class="m-y-4 light:text-black dark:text-white rounded"></hr>
        <div class="flex flex-col gap-4 p-x-2">
          <div>
            <h2 class="text-7 font-600 light:text-black dark:text-white">
              Cache
            </h2>
            <p class="m-t--1 text-neutral-500 m-b-2">
              Clears cache of your Bluesky likes currently stored on this device
              (it can always be remade).
            </p>
            <Dialog>
              <Dialog.Trigger class="p-2 rounded text-white bg-red-700 hover:bg-red-800 active:bg-red-900 transition-all transition-100 transition-ease-linear">
                Clear cache
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay class="fixed inset-0 z-50 bg-black/50" />
                <Dialog.Content class="fixed left-50% top-50% z-50 min-w-80 translate-x--50% translate-y--50% rounded-lg b-2 px-6 py-5 light:b-neutral-200 light:bg-neutral-300 light:text-black dark:b-neutral-700 dark:bg-neutral-800 dark:text-white">
                  <Dialog.Label class="text-lg font-bold">
                    Clear cache
                  </Dialog.Label>
                  <Dialog.Description>
                    Are you sure you want to do this?
                  </Dialog.Description>
                  <div class="mt-3 flex justify-between text-white">
                    <Dialog.Close
                      class="rounded-md px-3 py-2 bg-red-700 hover:bg-red-800 active:bg-red-900 transition-all transition-100 transition-ease-linear"
                      on:click={() => {
                        ldb.delete("likes-cache");
                      }}
                    >
                      Yes
                    </Dialog.Close>
                    <Dialog.Close class="rounded-md px-3 py-2 bg-neutral-600 hover:bg-neutral-700 active:bg-neutral-900 transition-all transition-100 transition-ease-linear">
                      No
                    </Dialog.Close>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog>
          </div>
          <div>
            <h2 class="text-7 font-600 light:text-black dark:text-white m-b-1">
              Theme
            </h2>
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
                class="appearance-none rounded-2xl b-2 b-neutral w-4 h-4 m-y-auto relative checked:after:bg-blue-500 after:absolute after:top-50% after:left-50% after:translate-x--50% after:translate-y--50% checked:after:opacity-100 after:opacity-0 after:rounded-2xl after:w-2 after:h-2 after:content-[''] after:transition-all after:transition-100 after:transition-ease-linear"
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
                class="appearance-none rounded-2xl b-2 b-neutral w-4 h-4 m-y-auto relative checked:after:bg-blue-500 after:absolute after:top-50% after:left-50% after:translate-x--50% after:translate-y--50% checked:after:opacity-100 after:opacity-0 after:rounded-2xl after:w-2 after:h-2 after:content-[''] after:transition-all after:transition-100 after:transition-ease-linear"
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
                class="appearance-none rounded-2xl b-2 b-neutral w-4 h-4 m-y-auto relative checked:after:bg-blue-500 after:absolute after:top-50% after:left-50% after:translate-x--50% after:translate-y--50% checked:after:opacity-100 after:opacity-0 after:m-x-auto after:rounded-2xl after:text-transparent after:w-2 after:h-2 after:content-[''] after:transition-all after:transition-100 after:transition-ease-linear"
              />
              <label for="dark">Dark</label>
            </fieldset>
          </div>
        </div>
      </div>
    </section>
  );
}
