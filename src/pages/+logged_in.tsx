import {
  Accessor,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  Match,
  onMount,
  Setter,
  Suspense,
  Switch,
} from "solid-js";
import { agent, xrpc } from "../app";
import { deleteStoredSession } from "@atcute/oauth-browser-client";
import { useNavigate } from "@solidjs/router";
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

  createEffect(() => {
    if (currentIndex() > Math.floor(filteredLikes()?.length / 50)) {
      setCurrentIndex(Math.floor(filteredLikes()?.length / 50));
    }
  });

  let refetch = false;

  const likesQuery = useQuery(() => ({
    queryFn: async () => {
      let likes: AppBskyFeedDefs.FeedViewPost[] = [];

      const cacheJson = localStorage.getItem("likes-cache");

      if (cacheJson === null || refetch) {
        let cursor = undefined;

        refetch = false;

        do {
          const res = await xrpc.get("app.bsky.feed.getActorLikes", {
            params: { actor: agent.sub as At.Did, cursor: cursor, limit: 100 },
          });
          likes.push(...res.data.feed);
          cursor = res.data.cursor;
          if (res.data.feed.length === 0) {
            cursor = undefined;
          }
        } while (cursor);

        localStorage.setItem("likes-cache", JSON.stringify(likes));
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
    },
    queryKey: ["likes"],
  }));

  onMount(() => {
    if (searcher && likesQuery.isSuccess) {
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

  return (
    <section>
      <div class="flex justify-center">
        <button
          onclick={() => {
            refetch = true;
            likesQuery.refetch();
          }}
        >
          🏇
        </button>
        <div class="b-gray b-1 b-solid rounded p-1 [&:focus-within]:b-gray-900 box-content [&:focus-within]:b-2 [&:focus-within]:m--1px">
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
      <PaginationButtons
        currentIndex={currentIndex}
        setCurrentIndex={setCurrentIndex}
        pageCount={Math.ceil(filteredLikes()?.length / 50)}
      ></PaginationButtons>
      <Switch>
        <Match when={likesQuery.isSuccess}>
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
                    <li class="w-md">
                      <BskyPost post={item.post}></BskyPost>
                    </li>
                  );
                }}
              />
            </ul>
          </div>
          <PaginationButtons
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            pageCount={Math.ceil(filteredLikes()?.length / 50)}
          ></PaginationButtons>
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
    <div class="flex justify-center flex-row">
      <button
        onclick={() =>
          props.setCurrentIndex(
            props.currentIndex() - 1 < 0
              ? props.pageCount - 1
              : props.currentIndex() - 1
          )
        }
      >
        🐀
      </button>
      <input
        type="number"
        min={1}
        max={props.pageCount}
        value={props.currentIndex() + 1}
        onkeypress={(e) => {
          if (e.key != "Enter") return;

          const val = e.currentTarget.value;
          try {
            const newIndex = parseInt(val);

            if (newIndex > props.pageCount) throw new Error();

            if (newIndex < 1) throw new Error();

            props.setCurrentIndex(newIndex - 1);
            e.currentTarget.blur();
          } catch (error) {
            e.currentTarget.value = "" + props.currentIndex() + 1;
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
          } catch (error) {
            e.target.value = "" + props.currentIndex() + 1;
          }
        }}
        class="w-min field-sizing-content text-center m-0 moz-appearance-textfield [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      ></input>
      <p>/{props.pageCount}</p>
      <button
        onclick={() =>
          props.setCurrentIndex((props.currentIndex() + 1) % props.pageCount)
        }
      >
        🐀
      </button>
    </div>
  );
}
