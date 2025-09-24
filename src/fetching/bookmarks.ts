import ldb from "localdata";
import { agent, xrpc } from "../app";
import { Did } from "@atcute/lexicons";
import { FetchData } from "./fetch-data";
import { AppBskyFeedPost } from "@atcute/bluesky";
import { PostView } from "@atcute/bluesky/types/app/feed/defs";
import { convertToCustomEmbed } from "../utils/embed";

export async function fetchBookmarks(refetch: boolean, signal: AbortSignal) {
  let data: FetchData = {
    version: 1,
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

    const authors: Map<Did, FetchData["authors"][0]> = new Map();

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

      const availableBookmarks = res.data.bookmarks.filter(
        (bookmark) => bookmark.item.$type == "app.bsky.feed.defs#postView"
      );

      data.posts.push(
        ...availableBookmarks.map((bookmark) => {
          const post = bookmark.item as PostView;
          const record = post.record as AppBskyFeedPost.Main;

          return {
            uri: post.uri,
            author: post.author.did,
            text: record.text,
            embed: convertToCustomEmbed(post.embed),
            createdAt: record.createdAt,
            savedAt: bookmark.createdAt,
            langs: record.langs,
          };
        })
      );
      for (const bookmark of availableBookmarks) {
        const post = bookmark.item as PostView;
        const author = post.author;
        const following = author.viewer ? !!author.viewer.following : false;
        if (!authors.has(author.did))
          authors.set(author.did, {
            did: author.did,
            displayName: author.displayName,
            handle: author.handle,
            following: following,
          });
      }
      cursor = res.data.cursor;
      if (res.data.bookmarks.length === 0) {
        cursor = undefined;
      }
    } while (cursor);

    data.authors = authors
      .values()
      .toArray()
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
