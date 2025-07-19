import { AppBskyActorDefs, AppBskyFeedPost } from "@atcute/bluesky";
import ldb from "localdata";
import { xrpc } from "../app";
import { ResourceUri } from "@atcute/lexicons";
import { FetchData } from "./fetch-data";

export async function fetchPins(refetch: boolean, signal: AbortSignal) {
  let data: FetchData = {
    posts: [],
    authors: [],
  };

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
        signal: signal,
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

    const authors: AppBskyActorDefs.ProfileViewBasic[] = [];

    while (pinsRefs.length > 0) {
      const res = await xrpc.get("app.bsky.feed.getPosts", {
        signal: signal,
        params: {
          uris: pinsRefs.splice(0, 25).map((ref) => ref.uri),
        },
      });
      if (!res.ok) {
        throw new Error(JSON.stringify(res.data));
      }

      data.posts.push(...res.data.posts);
      authors.push(
        ...res.data.posts.map((feedViewPost) => feedViewPost.author)
      );
    }

    data.authors = authors
      .filter((val, index, array) => {
        return array.findIndex((val1) => val.did == val1.did) == index;
      })
      .sort((a, b) => a.handle.localeCompare(b.handle));

    ldb.set("pins-cache", JSON.stringify(data));
  } else if (cacheJson == null) {
    return null;
  } else {
    const cache = JSON.parse(cacheJson) as FetchData;
    if (!cache.posts) throw new Error("Old or malformed cache.");

    data = cache;
  }

  return data;
}
