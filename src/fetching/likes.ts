import ldb from "localdata";
import { agent, xrpc } from "../app";
import { Did, ResourceUri } from "@atcute/lexicons";
import { FetchData } from "./fetch-data";
import { AppBskyFeedLike, AppBskyFeedPost } from "@atcute/bluesky";
import { convertToCustomEmbed } from "../utils/embed";
import { RepoReader } from "@atcute/car/v4";

export async function fetchLikes(refetch: boolean, signal: AbortSignal) {
  let data: FetchData = {
    version: 1,
    posts: [],
    authors: [],
    missing: [],
  };

  const cacheJson = await new Promise((resolve: (value: string) => void, reject) => {
    ldb.get("likes-cache", (value) => {
      resolve(value);
    });
  });

  if (refetch) {
    let startTime = new Date().getTime();

    const authors: Map<Did, FetchData["authors"][0]> = new Map();
    const likes: AppBskyFeedLike.Main[] = [];
    const viaMap = new Map<ResourceUri, Did>();

    const session = await agent.getSession();
    const carReq = await fetch(`${session.info.aud}xrpc/com.atproto.sync.getRepo?did=${session.info.sub}`);
    await using repo = RepoReader.fromStream(carReq.body);

    for await (const entry of repo) {
      if (
        entry.collection == "app.bsky.feed.like" &&
        (entry.record as AppBskyFeedLike.Main).subject.uri.includes("app.bsky.feed.post")
      ) {
        const record = entry.record as AppBskyFeedLike.Main;
        likes.push(record);
        if (record.via) viaMap.set(record.subject.uri, record.via.uri.replace("at://", "").split("/")[0] as Did);
      }
    }
    repo.dispose();

    const viaDidsArr = [...viaMap.values()];
    let viaDidsSlice = viaDidsArr.splice(0, 25);
    let viaDidsProfiles = new Map<Did, FetchData["posts"][0]["via"]>();

    while (viaDidsSlice.length > 0) {
      const res = await xrpc.get("app.bsky.actor.getProfiles", {
        signal: signal,
        params: {
          actors: viaDidsSlice,
        },
      });

      if (!res.ok) {
        throw new Error(JSON.stringify(res.data));
      }

      const profiles = res.data.profiles.map((val) => ({
        did: val.did,
        handle: val.handle,
        displayName: val.displayName,
      }));
      for (const profile of profiles) {
        viaDidsProfiles.set(profile.did, profile);
      }

      viaDidsSlice = viaDidsArr.splice(0, 25);
    }

    const uriSet = new Set<ResourceUri>();

    let cursor = undefined;
    do {
      const res = await xrpc.get("app.bsky.feed.getActorLikes", {
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
        ...res.data.feed.map((feedViewPost) => {
          const post = feedViewPost.post.record as AppBskyFeedPost.Main;

          return {
            uri: feedViewPost.post.uri,
            author: feedViewPost.post.author.did,
            text: post.text,
            createdAt: post.createdAt,
            langs: post.langs,
            embed: convertToCustomEmbed(feedViewPost.post.embed),
            via:
              viaMap.has(feedViewPost.post.uri) && viaDidsProfiles.has(viaMap.get(feedViewPost.post.uri))
                ? viaDidsProfiles.get(viaMap.get(feedViewPost.post.uri))
                : undefined,
          };
        })
      );

      for (const post of res.data.feed) {
        uriSet.add(post.post.uri);
        const author = post.post.author;
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
      if (res.data.feed.length === 0) {
        cursor = undefined;
      }
    } while (cursor);

    data.authors = authors
      .values()
      .toArray()
      .sort((a, b) => a.handle.localeCompare(b.handle));

    data.missing = likes
      .filter((val) => !uriSet.has(val.subject.uri))
      .map((val) => {
        const via = val.via ? viaDidsProfiles.get(val.via.uri.replace("at://", "").split("/")[0] as Did) : undefined;

        return {
          createdAt: val.createdAt,
          uri: val.subject.uri,
          via: via ? { did: via.did, handle: via.handle } : undefined,
        };
      });

    console.log(`Finished in ${new Date().getTime() - startTime}ms`);

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
