import { Client, simpleFetchHandler } from "@atcute/client";
import { docResolver, xrpc } from "../app";
import { Did } from "@atcute/lexicons";

export async function useClient() {
  if (xrpc) return xrpc;

  const proxyDid = localStorage.getItem("proxyDid");
  let service: string;

  if (proxyDid) {
    const doc = await docResolver.resolve(proxyDid.trim() as Did<"plc"> | Did<"web">);

    service = doc.service.find((val) => val.id == "#bsky_appview").serviceEndpoint as string;
  } else {
    service = "https://api.bsky.app";
  }

  const client = new Client({
    handler: simpleFetchHandler({ service: service }),
  });
  return client;
}
