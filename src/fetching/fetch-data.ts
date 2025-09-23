import { ComAtprotoRepoStrongRef } from "@atcute/atproto";
import { AppBskyActorDefs } from "@atcute/bluesky";
import { Datetime, Did, ResourceUri } from "@atcute/lexicons";
import { Embeds } from "../utils/embed";

export interface FetchData {
  version: number;
  posts: { uri: ResourceUri; author: Did; text: string; embed?: Embeds; createdAt: Datetime; langs?: string[] }[];
  //authors: AppBskyActorDefs.ProfileViewBasic[];
  //records?: {
  //  viaProfile?: AppBskyActorDefs.ProfileViewDetailed;
  //  subject: ComAtprotoRepoStrongRef.Main;
  //  createdAt: Datetime;
  //}[];
}
