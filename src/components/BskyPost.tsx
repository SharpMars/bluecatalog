import type {
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
  AppBskyFeedDefs,
  AppBskyFeedPost,
  Brand,
} from "@atcute/client/lexicons";
import Hls from "hls.js";
import {
  createSignal,
  For,
  Match,
  onCleanup,
  Show,
  Suspense,
  Switch,
} from "solid-js";

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
        <p class="m-b-2 whitespace-pre-wrap">{record?.text}</p>
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

function EmbedView(props: {
  embed?: Brand.Union<
    | AppBskyEmbedExternal.View
    | AppBskyEmbedImages.View
    | AppBskyEmbedRecord.View
    | AppBskyEmbedRecordWithMedia.View
    | AppBskyEmbedVideo.View
  >;
}) {
  return (
    <Switch fallback={"[EMBED]"}>
      <Match when={props.embed.$type === "app.bsky.embed.images#view"}>
        <ImageView embed={props.embed as AppBskyEmbedImages.View}></ImageView>
      </Match>
      <Match when={props.embed.$type === "app.bsky.embed.video#view"}>
        <HlsPlayer
          src={(props.embed as AppBskyEmbedVideo.View).playlist}
          thumbnail={(props.embed as AppBskyEmbedVideo.View).thumbnail}
        ></HlsPlayer>
      </Match>
      <Match
        when={(() => {
          return props.embed.$type === "app.bsky.embed.recordWithMedia#view"
            ? (props.embed as AppBskyEmbedRecordWithMedia.View)
            : undefined;
        })()}
      >
        {(recordWithMedia) => (
          <>
            <EmbedView embed={recordWithMedia().media}></EmbedView>
            <Switch>
              <Match
                when={(() => {
                  const record = recordWithMedia().record.record;
                  return record.$type === "app.bsky.embed.record#viewRecord"
                    ? (record as AppBskyEmbedRecord.ViewRecord)
                    : undefined;
                })()}
              >
                {(viewRecord) => (
                  <div class="b-1 b-gray b-solid rounded p-2 m-t-1">
                    <div class="flex gap-2 items-center m-b-2">
                      <img
                        width={24}
                        height={24}
                        src={viewRecord().author.avatar}
                        alt="profile picture"
                        class="rounded"
                      ></img>
                      <span class="font-700 text-ellipsis overflow-hidden">
                        {viewRecord().author.displayName}
                      </span>
                      <span class="text-gray text-ellipsis overflow-hidden">
                        {"@" + viewRecord().author.handle}
                      </span>
                    </div>
                    <p class="m-b-2 whitespace-pre-wrap">
                      {(viewRecord().value as AppBskyFeedPost.Record).text}
                    </p>
                    <Show
                      when={
                        viewRecord().embeds && viewRecord().embeds.length > 0
                      }
                    >
                      <EmbedView embed={viewRecord().embeds[0]}></EmbedView>
                    </Show>
                  </div>
                )}
              </Match>
            </Switch>
          </>
        )}
      </Match>
    </Switch>
  );
}

function ImageView(props: { embed: AppBskyEmbedImages.View }) {
  const [current, setCurrent] = createSignal(0);

  return (
    <div class="relative">
      <Show when={props.embed.images.length > 1}>
        <button
          class="absolute top-50% left-0 text-8 translate-y--50% p-2 i-mingcute-left-fill mix-blend-difference"
          onClick={() => {
            setCurrent(
              current() - 1 < 0 ? props.embed.images.length - 1 : current() - 1
            );
          }}
        >
          🐀
        </button>
        <button
          class="absolute top-50% right-0 text-8 translate-y--50% p-2 i-mingcute-right-fill mix-blend-difference"
          onClick={() => {
            setCurrent(
              current() + 1 >= props.embed.images.length ? 0 : current() + 1
            );
          }}
        >
          🐀
        </button>
      </Show>
      <For each={props.embed.images}>
        {(item, index) => (
          <img
            class="max-h-2xl m-x-auto"
            style={{
              "aspect-ratio": item.aspectRatio
                ? item.aspectRatio.width / item.aspectRatio.height
                : "initial",
              display: current() === index() ? "block" : "none",
            }}
            title={item.alt}
            alt={item.alt}
            src={item.fullsize}
          ></img>
        )}
      </For>
    </div>
  );
}

function HlsPlayer(props: { src: string; thumbnail?: string }) {
  const hls = new Hls({ progressive: true, maxMaxBufferLength: 1 });

  onCleanup(() => hls.destroy());

  const [alreadyLoaded, setAlreadyLoaded] = createSignal(false);
  hls.loadSource(props.src);

  return (
    <video
      class="w-full max-h-2xl"
      controls
      ref={(element) => {
        hls.attachMedia(element);
      }}
      poster={props.thumbnail}
      onplay={() => {
        if (!alreadyLoaded()) {
          hls.config.maxMaxBufferLength = 30;
          setAlreadyLoaded(true);
        }
      }}
    ></video>
  );
}
