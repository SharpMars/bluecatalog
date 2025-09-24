import { Datetime, Did, Handle, ResourceUri } from "@atcute/lexicons";
import { Embeds } from "../utils/embed";

export interface FetchData {
  version: number;
  posts: {
    uri: ResourceUri;
    author: Did;
    text: string;
    embed?: Embeds;
    createdAt?: Datetime;
    savedAt: Datetime;
    langs?: string[];
    via?: { did: Did; handle: Handle; displayName?: string };
  }[];
  authors: { did: Did; handle: Handle; displayName?: string; following: boolean }[];
  missing?: {
    createdAt: Datetime;
    uri: ResourceUri;
    via?: { did: Did; handle: Handle };
  }[];
}
