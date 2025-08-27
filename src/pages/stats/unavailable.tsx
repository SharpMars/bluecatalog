import { useQuery } from "@tanstack/solid-query";
import { fetchLikes } from "../../fetching/likes";
import { Switch, Match, For, createSignal } from "solid-js";
import { xrpc } from "../../app";
import { AppBskyActorDefs } from "@atcute/bluesky";
import { ActorIdentifier, ResourceUri } from "@atcute/lexicons";
import { XRPCErrorPayload } from "@atcute/client";
import { LoadingIndicator } from "../../components/LoadingIndicator";
import { gateRoute } from "../../utils/gate";
import { useNavigate } from "@solidjs/router";
import createPagination from "../../utils/pagination";
import Tooltip from "@corvu/tooltip";

export default function Unavailable() {
  gateRoute();

  let refetch = false;

  const postsQuery = useQuery(() => ({
    queryFn: async ({ signal }) => {
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
    queryFn: async ({ signal }) => {
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

      const profiles: Map<string, { notFound: boolean; reason?: string; data?: AppBskyActorDefs.ProfileViewDetailed }> =
        new Map();

      const dids = missingPosts
        .map((val) => val.subject.uri.replace("at://", "").split("/")[0])
        .filter((val, index, array) => {
          return array.findIndex((val1) => val == val1) == index;
        });

      const didsCopy = [...dids];

      while (didsCopy.length > 0) {
        const slice = didsCopy.splice(0, 25);

        const profilesRes = await xrpc.get("app.bsky.actor.getProfiles", {
          params: { actors: slice as ActorIdentifier[] },
          signal: signal,
        });

        if (profilesRes.ok) {
          for (const profile of profilesRes.data.profiles) {
            profiles.set(profile.did, { data: profile, notFound: false });
          }
        } else {
          console.error((profilesRes.data as XRPCErrorPayload).message);
        }
      }

      const notFoundDids = dids.filter((val) => !profiles.values().find((val2) => val2.data.did == val));

      for (const did of notFoundDids) {
        const profileRes = await xrpc.get("app.bsky.actor.getProfile", {
          params: { actor: did as ActorIdentifier },
          signal: signal,
        });

        if (profileRes.ok) {
          profiles.set(did, { data: profileRes.data, notFound: false });
        } else {
          profiles.set(did, { notFound: true, reason: (profileRes.data as XRPCErrorPayload).message });
        }
      }

      for (const record of missingPosts) {
        const did = record.subject.uri.replace("at://", "").split("/")[0];
        const profile = profiles.get(did);

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

  const missingPostsProxy = () => {
    if (!missingPostsQuery.isSuccess) return [];
    return missingPostsQuery.data;
  };

  const [flipMissingPosts, setFlipMissingPosts] = createSignal(false);
  const [currentMissingPostsPage, missingPostsPageCount, currMissingPostsPageIndex, setCurrMissingPostsPageIndex] =
    createPagination(missingPostsProxy, 15, undefined, flipMissingPosts);

  return (
    <>
      <Switch>
        <Match when={postsQuery.isLoading}>
          <div class="h-screen-md max-h-[calc(100vh-4rem)] flex flex-col justify-center items-center text-32">
            <LoadingIndicator></LoadingIndicator>
          </div>
        </Match>
        <Match when={postsQuery.data == null || postsQuery.isError}>
          <>
            {(() => {
              useNavigate()("/stats");
              return "";
            })()}
          </>
        </Match>
        <Match when={postsQuery.isSuccess && postsQuery.data != null}>
          <div class="flex flex-col items-center p-y-4 p-x-2">
            <div class="flex flex-col gap-8">
              <div>
                <h1 class="text-[clamp(2rem,8vw,3rem)] font-700 light:text-black dark:text-white">Unavailable Likes</h1>
                <hr class="m-t-4 light:text-black dark:text-white rounded"></hr>
              </div>
              <div class="card">
                <p>Number of records: {postsQuery.data.records.length}</p>
                <p>Number of unavailable posts: {postsQuery.data.records.length - postsQuery.data.posts.length}</p>
              </div>
              <div class="card">
                <Switch>
                  <Match when={!missingPostsQuery.isSuccess}>
                    <div class="w-96 h-screen max-h-[calc(100vh-20rem)] flex flex-col justify-center items-center text-32">
                      <LoadingIndicator></LoadingIndicator>
                    </div>
                  </Match>
                  <Match when={missingPostsQuery.isSuccess && missingPostsQuery.data != null}>
                    <table class="rounded-t-lg overflow-x-auto b-2 b-neutral/25 b-solid block">
                      <thead class="light:bg-neutral-200 dark:bg-neutral-900">
                        <tr class="b-b-2 b-neutral/25 b-solid [&>th:not(:first-child)]:b-l-2 [&>th]:b-neutral/25">
                          <th class="p-2 w-full">Profile</th>
                          <th class="p-2">Like Date</th>
                          <th class="p-2">URI</th>
                        </tr>
                      </thead>
                      <tbody class="[&>tr:not(:last-child)]:b-b-1 [&>tr]:b-neutral/25">
                        <For each={currentMissingPostsPage()}>
                          {(val) => (
                            <tr>
                              <td class="p-1 flex items-center overflow-hidden">
                                <Switch>
                                  <Match when={!val.profileMissing}>
                                    <div class="flex-shrink-0">
                                      <img
                                        class="rounded aspect-square"
                                        src={val.profile.avatar}
                                        width={32}
                                        height={32}
                                        onerror={(ev) => {
                                          ev.currentTarget.src = "./fallback.svg";
                                        }}
                                      />
                                    </div>
                                    <div class="flex flex-col p-1">
                                      <span
                                        class="line-height-snug [&.expand]:h-7"
                                        classList={{
                                          expand: !val.profile.displayName && val.profile.handle == "handle.invalid",
                                        }}
                                      >
                                        {(() => {
                                          const profile = val.profile;

                                          if (profile.displayName) return profile.displayName;
                                          if (profile.handle != "handle.invalid") return profile.handle;

                                          return profile.did;
                                        })()}
                                      </span>
                                      <span
                                        class="text-3 line-height-snug m-t--1 text-neutral"
                                        hidden={!val.profile.displayName && val.profile.handle == "handle.invalid"}
                                      >
                                        {(() => {
                                          const profile = val.profile;

                                          if (!profile.displayName) return profile.did;
                                          if (profile.handle != "handle.invalid") return profile.handle;
                                          if (profile.handle == "handle.invalid") return profile.did;

                                          return "";
                                        })()}
                                      </span>
                                    </div>
                                  </Match>
                                  <Match when={val.profileMissing}>
                                    <div class="flex flex-col p-1">
                                      <span class="line-height-7">{val.profileMissingReason}</span>
                                    </div>
                                  </Match>
                                </Switch>
                              </td>
                              <td class="p-1 text-center">{val.likedAt}</td>
                              <td class="p-1 p-y-0 text-center text-5">
                                {(() => {
                                  let textRef: HTMLParagraphElement;

                                  return (
                                    <Tooltip
                                      placement="top"
                                      openDelay={0}
                                      floatingOptions={{ offset: 13 }}
                                      hoverableContent={false}
                                      closeOnPointerDown={false}
                                      onBlur={() => {
                                        if (textRef) textRef.textContent = "Copy to clipboard";
                                      }}
                                    >
                                      <Tooltip.Anchor>
                                        <Tooltip.Trigger
                                          as="button"
                                          class="w-8 h-8 flex items-center justify-center"
                                          onclick={() => {
                                            navigator.clipboard.writeText(val.uri);
                                            if (textRef) {
                                              textRef.textContent = "Copied!";
                                            }
                                          }}
                                        >
                                          <div class="i-mingcute-copy-line"></div>
                                        </Tooltip.Trigger>
                                      </Tooltip.Anchor>
                                      <Tooltip.Portal>
                                        <Tooltip.Content class="rounded-lg p-1 light:bg-neutral-300 dark:bg-neutral-700 dark:text-white light:text-black text-center">
                                          <p ref={textRef}>Copy to clipboard</p>
                                          <Tooltip.Arrow class="light:text-neutral-300 dark:text-neutral-700" />
                                        </Tooltip.Content>
                                      </Tooltip.Portal>
                                    </Tooltip>
                                  );
                                })()}
                              </td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                    <div class="light:bg-neutral-200 dark:bg-neutral-900 b-2 b-t-0 b-neutral/25 rounded-b-lg flex overflow-hidden justify-between">
                      <div class="flex">
                        <button
                          class="p-x-1"
                          onclick={() =>
                            setCurrMissingPostsPageIndex(
                              currMissingPostsPageIndex() - 1 < 0
                                ? missingPostsPageCount() - 1
                                : currMissingPostsPageIndex() - 1
                            )
                          }
                        >
                          <div class="i-mingcute-left-fill"></div>
                        </button>
                        <input
                          class="w-min field-sizing-content text-center m-0 moz-appearance-textfield [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-x-2"
                          type="number"
                          value={currMissingPostsPageIndex() + 1}
                          onkeypress={(e) => {
                            if (e.key != "Enter") return;

                            const val = e.currentTarget.value;
                            try {
                              const newIndex = parseInt(val);

                              if (newIndex > missingPostsPageCount()) throw new Error();

                              if (newIndex < 1) throw new Error();

                              setCurrMissingPostsPageIndex(newIndex - 1);
                              e.currentTarget.value = newIndex.toString();
                              e.currentTarget.blur();
                            } catch (error) {
                              e.currentTarget.value = (currMissingPostsPageIndex() + 1).toString();
                              e.currentTarget.blur();
                            }
                          }}
                          onblur={(e) => {
                            const val = e.target.value;
                            try {
                              const newIndex = parseInt(val);

                              if (newIndex > missingPostsPageCount()) throw new Error();

                              if (newIndex < 1) throw new Error();

                              setCurrMissingPostsPageIndex(newIndex - 1);
                              e.target.value = newIndex.toString();
                            } catch (error) {
                              e.target.value = (currMissingPostsPageIndex() + 1).toString();
                            }
                          }}
                        />
                        <p>/ {missingPostsPageCount()}</p>
                        <button
                          class="p-x-1"
                          onclick={() =>
                            setCurrMissingPostsPageIndex(
                              currMissingPostsPageIndex() + 1 >= missingPostsPageCount()
                                ? 0
                                : currMissingPostsPageIndex() + 1
                            )
                          }
                        >
                          <div class="i-mingcute-right-fill"></div>
                        </button>
                      </div>{" "}
                      <button
                        class="group p-x-2"
                        onclick={(ev) => {
                          setFlipMissingPosts(!flipMissingPosts());
                          ev.currentTarget.classList.toggle("toggled");
                        }}
                      >
                        <div class="i-mingcute-sort-descending-fill group-[.toggled]:rotate-180 transition-all transition-250 transition-ease-in-out"></div>
                      </button>
                    </div>
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
