import Popover from "@corvu/popover";
import { Accessor, For, Setter, Show } from "solid-js";
import { SetStoreFunction, Store } from "solid-js/store";
import { AppBskyActorDefs } from "@atcute/bluesky";

export function PostFilter(props: {
  selectedAuthors: Accessor<string[]>;
  setSelectedAuthors: Setter<string[]>;
  embedOptions: Store<{
    none: boolean;
    image: boolean;
    video: boolean;
    post: boolean;
    external: boolean;
    isAllFalse: boolean;
  }>;
  setEmbedOptions: SetStoreFunction<{
    none: boolean;
    image: boolean;
    video: boolean;
    post: boolean;
    external: boolean;
    isAllFalse: boolean;
  }>;
  embedCount: Accessor<{
    none: number;
    image: number;
    video: number;
    post: number;
    external: number;
  }>;
  authors: AppBskyActorDefs.ProfileViewBasic[];
}) {
  return (
    <Popover
      floatingOptions={{
        offset: 12,
        shift: true,
        flip: true,
      }}
    >
      <Popover.Trigger class="rounded-lg dark:bg-slate-700 light:bg-slate-400 p-2 text-5 dark:hover:bg-slate-800 light:hover:bg-slate-500 dark:active:bg-slate-900 light:active:bg-slate-600 transition-all transition-100 transition-ease-linear b-1 dark:b-slate-700 light:b-slate-400">
        <div class="i-mingcute-filter-3-fill text-white"></div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content class="dark:bg-slate-800 light:bg-slate-500 p-2 rounded-lg text-white b-2 dark:b-slate-700 light:b-slate-400">
          <Popover.Label class="font-bold">Filter</Popover.Label>
          <hr class="m-y-2"></hr>
          <div class="flex flex-col gap-2 items-center">
            <label>Author:</label>
            <Popover>
              <Popover.Trigger class="w-88 p-2 b-1 b-white b-solid rounded-lg">
                <Show
                  when={props.selectedAuthors().length > 0}
                  fallback={
                    <span class="text-neutral">Select an author...</span>
                  }
                >
                  <div class="flex p-x-2 justify-between">
                    <span>Selected {props.selectedAuthors().length} items</span>
                    <button
                      onclick={() => {
                        props.setSelectedAuthors([]);
                      }}
                      class="p-x-2"
                    >
                      ⨉
                    </button>
                  </div>
                </Show>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content class="w-88 flex flex-col gap-0.5 max-h-64 overflow-y-auto dark:bg-slate-800 light:bg-slate-500 p-1 rounded-lg text-white b-2 dark:b-slate-700 light:b-slate-400">
                  <For each={props.authors}>
                    {(author) => {
                      return (
                        <button
                          class="max-h-9 h-9 h-full flex items-center gap-2 w-full p-x-1 rounded p-y-2 hover:bg-black/50 [&:not(.toggled)]:hover:bg-black/20 [&.toggled]:bg-black/40 transition-all transition-100 transition-ease-linear"
                          classList={{
                            toggled:
                              props
                                .selectedAuthors()
                                .find((val) => val == author.did) != undefined,
                          }}
                          onclick={(ev) => {
                            ev.currentTarget.classList.toggle("toggled");
                            if (
                              props
                                .selectedAuthors()
                                .find((val1) => val1 == author.did) == undefined
                            ) {
                              props.setSelectedAuthors([
                                author.did,
                                ...props.selectedAuthors(),
                              ]);
                            } else {
                              props.setSelectedAuthors(
                                props
                                  .selectedAuthors()
                                  .filter((val1) => val1 != author.did)
                              );
                            }
                          }}
                        >
                          <img
                            class="aspect-ratio-square max-h-7 rounded"
                            src={author.avatar}
                          />
                          <span>{author.handle}</span>
                        </button>
                      );
                    }}
                  </For>
                </Popover.Content>
              </Popover.Portal>
            </Popover>
          </div>
          <div class="p-t-2">
            <h4>Embeds:</h4>
            <ul class="flex flex-col p-l-1">
              <li class="flex gap-2">
                <input
                  type="checkbox"
                  checked={props.embedOptions.none}
                  onchange={(ev) =>
                    props.setEmbedOptions(
                      "none",
                      () => ev.currentTarget.checked
                    )
                  }
                  class="appearance-none rounded b-2 b-neutral w-4 h-4 m-y-auto relative checked:bg-blue-500 after:text-white after:i-mingcute-check-fill after:absolute after:top-50% after:left-50% after:translate-x--50% after:translate-y--50% checked:after:scale-100 after:scale-0 after:rounded-2xl after:w-3 after:h-3 after:content-[''] after:transition-all after:transition-100 after:transition-ease-linear"
                ></input>
                <label>None ({props.embedCount().none})</label>
              </li>
              <li class="flex gap-2">
                <input
                  type="checkbox"
                  checked={props.embedOptions.image}
                  onchange={(ev) =>
                    props.setEmbedOptions(
                      "image",
                      () => ev.currentTarget.checked
                    )
                  }
                  class="appearance-none rounded b-2 b-neutral w-4 h-4 m-y-auto relative checked:bg-blue-500 after:text-white after:i-mingcute-check-fill after:absolute after:top-50% after:left-50% after:translate-x--50% after:translate-y--50% checked:after:scale-100 after:scale-0 after:rounded-2xl after:w-3 after:h-3 after:content-[''] after:transition-all after:transition-100 after:transition-ease-linear"
                ></input>
                <label>Images ({props.embedCount().image})</label>
              </li>
              <li class="flex gap-2">
                <input
                  type="checkbox"
                  checked={props.embedOptions.video}
                  onchange={(ev) =>
                    props.setEmbedOptions(
                      "video",
                      () => ev.currentTarget.checked
                    )
                  }
                  class="appearance-none rounded b-2 b-neutral w-4 h-4 m-y-auto relative checked:bg-blue-500 after:text-white after:i-mingcute-check-fill after:absolute after:top-50% after:left-50% after:translate-x--50% after:translate-y--50% checked:after:scale-100 after:scale-0 after:rounded-2xl after:w-3 after:h-3 after:content-[''] after:transition-all after:transition-100 after:transition-ease-linear"
                ></input>
                <label>Videos ({props.embedCount().video})</label>
              </li>
              <li class="flex gap-2">
                <input
                  type="checkbox"
                  checked={props.embedOptions.post}
                  onchange={(ev) =>
                    props.setEmbedOptions(
                      "post",
                      () => ev.currentTarget.checked
                    )
                  }
                  class="appearance-none rounded b-2 b-neutral w-4 h-4 m-y-auto relative checked:bg-blue-500 after:text-white after:i-mingcute-check-fill after:absolute after:top-50% after:left-50% after:translate-x--50% after:translate-y--50% checked:after:scale-100 after:scale-0 after:rounded-2xl after:w-3 after:h-3 after:content-[''] after:transition-all after:transition-100 after:transition-ease-linear"
                ></input>
                <label>Posts ({props.embedCount().post})</label>
              </li>
              <li class="flex gap-2">
                <input
                  type="checkbox"
                  checked={props.embedOptions.external}
                  onchange={(ev) =>
                    props.setEmbedOptions(
                      "external",
                      () => ev.currentTarget.checked
                    )
                  }
                  class="appearance-none rounded b-2 b-neutral w-4 h-4 m-y-auto relative checked:bg-blue-500 after:text-white after:i-mingcute-check-fill after:absolute after:top-50% after:left-50% after:translate-x--50% after:translate-y--50% checked:after:scale-100 after:scale-0 after:rounded-2xl after:w-3 after:h-3 after:content-[''] after:transition-all after:transition-100 after:transition-ease-linear"
                ></input>
                <label>External ({props.embedCount().external})</label>
              </li>
            </ul>
          </div>
          <Popover.Arrow class="dark:text-slate-700 light:text-slate-400"></Popover.Arrow>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  );
}
