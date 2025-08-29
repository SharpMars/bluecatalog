import { ComAtprotoRepoStrongRef } from "@atcute/atproto";
import { AppBskyFeedDefs, AppBskyActorDefs } from "@atcute/bluesky";
import { Datetime } from "@atcute/lexicons";

export interface FetchData {
  posts: AppBskyFeedDefs.PostView[];
  authors: AppBskyActorDefs.ProfileViewBasic[];
  records?: {
    viaProfile?: AppBskyActorDefs.ProfileViewDetailed;
    subject: ComAtprotoRepoStrongRef.Main;
    createdAt: Datetime;
  }[];
}
