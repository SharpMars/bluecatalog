import {
  createEffect,
  createMemo,
  createSignal,
  ErrorBoundary,
  For,
  Match,
  on,
  onMount,
  Show,
  Switch,
} from "solid-js";
import {
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
  AppBskyFeedDefs,
  AppBskyFeedPost,
} from "@atcute/bluesky";
import { useQuery } from "@tanstack/solid-query";
import MiniSearch from "minisearch";
import { LoadingIndicator } from "../components/LoadingIndicator";
import Dialog from "@corvu/dialog";
import { Tabs } from "../components/Tabs";
import { PaginationButtons } from "../components/PaginationButtons";
import { fetchLikes } from "../fetching/likes";
import { fetchPins } from "../fetching/pins";
import { PostList } from "../components/PostList";
import { FetchData } from "../fetching/fetch-data";
import Popover from "@corvu/popover";
import { TextInput } from "../components/TextInput";
import { $type } from "@atcute/lexicons";
import { createStore } from "solid-js/store";

export default function LoggedIn() {
  const [currentIndex, setCurrentIndex] = createSignal(
    sessionStorage.getItem("currentIndex")
      ? parseInt(sessionStorage.getItem("currentIndex"))
      : 0
  );
  const [searchVal, setSearchVal] = createSignal("");
  const [selectedAuthors, setSelectedAuthors] = createSignal<string[]>([]);
  const [selectedTab, setSelectedTab] = createSignal<"likes" | "pins">(
    localStorage.getItem("lastTab")
      ? (localStorage.getItem("lastTab") as "likes" | "pins")
      : "likes"
  );
  const [embedOptions, setEmbedOptions] = createStore<{
    none: boolean;
    image: boolean;
    video: boolean;
    post: boolean;
    external: boolean;
    isAllFalse: boolean;
  }>({
    none: false,
    image: false,
    video: false,
    post: false,
    external: false,
    isAllFalse: true,
  });

  createEffect(() => {
    setEmbedOptions("isAllFalse", () => {
      return (
        !embedOptions.none &&
        !embedOptions.image &&
        !embedOptions.video &&
        !embedOptions.post &&
        !embedOptions.external
      );
    });
  });

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

  const postsQuery = useQuery(() => ({
    queryFn: async ({ queryKey }) => {
      try {
        let data: FetchData;
        switch (queryKey[0]) {
          case "likes":
            data = await fetchLikes(refetch);
            break;
          case "pins":
            data = await fetchPins(refetch);
            break;
          default:
            throw new Error("unimplemented fetching");
        }
        refetch = false;

        if (data === null) {
          return null;
        }

        try {
          searcher.removeAll();
          searcher.addAll(data.posts);
        } catch (error) {
          console.error(error);
        }

        return data;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    queryKey: [selectedTab()],
  }));

  onMount(() => {
    if (searcher && postsQuery.isSuccess && postsQuery.data != null) {
      try {
        searcher.removeAll();
        searcher.addAll(postsQuery.data.posts);
      } catch (error) {
        console.error(error);
      }
    }
  });

  createEffect(
    on(selectedTab, () => {
      setSelectedAuthors([]);
    })
  );

  const searchedPosts = createMemo(() => {
    if (!postsQuery.isSuccess || postsQuery.data == null) return [];

    let posts = postsQuery.data.posts;

    if (searchVal().trim() !== "") {
      const result = searcher.search(searchVal(), { fuzzy: 0.2 });

      posts = posts.filter(
        (val) => result.find((res) => res.id == val.cid) !== undefined
      );
    }

    return posts;
  });

  const filteredPosts = createMemo(() => {
    let posts = searchedPosts();

    if (posts.length == 0) return posts;

    if (selectedAuthors().length > 0) {
      posts = posts.filter(
        (val) =>
          selectedAuthors().find((author) => author == val.author.did) !==
          undefined
      );
    }

    if (!embedOptions.isAllFalse) {
      posts = posts.filter((val) => {
        const res = {
          none: 0,
          image: 0,
          video: 0,
          post: 0,
          external: 0,
        };

        countEmbeds(res, val.embed);

        return (
          (embedOptions.none && res.none > 0) ||
          (embedOptions.image && res.image > 0) ||
          (embedOptions.video && res.video > 0) ||
          (embedOptions.post && res.post > 0) ||
          (embedOptions.external && res.external > 0)
        );
      });
    }

    if (searchVal().trim() !== "") {
      const result = searcher.search(searchVal(), { fuzzy: 0.2 });

      posts = posts.filter(
        (val) => result.find((res) => res.id == val.cid) !== undefined
      );
    }

    return posts;
  });

  const pageCount = createMemo(() => {
    return Math.ceil(filteredPosts()?.length / 50);
  });

  const currentPagePosts = createMemo(() =>
    filteredPosts()?.slice(
      0 + currentIndex() * 50,
      50 + currentIndex() * 50 > filteredPosts()?.length
        ? filteredPosts()?.length
        : 50 + currentIndex() * 50
    )
  );

  function countEmbeds(
    res: {
      none: number;
      image: number;
      video: number;
      post: number;
      external: number;
    },
    embed?: $type.enforce<
      | AppBskyEmbedExternal.View
      | AppBskyEmbedImages.View
      | AppBskyEmbedRecord.View
      | AppBskyEmbedRecordWithMedia.View
      | AppBskyEmbedVideo.View
    >,
    recursed?: true
  ) {
    if (embed) {
      switch (embed.$type) {
        case "app.bsky.embed.images#view":
          res.image++;
          break;
        case "app.bsky.embed.video#view":
          res.video++;
          break;
        case "app.bsky.embed.external#view":
          res.external++;
          break;
        case "app.bsky.embed.record#view":
          if (!recursed) {
            res.post++;

            if (
              embed.record.$type == "app.bsky.embed.record#viewRecord" &&
              embed.record.embeds?.length > 0
            ) {
              for (const innerEmbed of embed.record.embeds) {
                countEmbeds(res, innerEmbed, true);
              }
            }
          }
          break;
        case "app.bsky.embed.recordWithMedia#view":
          countEmbeds(res, embed.media, true);
          if (!recursed) {
            res.post++;

            if (
              embed.record.record.$type == "app.bsky.embed.record#viewRecord" &&
              embed.record.record?.embeds.length > 0
            ) {
              for (const innerEmbed of embed.record.record.embeds) {
                countEmbeds(res, innerEmbed, true);
              }
            }
          }
          break;
        default:
          break;
      }
    } else res.none++;
  }

  const embedCount = createMemo(() => {
    const res = {
      none: 0,
      image: 0,
      video: 0,
      post: 0,
      external: 0,
    };

    if (postsQuery.isSuccess) {
      for (const post of searchedPosts()) {
        countEmbeds(res, post.embed);
      }
    }

    return res;
  });

  createEffect(() => {
    if (pageCount() == 0) {
      setCurrentIndex(-1);
    } else if (currentIndex() == -1 && pageCount() > 0) {
      setCurrentIndex(0);
    } else if (currentIndex() >= pageCount()) {
      setCurrentIndex(pageCount() - 1);
    }

    sessionStorage.setItem("currentIndex", currentIndex().toString());
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
              await postsQuery.refetch();
              if (props.reset) props.reset();
            }}
          >
            <Switch fallback={"Index"}>
              <Match when={postsQuery.isFetching}>
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
        <Match when={postsQuery.isError}>
          <ErrorScreen reset={() => {}}></ErrorScreen>;
        </Match>
        <Match when={postsQuery.isSuccess && postsQuery.data != null}>
          <ErrorBoundary
            fallback={(err, reset) => {
              console.error(err);
              return <ErrorScreen reset={reset}></ErrorScreen>;
            }}
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
                            postsQuery.refetch();
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
                <TextInput
                  icon={<div class="i-mingcute-search-2-fill h-full"></div>}
                  placeholder="Search..."
                  onChange={(value) => setSearchVal(value)}
                ></TextInput>
                <Popover
                  floatingOptions={{
                    offset: 12,
                    shift: true,
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
                              when={selectedAuthors().length > 0}
                              fallback={
                                <span class="text-neutral">
                                  Select an author...
                                </span>
                              }
                            >
                              <div class="flex p-x-2 justify-between">
                                <span>
                                  Selected {selectedAuthors().length} items
                                </span>
                                <button
                                  onclick={() => {
                                    setSelectedAuthors([]);
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
                              <For each={postsQuery.data.authors}>
                                {(author) => {
                                  return (
                                    <button
                                      class="max-h-9 h-9 h-full flex items-center gap-2 w-full p-x-1 rounded p-y-2 hover:bg-black/50 [&:not(.toggled)]:hover:bg-black/20 [&.toggled]:bg-black/40 transition-all transition-100 transition-ease-linear"
                                      classList={{
                                        toggled:
                                          selectedAuthors().find(
                                            (val) => val == author.did
                                          ) != undefined,
                                      }}
                                      onclick={(ev) => {
                                        ev.currentTarget.classList.toggle(
                                          "toggled"
                                        );
                                        if (
                                          selectedAuthors().find(
                                            (val1) => val1 == author.did
                                          ) == undefined
                                        ) {
                                          setSelectedAuthors([
                                            author.did,
                                            ...selectedAuthors(),
                                          ]);
                                        } else {
                                          setSelectedAuthors(
                                            selectedAuthors().filter(
                                              (val1) => val1 != author.did
                                            )
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
                              checked={embedOptions.none}
                              onchange={(ev) =>
                                setEmbedOptions(
                                  "none",
                                  () => ev.currentTarget.checked
                                )
                              }
                              class="appearance-none rounded b-2 b-neutral w-4 h-4 m-y-auto relative checked:bg-blue-500 after:text-white after:i-mingcute-check-fill after:absolute after:top-50% after:left-50% after:translate-x--50% after:translate-y--50% checked:after:scale-100 after:scale-0 after:rounded-2xl after:w-3 after:h-3 after:content-[''] after:transition-all after:transition-100 after:transition-ease-linear"
                            ></input>
                            <label>None ({embedCount().none})</label>
                          </li>
                          <li class="flex gap-2">
                            <input
                              type="checkbox"
                              checked={embedOptions.image}
                              onchange={(ev) =>
                                setEmbedOptions(
                                  "image",
                                  () => ev.currentTarget.checked
                                )
                              }
                              class="appearance-none rounded b-2 b-neutral w-4 h-4 m-y-auto relative checked:bg-blue-500 after:text-white after:i-mingcute-check-fill after:absolute after:top-50% after:left-50% after:translate-x--50% after:translate-y--50% checked:after:scale-100 after:scale-0 after:rounded-2xl after:w-3 after:h-3 after:content-[''] after:transition-all after:transition-100 after:transition-ease-linear"
                            ></input>
                            <label>Images ({embedCount().image})</label>
                          </li>
                          <li class="flex gap-2">
                            <input
                              type="checkbox"
                              checked={embedOptions.video}
                              onchange={(ev) =>
                                setEmbedOptions(
                                  "video",
                                  () => ev.currentTarget.checked
                                )
                              }
                              class="appearance-none rounded b-2 b-neutral w-4 h-4 m-y-auto relative checked:bg-blue-500 after:text-white after:i-mingcute-check-fill after:absolute after:top-50% after:left-50% after:translate-x--50% after:translate-y--50% checked:after:scale-100 after:scale-0 after:rounded-2xl after:w-3 after:h-3 after:content-[''] after:transition-all after:transition-100 after:transition-ease-linear"
                            ></input>
                            <label>Videos ({embedCount().video})</label>
                          </li>
                          <li class="flex gap-2">
                            <input
                              type="checkbox"
                              checked={embedOptions.post}
                              onchange={(ev) =>
                                setEmbedOptions(
                                  "post",
                                  () => ev.currentTarget.checked
                                )
                              }
                              class="appearance-none rounded b-2 b-neutral w-4 h-4 m-y-auto relative checked:bg-blue-500 after:text-white after:i-mingcute-check-fill after:absolute after:top-50% after:left-50% after:translate-x--50% after:translate-y--50% checked:after:scale-100 after:scale-0 after:rounded-2xl after:w-3 after:h-3 after:content-[''] after:transition-all after:transition-100 after:transition-ease-linear"
                            ></input>
                            <label>Posts ({embedCount().post})</label>
                          </li>
                          <li class="flex gap-2">
                            <input
                              type="checkbox"
                              checked={embedOptions.external}
                              onchange={(ev) =>
                                setEmbedOptions(
                                  "external",
                                  () => ev.currentTarget.checked
                                )
                              }
                              class="appearance-none rounded b-2 b-neutral w-4 h-4 m-y-auto relative checked:bg-blue-500 after:text-white after:i-mingcute-check-fill after:absolute after:top-50% after:left-50% after:translate-x--50% after:translate-y--50% checked:after:scale-100 after:scale-0 after:rounded-2xl after:w-3 after:h-3 after:content-[''] after:transition-all after:transition-100 after:transition-ease-linear"
                            ></input>
                            <label>External ({embedCount().external})</label>
                          </li>
                        </ul>
                      </div>
                      <Popover.Arrow class="dark:text-slate-700 light:text-slate-400"></Popover.Arrow>
                    </Popover.Content>
                  </Popover.Portal>
                </Popover>
              </div>
              <div class="m-y-2">
                <PaginationButtons
                  currentIndex={currentIndex}
                  setCurrentIndex={setCurrentIndex}
                  pageCount={Math.ceil(filteredPosts()?.length / 50)}
                ></PaginationButtons>
              </div>
            </div>
            <PostList posts={currentPagePosts}></PostList>
            <div class="m-t-2 flex gap-2 justify-center">
              <PaginationButtons
                currentIndex={currentIndex}
                setCurrentIndex={setCurrentIndex}
                pageCount={pageCount()}
              ></PaginationButtons>
              <button
                class="rounded-lg dark:bg-slate-700 light:bg-slate-400 p-2 text-5 dark:hover:bg-slate-800 light:hover:bg-slate-500 dark:active:bg-slate-900 light:active:bg-slate-600 transition-all transition-100 transition-ease-linear b-1 dark:b-slate-700 light:b-slate-400"
                onclick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                <div class="i-mingcute-up-fill text-white"></div>
              </button>
            </div>
          </ErrorBoundary>
        </Match>
        <Match when={postsQuery.data == null}>
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
                  postsQuery.refetch();
                }}
              >
                <Switch fallback={"Index"}>
                  <Match when={postsQuery.isFetching}>
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
