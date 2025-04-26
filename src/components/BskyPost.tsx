import { segmentize } from "@atcute/bluesky-richtext-segmenter";
import type {
  AppBskyFeedDefs,
  AppBskyFeedPost,
  AppBskyRichtextFacet,
} from "@atcute/client/lexicons";
import { For, Match, Show, Suspense, Switch } from "solid-js";
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
    <div class="bg-[hsl(0,0%,25%)] p-4 text-white b-[HSL(211,100%,63%)] b-3">
      <Suspense fallback={<p>Loading...</p>}>
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
            class="underline"
          >
            View on Bluesky ↗
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
      </Suspense>
    </div>
  );
}
