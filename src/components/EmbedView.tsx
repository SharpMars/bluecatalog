import {
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
  AppBskyFeedPost,
  AppBskyRichtextFacet,
} from "@atcute/bluesky";
import { For, lazy, Match, Show, Switch } from "solid-js";
import ImageView from "./ImageView";
import { segmentize } from "@atcute/bluesky-richtext-segmenter";
import { $type, is } from "@atcute/lexicons";

const HlsPlayer = lazy(() => import("./HlsPlayer"));

export default function EmbedView(props: {
  embed?: $type.enforce<
    | AppBskyEmbedExternal.View
    | AppBskyEmbedImages.View
    | AppBskyEmbedRecord.View
    | AppBskyEmbedRecordWithMedia.View
    | AppBskyEmbedVideo.View
  >;
  recursed?: true;
}) {
  return (
    <div style={{ "margin-bottom": !props.recursed ? "0.5rem" : "initial" }}>
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
            return props.embed.$type === "app.bsky.embed.external#view"
              ? (props.embed as AppBskyEmbedExternal.View)
              : undefined;
          })()}
        >
          {(externalView) => (
            <Switch
              fallback={
                <>
                  <a
                    href={externalView().external.uri}
                    class="b-1 light:b-neutral-400 dark:b-neutral-600 b-solid block rounded-xl overflow-hidden light:hover:bg-black/5 dark:hover:bg-white/5 transition-ease-linear transition-all transition-100"
                    target="_blank"
                  >
                    <img
                      src={externalView().external.thumb}
                      onerror={(ev) => {
                        ev.currentTarget.style.display = "none";
                      }}
                    />
                    <div class="p-2">
                      <p class="font-700 break-anywhere w-full">
                        {externalView().external.title ||
                          externalView().external.uri}
                      </p>
                      <p class="text-ellipsis break-words text-3.5 line-clamp-2 light:text-neutral-600 dark:text-neutral-400">
                        {externalView().external.description}
                      </p>
                      <hr class="m-y-2 light:text-neutral-400 dark:text-neutral-600"></hr>
                      <div class="flex gap-1">
                        <img
                          src={
                            "https://icons.duckduckgo.com/ip3/" +
                            new URL(externalView().external.uri).hostname +
                            ".ico"
                          }
                          height={16}
                          width={16}
                          class="aspect-square object-contain h-16px"
                        />
                        <span class="text-ellipsis overflow-hidden text-nowrap light:text-neutral-600 dark:text-neutral-400 text-3">
                          {externalView().external.uri}
                        </span>
                      </div>
                    </div>
                  </a>
                </>
              }
            >
              <Match
                when={
                  new URL(externalView().external.uri).hostname ===
                  "media.tenor.com"
                }
              >
                <img
                  class="rounded-xl m-x-auto"
                  src={externalView().external.uri}
                  alt={externalView().external.description.replace("Alt: ", "")}
                  title={externalView().external.description.replace(
                    "Alt: ",
                    ""
                  )}
                ></img>
              </Match>
            </Switch>
          )}
        </Match>
        <Match
          when={(() => {
            return props.embed.$type === "app.bsky.embed.record#view"
              ? (props.embed as AppBskyEmbedRecord.View)
              : undefined;
          })()}
        >
          {(recordView) => (
            <Show when={!props.recursed}>
              <Switch>
                <Match
                  when={(() => {
                    const record = recordView().record;
                    return record.$type === "app.bsky.embed.record#viewRecord"
                      ? (record as AppBskyEmbedRecord.ViewRecord)
                      : undefined;
                  })()}
                >
                  {(viewRecord) => (
                    <div class="b-1 light:b-neutral-400 dark:b-neutral-600 b-solid rounded-xl p-2 m-t-1">
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
                        <span class="light:text-neutral-600 dark:text-neutral-400 text-ellipsis overflow-hidden">
                          {"@" + viewRecord().author.handle}
                        </span>
                      </div>
                      <p class="m-b-2 whitespace-pre-wrap">
                        <For
                          each={segmentize(
                            (viewRecord().value as AppBskyFeedPost.Main)?.text,
                            (viewRecord().value as AppBskyFeedPost.Main)?.facets
                          )}
                        >
                          {(item) => {
                            return (
                              <Switch fallback={item.text}>
                                <Match
                                  when={
                                    item.features?.length > 0 &&
                                    is(
                                      AppBskyRichtextFacet.linkSchema,
                                      item.features[0]
                                    )
                                  }
                                >
                                  <a
                                    href={
                                      (
                                        item
                                          .features[0] as AppBskyRichtextFacet.Link
                                      ).uri
                                    }
                                    class="text-blue hover:underline"
                                    target="_blank"
                                  >
                                    {item.text}
                                  </a>
                                </Match>
                              </Switch>
                            );
                          }}
                        </For>
                      </p>
                      <Show
                        when={
                          viewRecord().embeds && viewRecord().embeds.length > 0
                        }
                      >
                        <EmbedView
                          embed={viewRecord().embeds[0]}
                          recursed
                        ></EmbedView>
                      </Show>
                    </div>
                  )}
                </Match>
              </Switch>
            </Show>
          )}
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
              <EmbedView embed={recordWithMedia().media} recursed></EmbedView>
              <Show when={!props.recursed}>
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
                      <div class="b-1 light:b-neutral-400 dark:b-neutral-600 b-solid rounded-xl p-2 m-t-2">
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
                          <span class="light:text-neutral-600 dark:text-neutral-400 text-ellipsis overflow-hidden">
                            {"@" + viewRecord().author.handle}
                          </span>
                        </div>
                        <p class="m-b-2 whitespace-pre-wrap">
                          <For
                            each={segmentize(
                              (viewRecord().value as AppBskyFeedPost.Main)
                                ?.text,
                              (viewRecord().value as AppBskyFeedPost.Main)
                                ?.facets
                            )}
                          >
                            {(item) => {
                              return (
                                <Switch fallback={item.text}>
                                  <Match
                                    when={
                                      item.features?.length > 0 &&
                                      is(
                                        AppBskyRichtextFacet.linkSchema,
                                        item.features[0]
                                      )
                                    }
                                  >
                                    <a
                                      href={
                                        (
                                          item
                                            .features[0] as AppBskyRichtextFacet.Link
                                        ).uri
                                      }
                                      class="text-blue hover:underline"
                                      target="_blank"
                                    >
                                      {item.text}
                                    </a>
                                  </Match>
                                </Switch>
                              );
                            }}
                          </For>
                        </p>
                        <Show
                          when={
                            viewRecord().embeds &&
                            viewRecord().embeds.length > 0
                          }
                        >
                          <EmbedView
                            embed={viewRecord().embeds[0]}
                            recursed
                          ></EmbedView>
                        </Show>
                      </div>
                    )}
                  </Match>
                </Switch>
              </Show>
            </>
          )}
        </Match>
      </Switch>
    </div>
  );
}
