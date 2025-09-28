import { AppBskyFeedPost } from "@atcute/bluesky";
import ldb from "localdata";
import { xrpc } from "../app";
import { Datetime, Did, ResourceUri } from "@atcute/lexicons";
import { FetchData } from "./fetch-data";
import { convertToCustomEmbed } from "../utils/embed";

export async function fetchPins(refetch: boolean, signal: AbortSignal) {
  let data: FetchData = {
    version: 1,
    posts: [],
    authors: [],
  };

  const cacheJson = await new Promise((resolve: (value: string) => void, reject) => {
    ldb.get("pins-cache", (value) => {
      resolve(value);
    });
  });

  if (refetch) {
    let cursor = undefined;

    let pinsRefs: {
      uri: ResourceUri;
      createdAt: Datetime;
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
            if (commentPost.reply) {
              const post = commentPost.reply.parent;
              return { uri: post.uri, createdAt: commentPost.createdAt };
            }
            return null;
          })
          .filter((ref) => ref)
      );

      cursor = res.data.cursor;
      if (res.data.posts.length === 0) {
        cursor = undefined;
      }
    } while (cursor);

    const authors: Map<Did, FetchData["authors"][0]> = new Map();

    while (pinsRefs.length > 0) {
      const pinsRefsSlice = pinsRefs.splice(0, 25);

      const res = await xrpc.get("app.bsky.feed.getPosts", {
        signal: signal,
        params: {
          uris: pinsRefsSlice.map((ref) => ref.uri),
        },
      });
      if (!res.ok) {
        throw new Error(JSON.stringify(res.data));
      }

      data.posts.push(
        ...res.data.posts.map((post) => {
          const record = post.record as AppBskyFeedPost.Main;

          return {
            uri: post.uri,
            author: post.author.did,
            text: record.text,
            createdAt: record.createdAt,
            savedAt: pinsRefsSlice.find((pin) => post.uri == pin.uri).createdAt,
            langs: record.langs,
            embed: convertToCustomEmbed(post.embed),
          };
        })
      );

      for (const post of res.data.posts) {
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
    }

    data.authors = authors
      .values()
      .toArray()
      .sort((a, b) => a.handle.localeCompare(b.handle));

    ldb.set("pins-cache", JSON.stringify(data));
  } else if (cacheJson == null) {
    return null;
  } else {
    const cache = JSON.parse(cacheJson) as FetchData;
    if (!cache.posts || cache.version == undefined) throw new Error("Old or malformed cache.");

    data = cache;
  }

  return data;
}
