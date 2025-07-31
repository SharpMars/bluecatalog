import { useQuery } from "@tanstack/solid-query";
import { fetchLikes } from "../fetching/likes";
import { createMemo, createSignal, For, Match, Switch } from "solid-js";
import PieChart from "../components/PieChart";
import ChartLegend from "../components/ChartLegend";
import { agent, xrpc } from "../app";
import { AppBskyActorDefs } from "@atcute/bluesky";
import { Did } from "@atcute/lexicons";

export default function Stats() {
	let refetch = false;

	const postsQuery = useQuery(() => ({
		queryFn: async ({ queryKey, signal }) => {
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
		enabled: false,
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

		let res: Map<
			Did,
			{ count: number; profile: AppBskyActorDefs.ProfileViewBasic }
		> = new Map();

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

		return res.entries().toArray();
	});

	const [currCountPerAuthorPageIndex, setCurrCountPerAuthorPageIndex] =
		createSignal(0);
	const [flipCountPerAuthor, setFlipCountPerAuthor] = createSignal(false);

	const countPerAuthorPageCount = createMemo(() => {
		return Math.ceil(countPerAuthor()?.length / 10);
	});

	const currentPageCountPerAuthor = createMemo(() => {
		let data = countPerAuthor().sort((a, b) => {
			const diff = a[1].count - b[1].count;
			if (diff == 0) return a[0].localeCompare(b[0]);

			return diff;
		});
		if (!flipCountPerAuthor()) data.reverse();

		return data?.slice(
			0 + currCountPerAuthorPageIndex() * 10,
			10 + currCountPerAuthorPageIndex() * 10 > data?.length
				? data?.length
				: 10 + currCountPerAuthorPageIndex() * 10,
		);
	});

	const hasAltText = createMemo(() => {
		if (!(postsQuery.isSuccess && postsQuery.data != null)) return;
		const res = { yes: 0, no: 0 };

		for (const post of postsQuery.data.posts) {
			if (post.embed) {
				switch (post.embed.$type) {
					case "app.bsky.embed.images#view":
						if (
							post.embed.images
								.map((val) => val.alt.trim() != "")
								.reduce((a, b) => a && b)
						)
							res.yes++;
						else res.no++;
						break;
					case "app.bsky.embed.recordWithMedia#view":
						if (post.embed.media.$type == "app.bsky.embed.images#view") {
							if (
								post.embed.media.images
									.map((val) => val.alt.trim() != "")
									.reduce((a, b) => a && b)
							)
								res.yes++;
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

	return (
		<>
			<Switch>
				<Match when={postsQuery.isSuccess && postsQuery.data != null}>
					<div class="card w-fit">
						<p>Number of records: {postsQuery.data.records.length}</p>
						<p>
							Number of unavailable posts:{" "}
							{postsQuery.data.records.length - postsQuery.data.posts.length}
						</p>
					</div>
					<div class="card w-fit">
						<div class="flex justify-center flex-col w-min">
							<p class="text-5 font-bold text-center">
								How many likes have alt text:
							</p>
							<div class="flex gap-4">
								<PieChart
									padding={17}
									data={Object.values(hasAltText())}
									labels={["Yes", "No"]}
								></PieChart>
								<ChartLegend labels={["Yes", "No"]}></ChartLegend>
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
					<div class="card w-fit">
						<table class="bg-neutral-700 text-white block [&_td]:p-2 rounded-xl w-fit b-1 b-solid b-white [&_th]:p-2 text-center overflow-hidden">
							<thead class="b-b-1 b-solid b-white bg-sky-800">
								<tr class="[&>th:not(:first-child)]:b-l-1 [&>th]:b-l-solid [&>th]:b-l-white">
									<th>Mon</th>
									<th>Tue</th>
									<th>Wed</th>
									<th>Thu</th>
									<th>Fri</th>
									<th>Sat</th>
									<th>Sun</th>
								</tr>
							</thead>
							<tbody>
								<tr class="[&>td:not(:first-child)]:b-l-1 [&>td]:b-l-solid [&>td]:b-l-white">
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
					<div class="card w-fit">
						<p class="text-5 font-bold">Likes based on hour:</p>
						<div class="flex gap-2 flex-wrap max-w-md justify-between">
							<For
								each={countPerHour()
									.map((val, i) => {
										return {
											hour: i.toString().padStart(2, "0"),
											count: val,
										};
									})
									.sort((a, b) => a.count - b.count)
									.reverse()}
							>
								{(val) => (
									<p class="bg-gray p-2 w-32 text-center">
										{val.hour}: {val.count}
									</p>
								)}
							</For>
						</div>
					</div>
					<div class="card w-fit">
						<p class="font-bold text-5">Like count by author:</p>
						<table class="m-t-2 rounded-t-lg overflow-hidden b-2 b-neutral/25 b-solid block">
							<thead class="light:bg-neutral-200 dark:bg-neutral-900">
								<tr class="b-b-2 b-neutral/25 b-solid [&>th:not(:first-child)]:b-l-2 [&>th]:b-neutral/25">
									<th class="p-2">Name</th>
									<th class="p-2">Count</th>
								</tr>
							</thead>
							<tbody class="[&>tr:not(:last-child)]:b-b-1 [&>tr]:b-neutral/25">
								<For each={currentPageCountPerAuthor()}>
									{(val) => (
										<tr>
											<td class="p-1 flex items-center">
												<div>
													<img
														class="rounded aspect-square"
														src={val[1].profile.avatar}
														width={32}
														height={32}
													/>
												</div>
												<div class="flex flex-col p-1 p-r-8">
													<span class="line-height-snug">
														{val[1].profile.displayName}
													</span>
													<span class="text-3 line-height-snug m-t--1 text-neutral">
														{val[1].profile.handle != "handle.invalid"
															? val[1].profile.handle
															: val[1].profile.did}
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
										setCurrCountPerAuthorPageIndex(
											currCountPerAuthorPageIndex() - 1 < 0
												? countPerAuthorPageCount() - 1
												: currCountPerAuthorPageIndex() - 1,
										)
									}
								>
									<div class="i-mingcute-left-fill"></div>
								</button>
								<input
									class="w-min field-sizing-content text-center m-0 moz-appearance-textfield [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-x-2"
									type="number"
									value={currCountPerAuthorPageIndex() + 1}
									onkeypress={(e) => {
										if (e.key != "Enter") return;

										const val = e.currentTarget.value;
										try {
											const newIndex = parseInt(val);

											if (newIndex > countPerAuthorPageCount())
												throw new Error();

											if (newIndex < 1) throw new Error();

											setCurrCountPerAuthorPageIndex(newIndex - 1);
											e.currentTarget.value = newIndex.toString();
											e.currentTarget.blur();
										} catch (error) {
											e.currentTarget.value = (
												currCountPerAuthorPageIndex() + 1
											).toString();
											e.currentTarget.blur();
										}
									}}
									onblur={(e) => {
										const val = e.target.value;
										try {
											const newIndex = parseInt(val);

											if (newIndex > countPerAuthorPageCount())
												throw new Error();

											if (newIndex < 1) throw new Error();

											setCurrCountPerAuthorPageIndex(newIndex - 1);
											e.target.value = newIndex.toString();
										} catch (error) {
											e.target.value = (
												currCountPerAuthorPageIndex() + 1
											).toString();
										}
									}}
								/>
								<p>/ {countPerAuthorPageCount()}</p>
								<button
									class="p-x-1"
									onclick={() =>
										setCurrCountPerAuthorPageIndex(
											currCountPerAuthorPageIndex() + 1 >=
												countPerAuthorPageCount()
												? 0
												: currCountPerAuthorPageIndex() + 1,
										)
									}
								>
									<div class="i-mingcute-right-fill"></div>
								</button>
							</div>{" "}
							<button
								class="group p-x-2"
								onclick={(ev) => {
									setFlipCountPerAuthor(!flipCountPerAuthor());
									ev.currentTarget.classList.toggle("toggled");
								}}
							>
								<div class="i-mingcute-sort-descending-fill group-[.toggled]:rotate-180 transition-all transition-250 transition-ease-in-out"></div>
							</button>
						</div>
					</div>
				</Match>
			</Switch>
		</>
	);
}
