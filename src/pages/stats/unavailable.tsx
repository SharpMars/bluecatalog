import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { fetchLikes } from "../../fetching/likes";
import { Switch, Match, For, Show } from "solid-js";
import { xrpc } from "../../app";
import { AppBskyActorDefs } from "@atcute/bluesky";
import { ActorIdentifier, ResourceUri } from "@atcute/lexicons";
import { XRPCErrorPayload } from "@atcute/client";
import { LoadingIndicator } from "../../components/LoadingIndicator";
import { gateRoute } from "../../utils/gate";

export default function Unavailable() {
  gateRoute();

  let refetch = false;

  const queryClient = useQueryClient();

  const postsQuery = useQuery(() => ({
    queryFn: async ({ queryKey, signal }) => {
      if (!xrpc) return;

      try {
        let data = await fetchLikes(refetch, signal);
        refetch = false;

        if (data === null) {
          return null;
        }

        return data;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    queryKey: ["likes"],
  }));

  const missingPostsQuery = useQuery(() => ({
    queryFn: async ({ queryKey, signal }) => {
      const missingPosts = postsQuery.data.records.filter(
        (record) => !postsQuery.data.posts.find((post) => post.uri == record.subject.uri)
      );

      if (missingPosts.length == 0) return [];

      const res: {
        uri: ResourceUri;
        profileMissing: boolean;
        profileMissingReason?: string;
        profile?: AppBskyActorDefs.ProfileViewDetailed;
        likedAt: string;
      }[] = [];

      const formatter = new Intl.DateTimeFormat();

      for (const record of missingPosts) {
        if (signal.aborted) break;

        let profile: { notFound: boolean; reason?: string; data?: AppBskyActorDefs.ProfileViewDetailed };
        let did = record.subject.uri.replace("at://", "").split("/")[0];

        profile = await queryClient.fetchQuery({
          queryKey: [did],
          queryFn: async ({ queryKey, signal }) => {
            const profileRes = await xrpc.get("app.bsky.actor.getProfile", {
              params: { actor: queryKey[0] as ActorIdentifier },
              signal: signal,
            });

            if (profileRes.ok) {
              return { notFound: false, data: profileRes.data };
            } else {
              return { notFound: true, reason: (profileRes.data as XRPCErrorPayload).message };
            }
          },
        });

        res.push({
          uri: record.subject.uri,
          profileMissing: profile.notFound,
          profileMissingReason: profile.reason,
          profile: profile.data,
          likedAt: formatter.format(new Date(record.createdAt)),
        });
      }

      return res;
    },
    queryKey: ["unavailable"],
    enabled: !!postsQuery.data,
  }));

  return (
    <>
      <Switch>
        <Match when={postsQuery.isLoading}>
          <div class="h-screen-md max-h-[calc(100vh-4rem)] flex flex-col justify-center items-center text-32">
            <LoadingIndicator></LoadingIndicator>
          </div>
        </Match>
        <Match when={postsQuery.isSuccess && postsQuery.data != null}>
          <div class="flex flex-col items-center p-y-4 p-x-2">
            <div class="flex flex-col gap-8">
              <div class="card">
                <p>Number of records: {postsQuery.data.records.length}</p>
                <p>Number of unavailable posts: {postsQuery.data.records.length - postsQuery.data.posts.length}</p>
              </div>
              <div class="card p-b-2">
                <Switch>
                  <Match when={!missingPostsQuery.isSuccess}>
                    <div class="w-96 h-screen max-h-[calc(100vh-20rem)] flex flex-col justify-center items-center text-32">
                      <LoadingIndicator></LoadingIndicator>
                    </div>
                  </Match>
                  <Match when={missingPostsQuery.isSuccess && missingPostsQuery.data != null}>
                    <table>
                      <For each={missingPostsQuery.data}>
                        {(val, i) => (
                          <tr class="h-10">
                            <td>
                              <p class="p-r-2">{i() + 1}</p>
                            </td>
                            <td>
                              <div class="flex gap-2 items-center p-r-2">
                                <Switch>
                                  <Match when={!val.profileMissing}>
                                    <img
                                      class="rounded"
                                      width={32}
                                      height={32}
                                      src={val.profile.avatar ? val.profile.avatar : "/fallback.svg"}
                                    />
                                    <p>{val.profile.handle}</p>
                                  </Match>
                                  <Match when={val.profileMissing}>{val.profileMissingReason}</Match>
                                </Switch>
                              </div>
                            </td>
                            <td>
                              <p class="text-right p-r-3">{val.likedAt}</p>
                            </td>
                            <td>
                              <a
                                target="_blank"
                                href={`https://constellation.microcosm.blue/links/all?target=${val.uri}`}
                              >
                                Ref
                              </a>
                            </td>
                          </tr>
                        )}
                      </For>
                    </table>
                  </Match>
                </Switch>
              </div>
            </div>
          </div>
        </Match>
      </Switch>
    </>
  );
}
