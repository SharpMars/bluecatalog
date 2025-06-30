import {
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
} from "@atcute/bluesky";
import { $type } from "@atcute/lexicons";

export function countEmbeds(
  res: {
    none: number;
    image: number;
    video: number;
    post: number;
    external: number;
  },
  embed?: $type.enforce<
    | AppBskyEmbedExternal.View
    | AppBskyEmbedImages.View
    | AppBskyEmbedRecord.View
    | AppBskyEmbedRecordWithMedia.View
    | AppBskyEmbedVideo.View
  >,
  recursed?: true
) {
  if (embed) {
    switch (embed.$type) {
      case "app.bsky.embed.images#view":
        res.image++;
        break;
      case "app.bsky.embed.video#view":
        res.video++;
        break;
      case "app.bsky.embed.external#view":
        res.external++;
        break;
      case "app.bsky.embed.record#view":
        if (!recursed) {
          res.post++;

          if (
            embed.record.$type == "app.bsky.embed.record#viewRecord" &&
            embed.record.embeds?.length > 0
          ) {
            for (const innerEmbed of embed.record.embeds) {
              countEmbeds(res, innerEmbed, true);
            }
          }
        }
        break;
      case "app.bsky.embed.recordWithMedia#view":
        countEmbeds(res, embed.media, true);
        if (!recursed) {
          res.post++;

          if (
            embed.record.record.$type == "app.bsky.embed.record#viewRecord" &&
            embed.record.record?.embeds.length > 0
          ) {
            for (const innerEmbed of embed.record.record.embeds) {
              countEmbeds(res, innerEmbed, true);
            }
          }
        }
        break;
      default:
        break;
    }
  } else res.none++;
}
