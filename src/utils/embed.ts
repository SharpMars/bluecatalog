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
