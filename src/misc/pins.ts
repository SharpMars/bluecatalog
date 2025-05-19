import { AppBskyFeedDefs, AppBskyFeedPost } from "@atcute/bluesky";
import ldb from "localdata";
import { xrpc } from "../app";
import { ResourceUri } from "@atcute/lexicons";

export async function fetchPins(refetch: boolean) {
  let pins: AppBskyFeedDefs.PostView[] = [];

  const cacheJson = await new Promise(
    (resolve: (value: string) => void, reject) => {
      ldb.get("pins-cache", (value) => {
        resolve(value);
      });
    }
  );

  if (refetch) {
    let cursor = undefined;

    let pinsRefs: {
      cid: string;
      uri: ResourceUri;
      $type?: "com.atproto.repo.strongRef";
    }[] = [];

    do {
      const res = await xrpc.get("app.bsky.feed.searchPosts", {
        params: {
          q: "from:me 📌",
          cursor: cursor,
          limit: 100,
          sort: "latest",
        },
      });
      if (!res.ok) {
        throw new Error(JSON.stringify(res.data));
      }

      pinsRefs.push(
        ...res.data.posts
          .map((comment) => {
            const commentPost = comment.record as AppBskyFeedPost.Main;
            if (commentPost.text.trim() !== "📌") return null;
            return commentPost.reply ? commentPost.reply.parent : null;
          })
          .filter((ref) => ref)
      );
      cursor = res.data.cursor;
      if (res.data.posts.length === 0) {
        cursor = undefined;
      }
    } while (cursor);

    while (pinsRefs.length > 0) {
      const res = await xrpc.get("app.bsky.feed.getPosts", {
        params: {
          uris: pinsRefs.splice(0, 25).map((ref) => ref.uri),
        },
      });
      if (!res.ok) {
        throw new Error(JSON.stringify(res.data));
      }

      pins.push(...res.data.posts);
    }

    ldb.set("pins-cache", JSON.stringify(pins));
  } else if (cacheJson == null) {
    return null;
  } else {
    pins = JSON.parse(cacheJson);
  }

  return pins;
}
