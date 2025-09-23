import ldb from "localdata";
import { agent, xrpc } from "../app";
import { $type, Did } from "@atcute/lexicons";
import { FetchData } from "./fetch-data";
import {
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
  AppBskyFeedPost,
} from "@atcute/bluesky";
import { ExternalEmbed, ImagesEmbed, RecordEmbed, RecordWithMediaEmbed, VideoEmbed } from "../utils/embed";

export async function fetchLikes(refetch: boolean, signal: AbortSignal) {
  let data: FetchData = {
    version: 1,
    posts: [],
    //authors: [],
    //records: [],
  };

  function convertToCustomEmbed(
    embed?: $type.enforce<
      | AppBskyEmbedExternal.View
      | AppBskyEmbedImages.View
      | AppBskyEmbedRecord.View
      | AppBskyEmbedRecordWithMedia.View
      | AppBskyEmbedVideo.View
    >
  ) {
    if (!embed) return undefined;

    switch (embed.$type) {
      case "app.bsky.embed.external#view":
        const external: ExternalEmbed = {
          $type: "external",
          title: embed.external.title,
          desc: embed.external.description,
        };

        return external;
      case "app.bsky.embed.images#view":
        const image: ImagesEmbed = {
          $type: "images",
          images: embed.images.map((val) => {
            return { alt: val.alt };
          }),
        };

        return image;
      case "app.bsky.embed.record#view":
        const nestedRecord = embed.record.$type == "app.bsky.embed.record#viewRecord" ? embed.record : undefined;
        const recordPost = nestedRecord ? (nestedRecord.value as AppBskyFeedPost.Main) : undefined;
        const recordEmbed =
          nestedRecord && nestedRecord.embeds && nestedRecord.embeds.length > 0
            ? convertToCustomEmbed(nestedRecord.embeds[0])
            : undefined;

        const record: RecordEmbed = {
          $type: "record",
          record: nestedRecord ? { text: recordPost.text, langs: recordPost.langs, embed: recordEmbed } : undefined,
        };

        return record;

      case "app.bsky.embed.recordWithMedia#view":
        const withMediaNestedRecord =
          embed.record.record.$type == "app.bsky.embed.record#viewRecord" ? embed.record.record : undefined;
        const withMediaRecordPost = withMediaNestedRecord
          ? (withMediaNestedRecord.value as AppBskyFeedPost.Main)
          : undefined;
        const withMediaRecordEmbed =
          withMediaNestedRecord && withMediaNestedRecord.embeds && withMediaNestedRecord.embeds.length > 0
            ? convertToCustomEmbed(withMediaNestedRecord.embeds[0])
            : undefined;
        const recordWithMedia: RecordWithMediaEmbed = {
          $type: "recordWithMedia",
          record: withMediaNestedRecord
            ? { text: withMediaRecordPost.text, langs: withMediaRecordPost.langs, embed: withMediaRecordEmbed }
            : undefined,
          media: convertToCustomEmbed(embed.media) as ExternalEmbed | ImagesEmbed | VideoEmbed,
        };

        return recordWithMedia;
      case "app.bsky.embed.video#view":
        const video: VideoEmbed = {
          $type: "video",
          alt: embed.alt,
        };

        return video;
      default:
        return undefined;
    }
  }

  const cacheJson = await new Promise((resolve: (value: string) => void, reject) => {
    ldb.get("likes-cache", (value) => {
      resolve(value);
    });
  });

  if (refetch) {
    let cursor = undefined;

    //const authors: AppBskyActorDefs.ProfileViewBasic[] = [];

    do {
      const res = await xrpc.get("app.bsky.feed.getActorLikes", {
        signal: signal,
        params: {
          actor: agent.sub as Did,
          cursor: cursor,
          limit: 100,
        },
      });
      if (!res.ok) {
        throw new Error(JSON.stringify(res.data));
      }

      data.posts.push(
        ...res.data.feed.map((feedViewPost) => {
          const post = feedViewPost.post.record as AppBskyFeedPost.Main;

          return {
            uri: feedViewPost.post.uri,
            author: feedViewPost.post.author.did,
            text: post.text,
            createdAt: post.createdAt,
            langs: post.langs,
            embed: convertToCustomEmbed(feedViewPost.post.embed),
          };
        })
      );
      //authors.push(...res.data.feed.map((feedViewPost) => feedViewPost.post.author));
      cursor = res.data.cursor;
      if (res.data.feed.length === 0) {
        cursor = undefined;
      }
    } while (cursor);

    //data.authors = authors
    //  .filter((val, index, array) => {
    //    return array.findIndex((val1) => val.did == val1.did) == index;
    //  })
    //  .sort((a, b) => a.handle.localeCompare(b.handle));

    //cursor = undefined;
    //let rawRecords: AppBskyFeedLike.Main[] = [];
    //let viaDids: Set<Did> = new Set();
    //do {
    //  const res = await xrpc.get("com.atproto.repo.listRecords", {
    //    signal: signal,
    //    params: {
    //      repo: agent.sub as Did,
    //      cursor: cursor,
    //      collection: "app.bsky.feed.like",
    //      limit: 100,
    //    },
    //  });
    //
    //  if (!res.ok) {
    //    throw new Error(JSON.stringify(res.data));
    //  }
    //
    //  rawRecords.push(
    //    ...res.data.records
    //      .map((val) => val.value as AppBskyFeedLike.Main)
    //      .filter((val) => val.subject.uri.includes("app.bsky.feed.post"))
    //  );
    //
    //  for (const did of rawRecords
    //    .filter((val) => val.via)
    //    .map((val) => val.via.uri.replace("at://", "").split("/")[0]) as Did[]) {
    //    viaDids.add(did);
    //  }
    //
    //  cursor = res.data.cursor;
    //  if (res.data.records.length === 0) {
    //    cursor = undefined;
    //  }
    //} while (cursor);
    //
    //const viaDidsArr = [...viaDids];
    //let viaDidsSlice = viaDidsArr.splice(0, 25);
    //let viaDidsProfiles: AppBskyActorDefs.ProfileViewDetailed[] = [];
    //
    //while (viaDidsSlice.length > 0) {
    //  const res = await xrpc.get("app.bsky.actor.getProfiles", {
    //    signal: signal,
    //    params: {
    //      actors: viaDidsSlice,
    //    },
    //  });
    //
    //  if (!res.ok) {
    //    throw new Error(JSON.stringify(res.data));
    //  }
    //
    //  viaDidsProfiles.push(...res.data.profiles);
    //
    //  viaDidsSlice = viaDidsArr.splice(0, 25);
    //}
    //
    //data.records = rawRecords.map((val) => {
    //  let result: FetchData["records"][0] = {
    //    createdAt: val.createdAt,
    //    subject: val.subject,
    //  };
    //
    //  if (val.via) {
    //    result.viaProfile = viaDidsProfiles.find((val1) => val1.did == val.via.uri.replace("at://", "").split("/")[0]);
    //  }
    //
    //  return result;
    //});

    //console.log(data.records);

    ldb.set("likes-cache", JSON.stringify(data));
  } else if (cacheJson == null) {
    return null;
  } else {
    const cache = JSON.parse(cacheJson) as FetchData;
    if (!cache.posts) throw new Error("Old or malformed cache.");

    data = cache;
  }

  console.log(data);

  return data;
}
