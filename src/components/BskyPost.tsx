import { segmentize } from "@atcute/bluesky-richtext-segmenter";
import type {
  AppBskyFeedDefs,
  AppBskyFeedPost,
  AppBskyRichtextFacet,
} from "@atcute/client/lexicons";
import { For, Match, Show, Switch } from "solid-js";
import EmbedView from "./EmbedView";

interface BskyPostProps {
  post: AppBskyFeedDefs.PostView;
}

export function BskyPost(props: BskyPostProps) {
  const post = props.post;
  const author = post.author;
  const record = post.record as AppBskyFeedPost.Record;
  const embed = post.embed;

  return (
    <div class="light:bg-neutral-100 dark:bg-neutral-800 p-4 light:text-black dark:text-white b-[HSL(211,100%,63%)] b-3 rounded-xl">
      <div class="flex gap-2 items-center m-b-2">
        <img
          width={32}
          height={32}
          src={author.avatar}
          alt="profile picture"
          class="rounded"
        ></img>
        <span class="font-700 text-ellipsis overflow-hidden">
          {author.displayName}
        </span>
        <span class="text-gray text-ellipsis overflow-hidden">
          {"@" + author.handle}
        </span>
      </div>
      <p class="break-words whitespace-pre-wrap m-b-2">
        <For each={segmentize(record?.text, record.facets)}>
          {(item) => {
            return (
              <Switch fallback={item.text}>
                <Match
                  when={
                    item.features?.length > 0 &&
                    item.features[0].$type == "app.bsky.richtext.facet#link"
                  }
                >
                  <a
                    href={(item.features[0] as AppBskyRichtextFacet.Link).uri}
                    class="text-blue hover:underline"
                  >
                    {item.text}
                  </a>
                </Match>
              </Switch>
            );
          }}
        </For>
      </p>
      <Show when={embed !== undefined}>
        <EmbedView embed={embed}></EmbedView>
      </Show>
      <div class="flex justify-between">
        <a
          href={`https://bsky.app/profile/${author.did}/post/${post.uri
            .split("/")
            .at(-1)}`}
          class="relative after:transform-origin-left after:scale-x-0 hover:after:scale-x-100 after:w-full light:after:bg-black dark:after:bg-white after:h-2px after:rounded after:content-[''] after:absolute after:bottom--1 after:left-0 after:transition-all after:transition-100 after:transition-ease-linear"
        >
          View on Bluesky
          <div class="i-mingcute-arrow-right-up-fill inline-block v-middle"></div>
        </a>
        <p>
          {new Intl.DateTimeFormat("en-UK", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "short",
            year: "numeric",
          }).format(new Date(record?.createdAt))}
        </p>
      </div>
    </div>
  );
}
