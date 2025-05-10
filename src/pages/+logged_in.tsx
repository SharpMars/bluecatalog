import {
  Accessor,
  createEffect,
  createMemo,
  createSignal,
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
  At,
} from "@atcute/client/lexicons";
import { useQuery } from "@tanstack/solid-query";
import MiniSearch from "minisearch";
import ldb from "localdata";
import { LoadingIndicator } from "../components/LoadingIndicator";

const searcher = new MiniSearch({
  idField: "cid",
  fields: ["text", "alt"],
  extractField: (document, fieldName) => {
    const feedViewPost = document as AppBskyFeedDefs.FeedViewPost;

    if (fieldName == "cid") {
      return feedViewPost.post.cid;
    }

    if (fieldName == "text") {
      const record = feedViewPost.post.record as AppBskyFeedPost.Record;
      return record.text;
    }

    if (fieldName == "alt") {
      let alt = "";
      if (feedViewPost.post.embed === undefined) return alt;

      switch (feedViewPost.post.embed.$type) {
        case "app.bsky.embed.images#view":
          const imageView = feedViewPost.post.embed as AppBskyEmbedImages.View;
          alt = imageView.images.map((image) => image.alt).join("\n");
          break;
        case "app.bsky.embed.video#view": {
          const videoView = feedViewPost.post.embed as AppBskyEmbedVideo.View;
          alt = videoView.alt;
        }
      }
      return alt;
    }

    return "";
  },
});

export default function LoggedIn() {
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [searchVal, setSearchVal] = createSignal("");

  let refetch = false;

  const likesQuery = useQuery(() => ({
    queryFn: async () => {
      try {
        let likes: AppBskyFeedDefs.FeedViewPost[] = [];

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
                actor: agent.sub as At.Did,
                cursor: cursor,
                limit: 100,
              },
            });
            likes.push(...res.data.feed);
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
  }));

  onMount(() => {
    if (searcher && likesQuery.isSuccess && likesQuery.data != null) {
      searcher.removeAll();
      searcher.addAll(likesQuery.data);
    }
  });

  const filteredLikes = createMemo(() => {
    if (!likesQuery.isSuccess) return [];

    if (searchVal().trim() === "") return likesQuery.data;

    const result = searcher.search(searchVal(), { fuzzy: 0.1 });

    const data = likesQuery.data.filter(
      (val) => result.find((res) => res.id == val.post.cid) !== undefined
    );

    console.log([result, data, searchVal()]);

    return data;
  });

  const pageCount = createMemo(() => {
    return Math.ceil(filteredLikes()?.length / 50);
  });

  createEffect(() => {
    if (currentIndex() > pageCount()) {
      setCurrentIndex(pageCount());
    }
  });

  return (
    <section class="p-y-2 p-x-2">
      <Switch>
        <Match when={likesQuery.isSuccess && likesQuery.data != null}>
          <div class="m-b-1">
            <div class="flex justify-center">
              <button
                onclick={() => {
                  refetch = true;
                  likesQuery.refetch();
                }}
              >
                🏇
              </button>
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
                pageCount={Math.ceil(filteredLikes()?.length / 50)}
              ></PaginationButtons>
            </div>
          </div>
          <div class="flex justify-center">
            <ul class="flex flex-col gap-2">
              <For
                each={filteredLikes()?.slice(
                  0 + currentIndex() * 50,
                  50 + currentIndex() * 50 > filteredLikes()?.length
                    ? filteredLikes()?.length
                    : 50 + currentIndex() * 50
                )}
                children={(item) => {
                  return (
                    <li class="max-w-[min(36rem,calc(100vw-32px))]">
                      <BskyPost post={item.post}></BskyPost>
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
        </Match>
        <Match when={likesQuery.data == null}>
          <div>
            <div class="flex items-center flex-col b-2 b-blue-500 b-dashed w-max h-max p-4 rounded-xl absolute top-45% left-50% translate-x--50% translate-y--50% gap-2">
              <p class="text-center dark:text-white light:text-black">
                Like data hasn't been indexed yet.
                <br /> Would you like to?
              </p>
              <button
                class="bg-neutral-600 text-white p-2 rounded w-48 hover:bg-neutral-700 active:bg-neutral-800 transition-all transition-100 transition-ease-linear"
                onclick={() => {
                  refetch = true;
                  likesQuery.refetch();
                }}
              >
                <Switch fallback={"Index"}>
                  <Match when={likesQuery.isFetching}>
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
