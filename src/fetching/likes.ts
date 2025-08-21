import ldb from "localdata";
import { agent, xrpc } from "../app";
import { Did } from "@atcute/lexicons";
import { FetchData } from "./fetch-data";
import { AppBskyActorDefs, AppBskyFeedLike } from "@atcute/bluesky";

export async function fetchLikes(refetch: boolean, signal: AbortSignal) {
  let data: FetchData = {
    posts: [],
    authors: [],
    records: [],
  };

  const cacheJson = await new Promise((resolve: (value: string) => void, reject) => {
    ldb.get("likes-cache", (value) => {
      resolve(value);
    });
  });

  if (refetch) {
    let cursor = undefined;

    const authors: AppBskyActorDefs.ProfileViewBasic[] = [];

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

      data.posts.push(...res.data.feed.map((feedViewPost) => feedViewPost.post));
      authors.push(...res.data.feed.map((feedViewPost) => feedViewPost.post.author));
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

    cursor = undefined;
    let rawRecords: AppBskyFeedLike.Main[] = [];
    let viaDids: Set<Did> = new Set();
    do {
      const res = await xrpc.get("com.atproto.repo.listRecords", {
        signal: signal,
        params: {
          repo: agent.sub as Did,
          cursor: cursor,
          collection: "app.bsky.feed.like",
          limit: 100,
        },
      });

      if (!res.ok) {
        throw new Error(JSON.stringify(res.data));
      }

      rawRecords.push(
        ...res.data.records
          .map((val) => val.value as AppBskyFeedLike.Main)
          .filter((val) => val.subject.uri.includes("app.bsky.feed.post"))
      );

      for (const did of rawRecords
        .filter((val) => val.via)
        .map((val) => val.via.uri.replace("at://", "").split("/")[0]) as Did[]) {
        viaDids.add(did);
      }

      cursor = res.data.cursor;
      if (res.data.records.length === 0) {
        cursor = undefined;
      }
    } while (cursor);

    const viaDidsArr = [...viaDids];
    let viaDidsSlice = viaDidsArr.splice(0, 25);
    let viaDidsProfiles: AppBskyActorDefs.ProfileViewDetailed[] = [];

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

      viaDidsProfiles.push(...res.data.profiles);

      viaDidsSlice = viaDidsArr.splice(0, 25);
    }

    data.records = rawRecords.map((val) => {
      let result: FetchData["records"][0] = {
        createdAt: val.createdAt,
        subject: val.subject,
      };

      if (val.via) {
        result.viaProfile = viaDidsProfiles.find((val1) => val1.did == val.via.uri.replace("at://", "").split("/")[0]);
      }

      return result;
    });

    console.log(data.records);

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
