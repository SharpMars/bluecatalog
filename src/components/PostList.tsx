import { Accessor, For, Match, Suspense, Switch } from "solid-js";
import { BskyPost } from "./BskyPost";
import { Masonry } from "./Masonry";
import { ResourceUri } from "@atcute/lexicons";
import { useQuery } from "@tanstack/solid-query";
import { useClient } from "../utils/client";

export function PostList(props: { posts: Accessor<ResourceUri[]> }) {
  const masonryEnabled = localStorage.getItem("masonry-enabled") !== null;

  const masonryColumnCount = (() => {
    const saved = localStorage.getItem("masonry-columns");
    if (saved) return parseInt(saved);
    return 1;
  })();

  const postsQuery = useQuery(() => ({
    queryFn: async ({ queryKey, signal }) => {
      const posts = [];

      let uris = props.posts();

      const xrpc = await useClient();

      let res = await xrpc.get("app.bsky.feed.getPosts", {
        signal: signal,
        params: { uris: uris.slice(0, 25) },
      });
      if (res.ok) posts.push(...res.data.posts);
      else throw new Error();

      if (uris.length <= 25) return posts;

      res = await xrpc.get("app.bsky.feed.getPosts", {
        signal: signal,
        params: { uris: uris.slice(25, 50) },
      });
      if (res.ok) posts.push(...res.data.posts);
      else throw new Error();

      return posts;
    },
    queryKey: [JSON.stringify(props.posts())],
    placeholderData: [],
  }));

  return (
    <Suspense>
      <Switch
        fallback={
          <div class="flex w-full justify-center">
            <ul class="flex flex-col gap-4">
              <For each={postsQuery.data}>
                {(item) => {
                  return (
                    <li class="max-w-[min(36rem,calc(100vw-32px))] w-full">
                      <BskyPost post={item}></BskyPost>
                    </li>
                  );
                }}
              </For>
            </ul>
          </div>
        }
      >
        <Match when={masonryEnabled && masonryColumnCount > 1}>
          <Masonry each={postsQuery.data} columns={masonryColumnCount} maxWidth={576} gap={8} verticalOnlyGap={4}>
            {(item) => {
              return (
                <li class="max-w-[min(36rem,calc(100vw-32px))] w-full">
                  <BskyPost post={item}></BskyPost>
                </li>
              );
            }}
          </Masonry>
        </Match>
      </Switch>
    </Suspense>
  );
}
