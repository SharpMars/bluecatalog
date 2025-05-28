import { AppBskyFeedDefs } from "@atcute/bluesky";
import ldb from "localdata";
import { agent, xrpc } from "../app";
import { Did } from "@atcute/lexicons";

export async function fetchLikes(refetch: boolean) {
  let likes: AppBskyFeedDefs.PostView[] = [];

  const cacheJson = await new Promise(
    (resolve: (value: string) => void, reject) => {
      ldb.get("likes-cache", (value) => {
        resolve(value);
      });
    }
  );

  if (refetch) {
    let cursor = undefined;

    do {
      const res = await xrpc.get("app.bsky.feed.getActorLikes", {
        params: {
          actor: agent.sub as Did,
          cursor: cursor,
          limit: 100,
        },
      });
      if (!res.ok) {
        throw new Error(JSON.stringify(res.data));
      }

      likes.push(...res.data.feed.map((feedViewPost) => feedViewPost.post));
      cursor = res.data.cursor;
      if (res.data.feed.length === 0) {
        cursor = undefined;
      }
    } while (cursor);

    ldb.set("likes-cache", JSON.stringify(likes));
  } else if (cacheJson == null) {
    return null;
  } else {
    likes = JSON.parse(cacheJson);
  }

  return likes;
}
