import { Accessor, For, Match, Switch } from "solid-js";
import { BskyPost } from "./BskyPost";
import { Masonry } from "./Masonry";
import { AppBskyFeedDefs } from "@atcute/bluesky";

export function PostList(props: {
  posts: Accessor<AppBskyFeedDefs.PostView[]>;
}) {
  const masonryEnabled = localStorage.getItem("masonry-enabled") !== null;

  const masonryColumnCount = (() => {
    const saved = localStorage.getItem("masonry-columns");
    if (saved) return parseInt(saved);
    return 1;
  })();

  return (
    <Switch
      fallback={
        <div class="flex w-full justify-center">
          <ul class="flex flex-col gap-4">
            <For each={props.posts()}>
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
        <Masonry
          each={props.posts()}
          columns={masonryColumnCount}
          maxWidth={576}
          gap={8}
          verticalOnlyGap={4}
        >
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
  );
}
