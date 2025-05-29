import ldb from "localdata";
import { agent, xrpc } from "../app";
import { Did } from "@atcute/lexicons";
import { FetchData } from "./fetch-data";
import { AppBskyActorDefs } from "@atcute/bluesky";

export async function fetchLikes(refetch: boolean) {
  let data: FetchData = {
    posts: [],
    authors: [],
  };

  const cacheJson = await new Promise(
    (resolve: (value: string) => void, reject) => {
      ldb.get("likes-cache", (value) => {
        resolve(value);
      });
    }
  );

  if (refetch) {
    let cursor = undefined;

    const authors: AppBskyActorDefs.ProfileViewBasic[] = [];

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

      data.posts.push(
        ...res.data.feed.map((feedViewPost) => feedViewPost.post)
      );
      authors.push(
        ...res.data.feed.map((feedViewPost) => feedViewPost.post.author)
      );
      cursor = res.data.cursor;
      if (res.data.feed.length === 0) {
        cursor = undefined;
      }
    } while (cursor);

    data.authors = authors
      .filter((val, index, array) => {
        return array.findIndex((val1) => val.did == val1.did) == index;
      })
      .sort((a, b) => a.handle.localeCompare(b.handle));

    ldb.set("likes-cache", JSON.stringify(data));
  } else if (cacheJson == null) {
    return null;
  } else {
    const cache = JSON.parse(cacheJson) as FetchData;
    if (!cache.posts) throw new Error("Old or malformed cache.");

    data = cache;
  }

  return data;
}
