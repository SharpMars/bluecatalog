import ldb from "localdata";
import { agent, xrpc } from "../app";
import { Did } from "@atcute/lexicons";
import { FetchData } from "./fetch-data";
import { AppBskyActorDefs } from "@atcute/bluesky";
import { PostView } from "@atcute/bluesky/types/app/feed/defs";

export async function fetchBookmarks(refetch: boolean, signal: AbortSignal) {
  let data: FetchData = {
    posts: [],
    authors: [],
  };

  const cacheJson = await new Promise((resolve: (value: string) => void, reject) => {
    ldb.get("bookmarks-cache", (value) => {
      resolve(value);
    });
  });

  if (refetch) {
    let cursor = undefined;

    const authors: AppBskyActorDefs.ProfileViewBasic[] = [];

    do {
      const res = await xrpc.get("app.bsky.bookmark.getBookmarks", {
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
        ...res.data.bookmarks
          .filter((bookmark) => bookmark.item.$type == "app.bsky.feed.defs#postView")
          .map((bookmark) => bookmark.item as PostView)
      );
      authors.push(
        ...res.data.bookmarks
          .filter((bookmark) => bookmark.item.$type == "app.bsky.feed.defs#postView")
          .map((bookmark) => (bookmark.item as PostView).author)
      );
      cursor = res.data.cursor;
      if (res.data.bookmarks.length === 0) {
        cursor = undefined;
      }
    } while (cursor);

    data.authors = authors
      .filter((val, index, array) => {
        return array.findIndex((val1) => val.did == val1.did) == index;
      })
      .sort((a, b) => a.handle.localeCompare(b.handle));

    ldb.set("bookmarks-cache", JSON.stringify(data));
  } else if (cacheJson == null) {
    return null;
  } else {
    const cache = JSON.parse(cacheJson) as FetchData;
    if (!cache.posts) throw new Error("Old or malformed cache.");

    data = cache;
  }

  return data;
}
