import {
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
  AppBskyFeedPost,
} from "@atcute/bluesky";
import { $type } from "@atcute/lexicons";

export type Embeds = ExternalEmbed | ImagesEmbed | RecordEmbed | RecordWithMediaEmbed | VideoEmbed;

export interface ExternalEmbed {
  $type: "external";
  title: string;
  desc: string;
}

export interface ImagesEmbed {
  $type: "images";
  images: { alt: string }[];
}

export interface NestedRecord {
  text: string;
  embed?: Embeds;
  langs?: string[];
}

export interface RecordEmbed {
  $type: "record";
  record?: NestedRecord;
}

export interface RecordWithMediaEmbed {
  $type: "recordWithMedia";
  record?: NestedRecord;
  media: ExternalEmbed | ImagesEmbed | VideoEmbed;
}

export interface VideoEmbed {
  $type: "video";
  alt: string;
}

export function convertToCustomEmbed(
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

export function countEmbeds(
  res: {
    none: number;
    image: number;
    video: number;
    post: number;
    external: number;
  },
  embed?: ExternalEmbed | ImagesEmbed | RecordEmbed | RecordWithMediaEmbed | VideoEmbed,
  recursed?: true
) {
  if (embed) {
    switch (embed.$type) {
      case "images":
        res.image++;
        break;
      case "video":
        res.video++;
        break;
      case "external":
        res.external++;
        break;
      case "record":
        if (!recursed) {
          res.post++;

          if (embed.record && embed.record.embed) {
            countEmbeds(res, embed.record.embed, true);
          }
        }
        break;
      case "recordWithMedia":
        countEmbeds(res, embed.media, true);
        if (!recursed) {
          res.post++;

          if (embed.record && embed.record.embed) {
            countEmbeds(res, embed.record.embed, true);
          }
        }
        break;
      default:
        break;
    }
  } else res.none++;
}
