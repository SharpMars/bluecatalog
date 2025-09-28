import Popover from "@corvu/popover";
import { Accessor, createEffect, createSignal, For, Setter, Show, Suspense } from "solid-js";
import { SetStoreFunction, Store } from "solid-js/store";
import { AppBskyActorDefs } from "@atcute/bluesky";
import { createVirtualizer } from "@tanstack/solid-virtual";
import { useInfiniteQuery } from "@tanstack/solid-query";
import { xrpc } from "../app";
import { FetchData } from "../fetching/fetch-data";
import MiniSearch, { SearchResult } from "minisearch";

function AuthorsPopup(props: {
  authors: FetchData["authors"];
  selectedAuthors: Accessor<string[]>;
  setSelectedAuthors: Setter<string[]>;
}) {
  let authorListRef: HTMLDivElement;
  let searchIndexSelectorRef: HTMLInputElement;

  const searcher = new MiniSearch({
    fields: ["handle"],
    extractField: (document, fieldName) => {
      const author = document as { id: number; handle: string };
      if (fieldName == "id") {
        return author.id.toString();
      }

      if (fieldName == "handle") {
        return author.handle;
      }
    },
  });

  const [searchRes, setSearchRes] = createSignal<SearchResult[]>([]);
  const [searchIndex, setSearchIndex] = createSignal<number>(0);

  createEffect(() => {
    searcher.removeAll();
    searcher.addAll(props.authors.map((value, i) => ({ id: i, handle: value.handle })));
  });

  createEffect(() => {
    if (searchRes().length > 0) {
      searchIndexSelectorRef.valueAsNumber = 1;
      setSearchIndex(1);
    } else {
      searchIndexSelectorRef.valueAsNumber = 0;
      setSearchIndex(0);
    }
  });

  createEffect(() => {
    if (searchRes().length > 0 && searchIndex() > 0) {
      const selectedRes = searchRes()[searchIndex() - 1];
      if (selectedRes) rowVirtualizer.scrollToIndex(parseInt(selectedRes.id), { align: "start", behavior: "auto" });
    }
  });

  const [reqPage, setReqPage] = createSignal(0);

  const avatarQuery = useInfiniteQuery(() => ({
    queryFn: async ({ pageParam, signal }) => {
      const res = await xrpc.get("app.bsky.actor.getProfiles", {
        params: {
          actors: props.authors.slice(0 + pageParam * 25, 25 + pageParam * 25).map((val) => val.did),
          signal: signal,
        },
      });

      if (!res.ok) throw new Error(JSON.stringify(res.data));

      const map = new Map(res.data.profiles.filter((val) => val.avatar).map((val) => [val.did, val.avatar]));

      return map;
    },
    initialPageParam: 0,
    getNextPageParam: () => reqPage(),
    queryKey: ["avatar", JSON.stringify(props.authors)],
  }));

  const rowVirtualizer = createVirtualizer({
    count: props.authors.length,
    getScrollElement: () => authorListRef,
    estimateSize: () => 36,
  });

  function requestPage(i: number) {
    if (reqPage() == i || (avatarQuery.data && avatarQuery.data.pageParams.findIndex((val) => val == i) != -1)) return;

    setReqPage(i);
    avatarQuery.fetchNextPage();
  }

  return (
    <>
      <div class="flex gap-2 h-7">
        <input
          class="flex-grow-1 dark:bg-slate-900 rounded-md p-l-1 min-w-0"
          type="text"
          placeholder="Search..."
          oninput={(ev) => {
            const value = ev.currentTarget.value;
            setSearchRes(searcher.search(value, { fuzzy: 0.3, prefix: true }));
          }}
        />
        <div class="flex gap-1 items-center flex-nowrap text-nowrap">
          <input
            class="min-w-0 dark:bg-slate-900 rounded-md p-l-1 overflow-hidden h-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            value={searchIndex()}
            ref={searchIndexSelectorRef}
            type="number"
            min={searchRes().length > 0 ? 1 : 0}
            max={searchRes().length}
            onchange={(ev) => {
              console.log("onchange");

              if (isNaN(ev.currentTarget.valueAsNumber))
                ev.currentTarget.valueAsNumber = searchRes().length > 0 ? 1 : 0;
              setSearchIndex(ev.currentTarget.valueAsNumber);
            }}
            oninput={(ev) => {
              let val = ev.currentTarget.valueAsNumber;

              if (ev.currentTarget.value == "") return;

              if (isNaN(val)) {
                ev.currentTarget.valueAsNumber = searchRes().length > 0 ? 1 : 0;
                //setSearchIndex(searchRes().length > 0 ? 1 : 0);
              }

              if (searchRes().length > 0) {
                if (val > searchRes().length) val = searchRes().length;

                if (val < 1) val = 1;
              } else val = 0;

              ev.currentTarget.valueAsNumber = val;
              setSearchIndex(val);
            }}
          />
          <span class="select-none">/ {searchRes().length} </span>
        </div>
        <div class="flex gap-2 text-5">
          <button
            class="w-fit p-1 rounded-xl hover:bg-white/25 active:bg-white/50 aspect-ratio-square flex justify-center items-center transition-all transition-100 transition-ease-in-out"
            onclick={() => {
              if (searchRes().length == 0) return;

              setSearchIndex((searchIndex() + 1) % (searchRes().length + 1) == 0 ? 1 : searchIndex() + 1);
            }}
          >
            <div class="i-mingcute-up-line" />
          </button>
          <button
            class="w-fit p-1 rounded-xl hover:bg-white/25 active:bg-white/50 aspect-ratio-square flex justify-center items-center transition-all transition-100 transition-ease-in-out"
            onclick={() => {
              if (searchRes().length == 0) return;

              setSearchIndex(searchIndex() - 1 < 1 ? searchRes().length : searchIndex() - 1);
            }}
          >
            <div class="i-mingcute-down-line" />
          </button>
        </div>
      </div>
      <div ref={authorListRef} class="h-full overflow-y-auto relative">
        <div style={{ width: "100%", height: `${rowVirtualizer.getTotalSize()}px` }}>
          <For each={rowVirtualizer.getVirtualItems()}>
            {(item) => {
              const did = props.authors[item.index].did;
              const pageId = Math.floor(item.index / 25);

              requestPage(pageId);

              const avatar = () => {
                if (avatarQuery.data) {
                  const pageIndex = avatarQuery.data.pageParams.findIndex((val) => val == pageId);
                  if (pageIndex == -1) return "./fallback.svg";

                  const page = avatarQuery.data.pages[pageIndex];
                  if (page && page.has(did)) return page.get(did);
                }

                return "./fallback.svg";
              };

              const isHighlighted = () => {
                return !!searchRes().find((val) => parseInt(val.id) == item.index);
              };

              return (
                <button
                  class="max-h-9 h-9 h-full flex items-center gap-2 w-full p-x-1 rounded p-y-2 hover:bg-black/50 [&:not(.toggled)]:hover:bg-black/20 [&.toggled]:bg-black/40
                  transition-all transition-100 transition-ease-linear"
                  classList={{
                    toggled: props.selectedAuthors().find((val) => val == did) != undefined,
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${item.size}px`,
                    transform: `translateY(${item.start}px)`,
                  }}
                  onclick={(ev) => {
                    ev.currentTarget.classList.toggle("toggled");
                    if (props.selectedAuthors().find((val1) => val1 == did) == undefined) {
                      props.setSelectedAuthors([did, ...props.selectedAuthors()]);
                    } else {
                      props.setSelectedAuthors(props.selectedAuthors().filter((val1) => val1 != did));
                    }
                  }}
                >
                  <Suspense
                    fallback={<img class="aspect-ratio-square max-h-7 rounded" src={"./fallback.svg"} loading="lazy" />}
                  >
                    <img class="aspect-ratio-square max-h-7 rounded" src={avatar()} loading="lazy" />
                  </Suspense>
                  <span
                    class="[&.highlight]:bg-amber [&.highlight]:text-black"
                    classList={{
                      highlight: isHighlighted(),
                    }}
                  >
                    {props.authors[item.index].handle}
                  </span>
                </button>
              );
            }}
          </For>
        </div>
      </div>
    </>
  );
}

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
                  fallback={<span class="text-neutral">Select an author...</span>}
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
                <Popover.Content class="w-88 flex flex-col gap-0.5 max-h-64 dark:bg-slate-800 light:bg-slate-500 p-1 rounded-lg text-white b-2 dark:b-slate-700 light:b-slate-400">
                  <AuthorsPopup
                    selectedAuthors={props.selectedAuthors}
                    setSelectedAuthors={props.setSelectedAuthors}
                    authors={props.authors}
                  />
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
                  onchange={(ev) => props.setEmbedOptions("none", () => ev.currentTarget.checked)}
                  class="appearance-none rounded b-2 b-neutral w-4 h-4 m-y-auto relative checked:bg-blue-500 after:text-white after:i-mingcute-check-fill after:absolute after:top-50% after:left-50% after:translate-x--50% after:translate-y--50% checked:after:scale-100 after:scale-0 after:rounded-2xl after:w-3 after:h-3 after:content-[''] after:transition-all after:transition-100 after:transition-ease-linear"
                ></input>
                <label>None ({props.embedCount().none})</label>
              </li>
              <li class="flex gap-2">
                <input
                  type="checkbox"
                  checked={props.embedOptions.image}
                  onchange={(ev) => props.setEmbedOptions("image", () => ev.currentTarget.checked)}
                  class="appearance-none rounded b-2 b-neutral w-4 h-4 m-y-auto relative checked:bg-blue-500 after:text-white after:i-mingcute-check-fill after:absolute after:top-50% after:left-50% after:translate-x--50% after:translate-y--50% checked:after:scale-100 after:scale-0 after:rounded-2xl after:w-3 after:h-3 after:content-[''] after:transition-all after:transition-100 after:transition-ease-linear"
                ></input>
                <label>Images ({props.embedCount().image})</label>
              </li>
              <li class="flex gap-2">
                <input
                  type="checkbox"
                  checked={props.embedOptions.video}
                  onchange={(ev) => props.setEmbedOptions("video", () => ev.currentTarget.checked)}
                  class="appearance-none rounded b-2 b-neutral w-4 h-4 m-y-auto relative checked:bg-blue-500 after:text-white after:i-mingcute-check-fill after:absolute after:top-50% after:left-50% after:translate-x--50% after:translate-y--50% checked:after:scale-100 after:scale-0 after:rounded-2xl after:w-3 after:h-3 after:content-[''] after:transition-all after:transition-100 after:transition-ease-linear"
                ></input>
                <label>Videos ({props.embedCount().video})</label>
              </li>
              <li class="flex gap-2">
                <input
                  type="checkbox"
                  checked={props.embedOptions.post}
                  onchange={(ev) => props.setEmbedOptions("post", () => ev.currentTarget.checked)}
                  class="appearance-none rounded b-2 b-neutral w-4 h-4 m-y-auto relative checked:bg-blue-500 after:text-white after:i-mingcute-check-fill after:absolute after:top-50% after:left-50% after:translate-x--50% after:translate-y--50% checked:after:scale-100 after:scale-0 after:rounded-2xl after:w-3 after:h-3 after:content-[''] after:transition-all after:transition-100 after:transition-ease-linear"
                ></input>
                <label>Posts ({props.embedCount().post})</label>
              </li>
              <li class="flex gap-2">
                <input
                  type="checkbox"
                  checked={props.embedOptions.external}
                  onchange={(ev) => props.setEmbedOptions("external", () => ev.currentTarget.checked)}
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
