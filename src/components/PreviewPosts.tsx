import { Client, simpleFetchHandler } from "@atcute/client";
import { docResolver } from "../app";
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
} from "solid-js";
import { Did, ResourceUri } from "@atcute/lexicons";
import { PostList } from "./PostList";
import { TextInput } from "./TextInput";
import { createStore } from "solid-js/store";
import { PostFilter } from "./PostFilter";
import { countEmbeds } from "../utils/embed";
import MiniSearch from "minisearch";
import {
  AppBskyFeedDefs,
  AppBskyFeedPost,
  AppBskyEmbedImages,
  AppBskyEmbedVideo,
} from "@atcute/bluesky";

export function PreviewPosts(props: { posts: ResourceUri[] }) {
  let searcher = new MiniSearch({
    idField: "cid",
    fields: ["text", "alt"],
    extractField: (document, fieldName) => {
      const feedViewPost = document as AppBskyFeedDefs.PostView;

      if (fieldName == "cid") {
        return feedViewPost.cid;
      }

      if (fieldName == "text") {
        const record = feedViewPost.record as AppBskyFeedPost.Main;
        return record.text;
      }

      if (fieldName == "alt") {
        let alt = "";
        if (feedViewPost.embed === undefined) return alt;

        switch (feedViewPost.embed.$type) {
          case "app.bsky.embed.images#view":
            const imageView = feedViewPost.embed as AppBskyEmbedImages.View;
            alt = imageView.images.map((image) => image.alt).join("\n");
            break;
          case "app.bsky.embed.video#view": {
            const videoView = feedViewPost.embed as AppBskyEmbedVideo.View;
            alt = videoView.alt;
          }
        }
        return alt;
      }

      return "";
    },
  });

  const [fetchedData] = createResource(
    async () => {
      const proxyDid = localStorage.getItem("proxyDid");
      let service;

      if (proxyDid) {
        const doc = await docResolver.resolve(
          proxyDid.trim() as Did<"plc"> | Did<"web">
        );

        service = doc.service.find((val) => val.id == "#bsky_appview")
          .serviceEndpoint as string;
      } else {
        service = "https://api.bsky.app";
      }

      const xrpc = new Client({
        handler: simpleFetchHandler({ service: service }),
      });

      const res = await xrpc.get("app.bsky.feed.getPosts", {
        params: { uris: props.posts },
      });

      if (res.ok) {
        const posts = res.data.posts;
        const authors = posts
          .map((val) => val.author)
          .filter((val, index, array) => {
            return array.findIndex((val1) => val.did == val1.did) == index;
          })
          .sort((a, b) => a.handle.localeCompare(b.handle));

        try {
          searcher.removeAll();
          searcher.addAll(posts);
        } catch (error) {
          console.error(error);
        }

        return { posts: posts, authors: authors };
      }

      return { posts: [], authors: [] };
    },
    { initialValue: { posts: [], authors: [] } }
  );

  const [searchVal, setSearchVal] = createSignal("");
  const [selectedAuthors, setSelectedAuthors] = createSignal<string[]>([]);
  const [embedOptions, setEmbedOptions] = createStore<{
    none: boolean;
    image: boolean;
    video: boolean;
    post: boolean;
    external: boolean;
    isAllFalse: boolean;
  }>({
    none: false,
    image: false,
    video: false,
    post: false,
    external: false,
    isAllFalse: true,
  });

  createEffect(() => {
    setEmbedOptions("isAllFalse", () => {
      return (
        !embedOptions.none &&
        !embedOptions.image &&
        !embedOptions.video &&
        !embedOptions.post &&
        !embedOptions.external
      );
    });
  });

  const embedCount = createMemo(() => {
    const res = {
      none: 0,
      image: 0,
      video: 0,
      post: 0,
      external: 0,
    };

    if (fetchedData().authors.length > 0) {
      for (const post of fetchedData().posts) {
        countEmbeds(res, post.embed);
      }
    }

    return res;
  });

  const searchedPosts = createMemo(() => {
    if (fetchedData().posts.length == 0) return [];

    let posts = fetchedData().posts;

    if (searchVal().trim() !== "") {
      const result = searcher.search(searchVal(), { fuzzy: 0.2 });

      posts = posts.filter(
        (val) => result.find((res) => res.id == val.cid) !== undefined
      );
    }

    return posts;
  });

  const filteredPosts = createMemo(() => {
    let posts = searchedPosts();

    if (posts.length == 0) return posts;

    if (selectedAuthors().length > 0) {
      posts = posts.filter(
        (val) =>
          selectedAuthors().find((author) => author == val.author.did) !==
          undefined
      );
    }

    if (!embedOptions.isAllFalse) {
      posts = posts.filter((val) => {
        const res = {
          none: 0,
          image: 0,
          video: 0,
          post: 0,
          external: 0,
        };

        countEmbeds(res, val.embed);

        return (
          (embedOptions.none && res.none > 0) ||
          (embedOptions.image && res.image > 0) ||
          (embedOptions.video && res.video > 0) ||
          (embedOptions.post && res.post > 0) ||
          (embedOptions.external && res.external > 0)
        );
      });
    }

    return posts;
  });

  return (
    <div class="p-y-2">
      <div class="flex justify-center gap-2 m-b-4">
        <TextInput
          icon={<div class="i-mingcute-search-2-fill h-full"></div>}
          placeholder="Search..."
          onChange={(value) => setSearchVal(value)}
        ></TextInput>
        <PostFilter
          embedCount={embedCount}
          embedOptions={embedOptions}
          setEmbedOptions={setEmbedOptions}
          authors={fetchedData().authors}
          selectedAuthors={selectedAuthors}
          setSelectedAuthors={setSelectedAuthors}
        ></PostFilter>
      </div>

      <PostList posts={filteredPosts}></PostList>
    </div>
  );
}
