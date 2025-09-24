import { Datetime, Did, Handle, ResourceUri } from "@atcute/lexicons";
import { Embeds } from "../utils/embed";

export interface FetchData {
  version: number;
  posts: { uri: ResourceUri; author: Did; text: string; embed?: Embeds; createdAt: Datetime; langs?: string[] }[];
  authors: { did: Did; handle: Handle; displayName?: string; following: boolean }[];
  //records?: {
  //  viaProfile?: AppBskyActorDefs.ProfileViewDetailed;
  //  subject: ComAtprotoRepoStrongRef.Main;
  //  createdAt: Datetime;
  //}[];
}
