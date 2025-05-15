import {
  Accessor,
  createEffect,
  createMemo,
  createSignal,
  ErrorBoundary,
  For,
  Match,
  onMount,
  Setter,
  Switch,
} from "solid-js";
import { agent, xrpc } from "../app";
import { BskyPost } from "../components/BskyPost";
import {
  AppBskyEmbedImages,
  AppBskyEmbedVideo,
  AppBskyFeedDefs,
  AppBskyFeedPost,
} from "@atcute/bluesky";
import { useQuery } from "@tanstack/solid-query";
import MiniSearch from "minisearch";
import ldb from "localdata";
import { LoadingIndicator } from "../components/LoadingIndicator";
import Dialog from "@corvu/dialog";
import { Did, ResourceUri } from "@atcute/lexicons";
import { Tabs } from "../components/Tabs";

export default function LoggedIn() {
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [searchVal, setSearchVal] = createSignal("");
  const [selectedTab, setSelectedTab] = createSignal<"likes" | "pins">(
    localStorage.getItem("lastTab")
      ? (localStorage.getItem("lastTab") as "likes" | "pins")
      : "likes"
  );

  let searcher;
  try {
    searcher = new MiniSearch({
      idField: "cid",
      fields: ["text", "alt"],
      extractField: (document, fieldName) => {
        const feedViewPost = document as AppBskyFeedDefs.PostView;

        if (fieldName == "cid") {
          return feedViewPost.cid;
        }

        if (fieldName == "text") {
          const record = feedViewPost.record as AppBskyFeedPost.Main;
          return record.text;
        }

        if (fieldName == "alt") {
          let alt = "";
          if (feedViewPost.embed === undefined) return alt;

          switch (feedViewPost.embed.$type) {
            case "app.bsky.embed.images#view":
              const imageView = feedViewPost.embed as AppBskyEmbedImages.View;
              alt = imageView.images.map((image) => image.alt).join("\n");
              break;
            case "app.bsky.embed.video#view": {
              const videoView = feedViewPost.embed as AppBskyEmbedVideo.View;
              alt = videoView.alt;
            }
          }
          return alt;
        }

        return "";
      },
    });
  } catch (error) {
    console.error(error);
  }

  let refetch = false;

  const likesQuery = useQuery(() => ({
    queryFn: async () => {
      try {
        let likes: AppBskyFeedDefs.PostView[] = [];

        const cacheJson = await new Promise(
          (resolve: (value: string) => void, reject) => {
            ldb.get("likes-cache", (value) => {
              resolve(value);
            });
          }
        );

        if (refetch) {
          let cursor = undefined;

          refetch = false;

          do {
            const res = await xrpc.get("app.bsky.feed.getActorLikes", {
              params: {
                actor: agent.sub as Did,
                cursor: cursor,
                limit: 100,
              },
            });
            if (!res.ok) {
              throw new Error(JSON.stringify(res.data));
            }

            likes.push(
              ...res.data.feed.map((feedViewPost) => feedViewPost.post)
            );
            cursor = res.data.cursor;
            if (res.data.feed.length === 0) {
              cursor = undefined;
            }
          } while (cursor);

          ldb.set("likes-cache", JSON.stringify(likes));
        } else if (cacheJson == null) {
          return null;
        } else {
          likes = JSON.parse(cacheJson);
        }

        try {
          searcher.removeAll();
          searcher.addAll(likes);
        } catch (error) {
          console.error(error);
        }

        return likes;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    queryKey: ["likes"],
    enabled: selectedTab() === "likes",
  }));

  const pinsQuery = useQuery(() => ({
    queryFn: async () => {
      try {
        let pins: AppBskyFeedDefs.PostView[] = [];

        const cacheJson = await new Promise(
          (resolve: (value: string) => void, reject) => {
            ldb.get("pins-cache", (value) => {
              resolve(value);
            });
          }
        );

        if (refetch) {
          let cursor = undefined;

          refetch = false;

          let pinsRefs: {
            cid: string;
            uri: ResourceUri;
            $type?: "com.atproto.repo.strongRef";
          }[] = [];

          do {
            const res = await xrpc.get("app.bsky.feed.searchPosts", {
              params: {
                q: "from:me 📌",
                cursor: cursor,
                limit: 100,
                sort: "latest",
              },
            });
            if (!res.ok) {
              throw new Error(JSON.stringify(res.data));
            }

            pinsRefs.push(
              ...res.data.posts
                .map((comment) => {
                  const commentPost = comment.record as AppBskyFeedPost.Main;
                  if (commentPost.text.trim() !== "📌") return null;
                  return commentPost.reply ? commentPost.reply.parent : null;
                })
                .filter((ref) => ref)
            );
            cursor = res.data.cursor;
            if (res.data.posts.length === 0) {
              cursor = undefined;
            }
          } while (cursor);

          while (pinsRefs.length > 0) {
            const res = await xrpc.get("app.bsky.feed.getPosts", {
              params: {
                uris: pinsRefs.splice(0, 25).map((ref) => ref.uri),
              },
            });
            if (!res.ok) {
              throw new Error(JSON.stringify(res.data));
            }

            pins.push(...res.data.posts);
          }

          ldb.set("pins-cache", JSON.stringify(pins));
        } else if (cacheJson == null) {
          return null;
        } else {
          pins = JSON.parse(cacheJson);
        }

        try {
          searcher.removeAll();
          searcher.addAll(pins);
        } catch (error) {
          console.error(error);
        }

        return pins;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    queryKey: ["pins"],
    enabled: selectedTab() === "pins",
  }));

  onMount(() => {
    if (searcher && currentQuery().isSuccess && currentQuery().data != null) {
      try {
        searcher.removeAll();
        searcher.addAll(currentQuery().data);
      } catch (error) {
        console.error(error);
      }
    }
  });

  const currentQuery = () => {
    switch (selectedTab()) {
      case "likes":
        return likesQuery;
      case "pins":
        return pinsQuery;
      default:
        throw new Error("how tf did we fail in currentQuery?");
    }
  };

  const filteredPosts = createMemo(() => {
    if (!currentQuery().isSuccess) return [];

    if (searchVal().trim() === "") return currentQuery().data;

    const result = searcher.search(searchVal(), { fuzzy: 0.1 });

    const data = currentQuery().data.filter(
      (val) => result.find((res) => res.id == val.cid) !== undefined
    );

    console.log([result, data, searchVal()]);

    return data;
  });

  const pageCount = createMemo(() => {
    return Math.ceil(filteredPosts()?.length / 50);
  });

  createEffect(() => {
    if (currentIndex() > pageCount()) {
      setCurrentIndex(pageCount());
    }
  });

  const ErrorScreen = (props: { reset?: () => void }) => {
    return (
      <div>
        <div class="flex items-center flex-col b-2 b-red-500 b-dashed w-max h-max p-4 rounded-xl absolute top-45% left-50% translate-x--50% translate-y--50% gap-2">
          <p class="text-center dark:text-white light:text-black">
            An error occured.
            <br /> Would you like to re-index the data?
          </p>
          <button
            class="bg-neutral-600 text-white p-2 rounded w-48 hover:bg-neutral-700 active:bg-neutral-800 transition-all transition-100 transition-ease-linear"
            onclick={async () => {
              refetch = true;
              await currentQuery().refetch();
              if (props.reset) props.reset();
            }}
          >
            <Switch fallback={"Index"}>
              <Match when={currentQuery().isFetching}>
                <div class="text-6 flex justify-center">
                  <LoadingIndicator />
                </div>
              </Match>
            </Switch>
          </button>
        </div>
      </div>
    );
  };

  return (
    <section class="p-y-2 p-x-2">
      <div class="flex w-full justify-center m-b-2">
        <Tabs
          setValue={(value: string) => {
            localStorage.setItem("lastTab", value);
            setSelectedTab(value as "likes" | "pins");
          }}
          getValue={selectedTab}
          values={[
            { value: "likes", displayName: "Likes" },
            { value: "pins", displayName: "Pins 📌" },
          ]}
        ></Tabs>
      </div>

      <Switch>
        <Match when={currentQuery().isSuccess && currentQuery().data != null}>
          <ErrorBoundary
            fallback={(err, reset) => <ErrorScreen reset={reset}></ErrorScreen>}
          >
            <div class="m-b-1">
              <div class="flex justify-center gap-2">
                <Dialog>
                  <Dialog.Trigger class="text-6 dark:text-white light:text-black hover:rotate-180 transition-all transition-300 transition-ease-in-out">
                    <div class="i-mingcute-refresh-3-line"></div>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/50" />
                    <Dialog.Content class="fixed left-50% top-50% z-50 min-w-80 translate-x--50% translate-y--50% rounded-lg b-2 px-6 py-5 light:b-neutral-200 light:bg-neutral-300 light:text-black dark:b-neutral-700 dark:bg-neutral-800 dark:text-white">
                      <Dialog.Label class="text-lg font-bold">
                        Refresh the cache?
                      </Dialog.Label>
                      <Dialog.Description class="text-wrap">
                        This will update currently cached likes. <br />
                        This will take a minute.
                      </Dialog.Description>
                      <div class="mt-3 flex justify-between text-white">
                        <Dialog.Close
                          class="rounded-md px-3 py-2 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 transition-all transition-100 transition-ease-linear"
                          on:click={() => {
                            refetch = true;
                            currentQuery().refetch();
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

                <div class="b-gray b-1 b-solid rounded p-1 light:[&:focus-within]:b-gray-900 dark:[&:focus-within]:b-gray-100 box-content [&:focus-within]:b-2 [&:focus-within]:m--1px light:text-black dark:text-white">
                  <input
                    style={{ border: "none", outline: "none" }}
                    type="text"
                    placeholder="Search..."
                    onchange={(ev) => setSearchVal(ev.target.value)}
                    value={searchVal()}
                  ></input>
                  <button onClick={() => setSearchVal("")}>⨉</button>
                </div>
              </div>
              <div class="m-y-2">
                <PaginationButtons
                  currentIndex={currentIndex}
                  setCurrentIndex={setCurrentIndex}
                  pageCount={Math.ceil(filteredPosts()?.length / 50)}
                ></PaginationButtons>
              </div>
            </div>
            <div class="flex justify-center">
              <ul class="flex flex-col gap-2">
                <For
                  each={filteredPosts()?.slice(
                    0 + currentIndex() * 50,
                    50 + currentIndex() * 50 > filteredPosts()?.length
                      ? filteredPosts()?.length
                      : 50 + currentIndex() * 50
                  )}
                  children={(item) => {
                    return (
                      <li class="max-w-[min(36rem,calc(100vw-32px))]">
                        <BskyPost post={item}></BskyPost>
                      </li>
                    );
                  }}
                />
              </ul>
            </div>
            <div class="m-t-2">
              <PaginationButtons
                currentIndex={currentIndex}
                setCurrentIndex={setCurrentIndex}
                pageCount={pageCount()}
              ></PaginationButtons>
            </div>
          </ErrorBoundary>
        </Match>
        <Match when={currentQuery().data == null}>
          <div>
            <div class="flex items-center flex-col b-2 b-blue-500 b-dashed w-max h-max p-4 rounded-xl absolute top-45% left-50% translate-x--50% translate-y--50% gap-2">
              <p class="text-center dark:text-white light:text-black">
                Data hasn't been indexed yet.
                <br /> Would you like to?
              </p>
              <button
                class="bg-neutral-600 text-white p-2 rounded w-48 hover:bg-neutral-700 active:bg-neutral-800 transition-all transition-100 transition-ease-linear"
                onclick={() => {
                  refetch = true;
                  currentQuery().refetch();
                }}
              >
                <Switch fallback={"Index"}>
                  <Match when={currentQuery().isFetching}>
                    <div class="text-6 flex justify-center">
                      <LoadingIndicator />
                    </div>
                  </Match>
                </Switch>
              </button>
            </div>
          </div>
        </Match>
      </Switch>
    </section>
  );
}

function PaginationButtons(props: {
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
