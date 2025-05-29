import { AppBskyFeedDefs, AppBskyActorDefs } from "@atcute/bluesky";

export interface FetchData {
  posts: AppBskyFeedDefs.PostView[];
  authors: AppBskyActorDefs.ProfileViewBasic[];
}
