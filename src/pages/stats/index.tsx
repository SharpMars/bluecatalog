import { useQuery } from "@tanstack/solid-query";
import { fetchLikes } from "../../fetching/likes";
import { createMemo, createSignal, For, Match, Switch } from "solid-js";
import PieChart from "../../components/PieChart";
import ChartLegend from "../../components/ChartLegend";
import { agent, xrpc } from "../../app";
import { AppBskyActorDefs } from "@atcute/bluesky";
import { Did } from "@atcute/lexicons";
import createPagination from "../../utils/pagination";
import { Masonry } from "../../components/Masonry";
import { Axis, AxisCursor, AxisGrid, AxisLabel, AxisLine, AxisTooltip, Chart, Line, Point } from "solid-charts";
import { curveCardinal } from "solid-charts/curves";
import { A } from "@solidjs/router";
import { LoadingIndicator } from "../../components/LoadingIndicator";
import { gateRoute } from "../../utils/gate";
import { countEmbeds } from "../../utils/embed";

export default function Stats() {
  gateRoute();

  let refetch = false;

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

  const followsQuery = useQuery(() => ({
    queryFn: async ({ queryKey, signal }) => {
      if (!xrpc) return;

      try {
        let follows: AppBskyActorDefs.ProfileView[] = [];
        let cursor = undefined;

        do {
          let res = await xrpc.get("app.bsky.graph.getFollows", {
            params: { actor: agent.sub, cursor: cursor, limit: 100 },
            signal: signal,
          });

          if (!res.ok) throw new Error(JSON.stringify(res.data));

          follows.push(...res.data.follows);

          cursor = res.data.cursor;
          if (res.data.follows.length == 0) {
            cursor = undefined;
          }
        } while (cursor);

        return follows;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    queryKey: ["followers"],
  }));

  const countPerDay = createMemo(() => {
    if (!(postsQuery.isSuccess && postsQuery.data != null)) return;

    const res = [0, 0, 0, 0, 0, 0, 0];

    for (const record of postsQuery.data.records) {
      const date = new Date(record.createdAt);

      res[(date.getDay() + 6) % 7]++;
    }

    return res;
  });

  const countPerHour = createMemo(() => {
    if (!(postsQuery.isSuccess && postsQuery.data != null)) return;

    let res: number[] = Array.from(new Array(24), () => 0);

    for (const record of postsQuery.data.records) {
      const date = new Date(record.createdAt);

      res[date.getHours()]++;
    }

    return res;
  });

  const countPerAuthor = createMemo(() => {
    if (!(postsQuery.isSuccess && postsQuery.data != null)) return [];

    let res: Map<Did, { count: number; profile: AppBskyActorDefs.ProfileViewBasic }> = new Map();

    for (const post of postsQuery.data.posts) {
      if (!res.has(post.author.did)) {
        res.set(post.author.did, { count: 1, profile: post.author });
      } else {
        res.set(post.author.did, {
          count: res.get(post.author.did).count + 1,
          profile: post.author,
        });
      }
    }

    let sorted = res
      .entries()
      .toArray()
      .sort((a, b) => {
        const diff = a[1].count - b[1].count;
        if (diff == 0) return a[0].localeCompare(b[0]);

        return diff;
      });

    sorted.reverse();

    return sorted;
  });

  const [flipPerAuthor, setFlipPerAuthor] = createSignal(false);
  const [currentPerAuthorPage, perAuthorPageCount, currPerAuthorPageIndex, setCurrPerAuthorPageIndex] =
    createPagination(countPerAuthor, 10, undefined, flipPerAuthor);

  const hasAltText = createMemo(() => {
    if (!(postsQuery.isSuccess && postsQuery.data != null)) return;
    const res = { yes: 0, no: 0 };

    for (const post of postsQuery.data.posts) {
      if (post.embed) {
        switch (post.embed.$type) {
          case "app.bsky.embed.images#view":
            if (post.embed.images.map((val) => val.alt.trim() != "").reduce((a, b) => a && b)) res.yes++;
            else res.no++;
            break;
          case "app.bsky.embed.recordWithMedia#view":
            if (post.embed.media.$type == "app.bsky.embed.images#view") {
              if (post.embed.media.images.map((val) => val.alt.trim() != "").reduce((a, b) => a && b)) res.yes++;
              else res.no++;
            }
            break;
          default:
            break;
        }
      }
    }

    return res;
  });

  function daysInMonth(month: number, year: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  const postsCountByDay = createMemo(() => {
    if (!(postsQuery.isSuccess && postsQuery.data != null)) return;

    const map = new Map<number, Map<number, number[]>>();

    for (const post of postsQuery.data.records.toReversed()) {
      const date = new Date(post.createdAt);

      if (!map.has(date.getFullYear())) {
        map.set(date.getFullYear(), new Map());
      }

      if (!map.get(date.getFullYear()).has(date.getMonth())) {
        map.get(date.getFullYear()).set(
          date.getMonth(),
          Array.from(new Array(daysInMonth(date.getMonth(), date.getFullYear())), () => 0)
        );
      }

      map.get(date.getFullYear()).get(date.getMonth())[date.getDate() - 1]++;
    }

    return map;
  });

  function indexToMonth(index: number) {
    switch (index) {
      case 0:
        return "Jan";
      case 1:
        return "Feb";
      case 2:
        return "Mar";
      case 3:
        return "Apr";
      case 4:
        return "May";
      case 5:
        return "Jun";
      case 6:
        return "Jul";
      case 7:
        return "Aug";
      case 8:
        return "Sep";
      case 9:
        return "Oct";
      case 10:
        return "Nov";
      case 11:
        return "Dec";
      default:
        throw new Error("Index out of bounds.");
    }
  }

  const byDayChartData = createMemo(() => {
    if (postsCountByDay() == undefined) return [];

    const res = [];

    for (const year of postsCountByDay().keys()) {
      const monthsMap = postsCountByDay().get(year);

      for (const monthIndex of monthsMap.keys()) {
        const daysCount = monthsMap.get(monthIndex).reduce((a, b) => a + b);

        res.push({
          tooltip: `${indexToMonth(monthIndex)} ${year}`,
          xAxis: `${indexToMonth(monthIndex)}/${year - 2000}`,
          value: daysCount,
        });
      }
    }

    return res.slice(-12);
  });

  const hourChartData = createMemo(() => {
    if (countPerHour() == undefined) return [];

    return countPerHour().map((val, i) => {
      return {
        xAxis: i,
        value: val,
        tooltip: i + ":00",
      };
    });
  });

  const isFromFollowedAccount = createMemo(() => {
    if (!(postsQuery.isSuccess && postsQuery.data != null) || !(followsQuery.isSuccess && followsQuery.data != null))
      return;
    const res = { yes: 0, no: 0 };

    for (const post of postsQuery.data.posts) {
      if (followsQuery.data.find((val) => val.did == post.author.did) != undefined) res.yes++;
      else res.no++;
    }

    return res;
  });

  const countByEmbed = createMemo(() => {
    const res = {
      none: 0,
      image: 0,
      video: 0,
      post: 0,
      external: 0,
    };

    if (postsQuery.isSuccess) {
      for (const post of postsQuery.data.posts) {
        countEmbeds(res, post.embed);
      }
    }

    return res;
  });

  return (
    <>
      <Switch>
        <Match when={postsQuery.isLoading || followsQuery.isLoading}>
          <div class="h-screen-md max-h-[calc(100vh-4rem)] flex flex-col justify-center items-center text-32">
            <LoadingIndicator></LoadingIndicator>
          </div>
        </Match>
        <Match
          when={postsQuery.isSuccess && postsQuery.data != null && followsQuery.isSuccess && followsQuery.data != null}
        >
          <div class="flex flex-col items-center gap-8 p-y-4 p-x-2">
            <div class="flex flex-col gap-8">
              <div class="card">
                <p>Number of records: {postsQuery.data.records.length}</p>
                <p>
                  Number of unavailable posts:{" "}
                  <A href="./unavailable" class="underline underline-from-font underline-offset-2 after:content-['↗']">
                    {postsQuery.data.records.length - postsQuery.data.posts.length}
                  </A>
                </p>
              </div>
              <div class="card flex flex-col overflow-hidden">
                <p class="text-5 font-bold m-b-2">Like count in the past months:</p>
                <Chart inset={12} height={241} data={byDayChartData()}>
                  <Axis axis="y" position="left" tickCount={4}>
                    <AxisLabel />
                    <AxisGrid stroke-opacity={0.5} />
                  </Axis>
                  <Axis dataKey="xAxis" axis="x" position="bottom">
                    <AxisLabel />
                    <AxisLine />
                    <AxisCursor stroke-dasharray="10,10" stroke-width={2} />
                    <AxisTooltip tickGap={-56} class="transition-opacity transition-ease-linear transition-10ms">
                      {(props) => (
                        <>
                          <div class="bg-gray w-fit shadow-[0_0_16px_#000000] absolute z-1 select-none pointer-events-none rounded min-w-max p-2 overflow-hidden">
                            <p class="title font-bold">{props.data.tooltip}</p>
                            <p class="value">{props.data.value}</p>
                          </div>
                        </>
                      )}
                    </AxisTooltip>
                  </Axis>
                  <Line dataKey="value" stroke-width={4} curve={curveCardinal} class="stroke-sky-500" />
                  <Point
                    dataKey="value"
                    r={5}
                    stroke-width={2}
                    activeProps={{ r: 10 }}
                    class="fill-blue-500 transition-all"
                  />
                </Chart>
              </div>
              <Masonry columns={2} gap={8} verticalOnlyGap={8} maxWidth={576}>
                <div class="card max-w-[min(36rem,calc(100vw-32px))] w-full">
                  <div class="flex justify-center flex-col w-full ">
                    <p class="text-5 font-bold">How many likes have alt text:</p>
                    <div class="flex gap-4 justify-center flex-wrap m-t-2">
                      <PieChart padding={17} data={Object.values(hasAltText())} labels={["Yes", "No"]}></PieChart>
                      <div class="hidden min-[521px]:inline">
                        <ChartLegend labels={["Yes", "No"]} isHorizontal={false}></ChartLegend>
                      </div>
                      <div class="min-[521px]:hidden inline w-full">
                        <ChartLegend labels={["Yes", "No"]} isHorizontal={true}></ChartLegend>
                      </div>
                    </div>
                  </div>
                  {/*
						<div class="flex gap-4">	
            <PieChart
								padding={17}
								data={[99999999, 9999909, 9999909, 9999909, 9999909]}
								//data={[999990900, 999990900, 999990900, 999990900, 999990900]}
								//data={[1, 2, 3, 4]}
								labels={["Yes", "No"]}
							></PieChart>
							<ChartLegend labels={["Yes", "No"]}></ChartLegend>
						</div>
          */}
                </div>
                <div class="card max-w-[min(36rem,calc(100vw-32px))] w-full">
                  <p class="text-5 font-bold">Like count by days of the week:</p>
                  <div class="overflow-x-auto rounded-lg overflow-y-hidden b-2 b-neutral/25 b-solid m-t-2">
                    <table class="w-full">
                      <thead class="light:bg-neutral-200 dark:bg-neutral-900 w-full">
                        <tr class="b-b-2 b-neutral/25 b-solid [&>th:not(:first-child)]:b-l-2 [&>th]:b-neutral/25 [&>th]:p-2 [&>th]:w-[calc(100%/7)]">
                          <th>Mon</th>
                          <th>Tue</th>
                          <th>Wed</th>
                          <th>Thu</th>
                          <th>Fri</th>
                          <th>Sat</th>
                          <th>Sun</th>
                        </tr>
                      </thead>
                      <tbody class="[&>tr:not(:last-child)]:b-b-1 [&>tr]:b-neutral/25 [&_td]:p-2 [&_td]:text-center">
                        <tr class="">
                          <td>{countPerDay()[0]}</td>
                          <td>{countPerDay()[1]}</td>
                          <td>{countPerDay()[2]}</td>
                          <td>{countPerDay()[3]}</td>
                          <td>{countPerDay()[4]}</td>
                          <td>{countPerDay()[5]}</td>
                          <td>{countPerDay()[6]}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div class="card max-w-[min(36rem,calc(100vw-32px))] w-full">
                  <p class="text-5 font-bold">Likes based on hour:</p>
                  <div class="m-t-2">
                    <Chart data={hourChartData()}>
                      <Axis axis="y" position="left" tickCount={4}>
                        <AxisLabel />
                        <AxisGrid stroke-opacity={0.5} />
                      </Axis>
                      <Axis dataKey="xAxis" axis="x" position="bottom">
                        <AxisLabel />
                        <AxisLine />
                        <AxisCursor stroke-dasharray="10,10" stroke-width={2} />
                        <AxisTooltip tickGap={-56} class="transition-opacity transition-ease-linear transition-10ms">
                          {(props) => (
                            <>
                              <div class="bg-gray w-fit shadow-[0_0_16px_#000000] absolute z-1 select-none pointer-events-none rounded min-w-max p-2 overflow-hidden">
                                <p class="title font-bold">{props.data.tooltip}</p>
                                <p class="value">{props.data.value}</p>
                              </div>
                            </>
                          )}
                        </AxisTooltip>
                      </Axis>
                      <Line dataKey="value" stroke-width={4} curve={curveCardinal} class="stroke-sky-500" />
                      <Point
                        dataKey="value"
                        r={5}
                        stroke-width={2}
                        activeProps={{ r: 10 }}
                        class="fill-blue-500 transition-all"
                      />{" "}
                    </Chart>
                  </div>
                </div>
                <div class="card max-w-[min(36rem,calc(100vw-32px))] w-full">
                  <p class="font-bold text-5">Like count by author:</p>
                  <table class="m-t-2 rounded-t-lg overflow-x-auto b-2 b-neutral/25 b-solid block">
                    <thead class="light:bg-neutral-200 dark:bg-neutral-900">
                      <tr class="b-b-2 b-neutral/25 b-solid [&>th:not(:first-child)]:b-l-2 [&>th]:b-neutral/25">
                        <th class="p-2 w-full">Name</th>
                        <th class="p-2">Count</th>
                      </tr>
                    </thead>
                    <tbody class="[&>tr:not(:last-child)]:b-b-1 [&>tr]:b-neutral/25">
                      <For each={currentPerAuthorPage()}>
                        {(val) => (
                          <tr>
                            <td class="p-1 flex items-center overflow-hidden">
                              <div class="flex-shrink-0">
                                <img
                                  class="rounded aspect-square"
                                  src={val[1].profile.avatar}
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
                                    expand: !val[1].profile.displayName && val[1].profile.handle == "handle.invalid",
                                  }}
                                >
                                  {(() => {
                                    const profile = val[1].profile;

                                    if (profile.displayName) return profile.displayName;
                                    if (profile.handle != "handle.invalid") return profile.handle;

                                    return profile.did;
                                  })()}
                                </span>
                                <span
                                  class="text-3 line-height-snug m-t--1 text-neutral"
                                  hidden={!val[1].profile.displayName && val[1].profile.handle == "handle.invalid"}
                                >
                                  {(() => {
                                    const profile = val[1].profile;

                                    if (!profile.displayName) return profile.did;
                                    if (profile.handle != "handle.invalid") return profile.handle;
                                    if (profile.handle == "handle.invalid") return profile.did;

                                    return "";
                                  })()}
                                </span>
                              </div>
                            </td>
                            <td class="p-1 text-center">{val[1].count}</td>
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
                          setCurrPerAuthorPageIndex(
                            currPerAuthorPageIndex() - 1 < 0 ? perAuthorPageCount() - 1 : currPerAuthorPageIndex() - 1
                          )
                        }
                      >
                        <div class="i-mingcute-left-fill"></div>
                      </button>
                      <input
                        class="w-min field-sizing-content text-center m-0 moz-appearance-textfield [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-x-2"
                        type="number"
                        value={currPerAuthorPageIndex() + 1}
                        onkeypress={(e) => {
                          if (e.key != "Enter") return;

                          const val = e.currentTarget.value;
                          try {
                            const newIndex = parseInt(val);

                            if (newIndex > perAuthorPageCount()) throw new Error();

                            if (newIndex < 1) throw new Error();

                            setCurrPerAuthorPageIndex(newIndex - 1);
                            e.currentTarget.value = newIndex.toString();
                            e.currentTarget.blur();
                          } catch (error) {
                            e.currentTarget.value = (currPerAuthorPageIndex() + 1).toString();
                            e.currentTarget.blur();
                          }
                        }}
                        onblur={(e) => {
                          const val = e.target.value;
                          try {
                            const newIndex = parseInt(val);

                            if (newIndex > perAuthorPageCount()) throw new Error();

                            if (newIndex < 1) throw new Error();

                            setCurrPerAuthorPageIndex(newIndex - 1);
                            e.target.value = newIndex.toString();
                          } catch (error) {
                            e.target.value = (currPerAuthorPageIndex() + 1).toString();
                          }
                        }}
                      />
                      <p>/ {perAuthorPageCount()}</p>
                      <button
                        class="p-x-1"
                        onclick={() =>
                          setCurrPerAuthorPageIndex(
                            currPerAuthorPageIndex() + 1 >= perAuthorPageCount() ? 0 : currPerAuthorPageIndex() + 1
                          )
                        }
                      >
                        <div class="i-mingcute-right-fill"></div>
                      </button>
                    </div>{" "}
                    <button
                      class="group p-x-2"
                      onclick={(ev) => {
                        setFlipPerAuthor(!flipPerAuthor());
                        ev.currentTarget.classList.toggle("toggled");
                      }}
                    >
                      <div class="i-mingcute-sort-descending-fill group-[.toggled]:rotate-180 transition-all transition-250 transition-ease-in-out"></div>
                    </button>
                  </div>
                </div>
                <div class="card max-w-[min(36rem,calc(100vw-32px))] w-full">
                  <div class="flex justify-center flex-col w-full ">
                    <p class="text-5 font-bold">Like is from followed account:</p>
                    <div class="flex gap-4 justify-center flex-wrap m-t-2">
                      <PieChart
                        padding={17}
                        data={Object.values(isFromFollowedAccount())}
                        labels={["Yes", "No"]}
                      ></PieChart>
                      <div class="hidden min-[521px]:inline">
                        <ChartLegend labels={["Yes", "No"]} isHorizontal={false}></ChartLegend>
                      </div>
                      <div class="min-[521px]:hidden inline w-full">
                        <ChartLegend labels={["Yes", "No"]} isHorizontal={true}></ChartLegend>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="card max-w-[min(36rem,calc(100vw-32px))] w-full">
                  <div class="flex justify-center flex-col w-full ">
                    <p class="text-5 font-bold">Likes based on embed type:</p>
                    <div class="flex gap-4 justify-center flex-wrap m-t-2">
                      <PieChart
                        padding={17}
                        data={Object.values(countByEmbed())}
                        labels={Object.keys(countByEmbed()).map((str) =>
                          str.slice(0, 1).toLocaleUpperCase().concat(str.slice(1))
                        )}
                      ></PieChart>
                      <div class="hidden min-[521px]:inline">
                        <ChartLegend
                          labels={Object.keys(countByEmbed()).map((str) =>
                            str.slice(0, 1).toLocaleUpperCase().concat(str.slice(1))
                          )}
                          isHorizontal={false}
                        ></ChartLegend>
                      </div>
                      <div class="min-[521px]:hidden inline w-full">
                        <ChartLegend
                          labels={Object.keys(countByEmbed()).map((str) =>
                            str.slice(0, 1).toLocaleUpperCase().concat(str.slice(1))
                          )}
                          isHorizontal={true}
                        ></ChartLegend>
                      </div>
                    </div>
                  </div>
                </div>
              </Masonry>
            </div>
          </div>
        </Match>
      </Switch>
    </>
  );
}
