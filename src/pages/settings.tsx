import Dialog from "@corvu/dialog";
import ldb from "localdata";
import { colorScheme, docResolver, setColorScheme, xrpc } from "../app";
import { createSignal, onMount, Show } from "solid-js";
import { Did, isDid } from "@atcute/lexicons/syntax";
import { TextInput } from "../components/TextInput";

export default function Settings() {
  let autoRadio: HTMLInputElement;
  let lightRadio: HTMLInputElement;
  let darkRadio: HTMLInputElement;
  let appviewError: HTMLParagraphElement;

  const [masonryEnabled, setMasonryEnabled] = createSignal(
    (() => {
      return localStorage.getItem("masonry-enabled") !== null;
    })()
  );

  const [masonryColumnCount, setMasonryColumnCount] = createSignal(
    (() => {
      const saved = localStorage.getItem("masonry-columns");
      if (saved) return parseInt(saved);
      return 1;
    })()
  );

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

    // if (localStorage.getItem("proxyDid"))
    // appviewInput.value = localStorage.getItem("proxyDid");
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
                        ldb.delete("pins-cache");
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
          <div class="light:text-black dark:text-white">
            <h2 class="text-7 font-600 m-b-1">Masonry</h2>
            <p class="m-t--1 text-neutral-500 m-b-2">
              DISCLAIMER: Don't use on your phone. <br />
              Allows you to have multiple columns of posts.
            </p>
            <div class="flex gap-2">
              <input
                name="masonry-enabled"
                type="checkbox"
                class="appearance-none rounded b-2 b-neutral w-4 h-4 m-y-auto relative checked:bg-blue-500 after:text-white after:i-mingcute-check-fill after:absolute after:top-50% after:left-50% after:translate-x--50% after:translate-y--50% checked:after:scale-100 after:scale-0 after:rounded-2xl after:w-3 after:h-3 after:content-[''] after:transition-all after:transition-100 after:transition-ease-linear"
                checked={masonryEnabled()}
                onclick={(ev) => {
                  if (ev.currentTarget.checked) {
                    setMasonryEnabled(true);
                    localStorage.setItem("masonry-enabled", "");
                  } else {
                    setMasonryEnabled(false);
                    localStorage.removeItem("masonry-enabled");
                  }
                }}
              ></input>
              <label for="masonry-enabled">Enabled</label>
            </div>
            <Show when={masonryEnabled()}>
              <label>Column count: </label>
              <input
                type="number"
                min={1}
                max={3}
                value={masonryColumnCount()}
                onchange={(ev) => {
                  const num = ev.currentTarget.valueAsNumber;
                  if (!isNaN(num) && num > 0 && num <= 3) {
                    localStorage.setItem(
                      "masonry-columns",
                      ev.currentTarget.value
                    );
                    setMasonryColumnCount(ev.currentTarget.valueAsNumber);
                  } else {
                    ev.currentTarget.valueAsNumber = masonryColumnCount();
                  }
                }}
                class="b-neutral b-1 b-solid rounded p-l-1"
              ></input>
            </Show>
          </div>
          <div>
            <h2 class="text-7 font-600 light:text-black dark:text-white m-b-1">
              AppView
            </h2>
            <p class="m-t--1 text-neutral-500 m-b-2">
              Allows you to set which API backend you want to use for fetching
              data.
            </p>
            <TextInput
              placeholder="did:web:api.bsky.app"
              initialValue={localStorage.getItem("proxyDid")}
              onChange={async (value, setErrorState) => {
                if (value.trim() === "") {
                  setErrorState(false);
                  if (xrpc) xrpc.proxy.did = "did:web:api.bsky.app";
                  localStorage.removeItem("proxyDid");
                  appviewError.innerText = "";
                  return;
                }

                if (isDid(value.trim())) {
                  const doc = await docResolver.resolve(
                    value.trim() as Did<"plc"> | Did<"web">
                  );

                  if (doc.service.some((val) => val.id == "#bsky_appview")) {
                    localStorage.setItem("proxyDid", value.trim());
                    if (xrpc) xrpc.proxy.did = value.trim() as Did;
                    setErrorState(false);
                    appviewError.innerText = "";
                  } else {
                    setErrorState(true);
                    appviewError.innerText =
                      "Provided DID doesn't provide a Bluesky AppView.";
                  }
                } else {
                  setErrorState(true);
                  appviewError.innerText = "Invalid DID was provided.";
                }
              }}
            ></TextInput>
            <p ref={appviewError} class="text-red"></p>
          </div>
        </div>
      </div>
    </section>
  );
}
