import { createEffect, createMemo, createResource, createSignal } from "solid-js";
import { ResourceUri } from "@atcute/lexicons";
import { PostList } from "./PostList";
import { TextInput } from "./TextInput";
import { createStore } from "solid-js/store";
import { PostFilter } from "./PostFilter";
import { convertToCustomEmbed, countEmbeds } from "../utils/embed";
import MiniSearch from "minisearch";
import { AppBskyFeedPost } from "@atcute/bluesky";
import { useClient } from "../utils/client";
import { FetchData } from "../fetching/fetch-data";

export function PreviewPosts(props: { posts: ResourceUri[] }) {
  let searcher = new MiniSearch({
    idField: "uri",
    fields: ["text", "alt"],
    extractField: (document, fieldName) => {
      const post = document as FetchData["posts"][0];

      if (fieldName == "uri") {
        return post.uri;
      }

      if (fieldName == "text") {
        return post.text;
      }

      if (fieldName == "alt") {
        let alt = "";
        if (!post.embed) return alt;

        switch (post.embed.$type) {
          case "images":
            alt = post.embed.images.map((image) => image.alt).join("\n");
            break;
          case "video": {
            alt = post.embed.alt;
          }
        }
        return alt;
      }

      return "";
    },
  });

  const [fetchedData] = createResource(
    async (): Promise<FetchData> => {
      const xrpc = await useClient();

      const res = await xrpc.get("app.bsky.feed.getPosts", {
        params: { uris: props.posts },
      });

      if (res.ok) {
        const posts = res.data.posts.map((val) => ({
          uri: val.uri,
          author: val.author.did,
          text: (val.record as AppBskyFeedPost.Main).text,
          embed: convertToCustomEmbed(val.embed),
          createdAt: (val.record as AppBskyFeedPost.Main).createdAt,
          langs: (val.record as AppBskyFeedPost.Main).langs,
        }));
        const authors = res.data.posts
          .map((val) => ({
            did: val.author.did,
            handle: val.author.handle,
            displayName: val.author.displayName,
            following: val.author.viewer ? !!val.author.viewer.following : false,
          }))
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

        return { version: 1, posts: posts, authors: authors };
      }

      return { version: 1, posts: [], authors: [] };
    },
    { initialValue: { version: 1, posts: [], authors: [] } }
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
        !embedOptions.none && !embedOptions.image && !embedOptions.video && !embedOptions.post && !embedOptions.external
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

      posts = posts.filter((val) => result.find((res) => res.id == val.uri) !== undefined);
    }

    return posts;
  });

  const filteredPosts = createMemo(() => {
    let posts = searchedPosts();

    if (posts.length == 0) return posts;

    if (selectedAuthors().length > 0) {
      posts = posts.filter((val) => selectedAuthors().find((author) => author == val.author) !== undefined);
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

    return posts.map((val) => val.uri);
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
