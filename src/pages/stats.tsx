import { useQuery } from "@tanstack/solid-query";
import { fetchLikes } from "../fetching/likes";
import { createMemo, For, Match, Switch } from "solid-js";
import PieChart from "../components/PieChart";
import ChartLegend from "../components/ChartLegend";
import { agent, xrpc } from "../app";
import { AppBskyActorDefs } from "@atcute/bluesky";

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
		if (!(postsQuery.isSuccess && postsQuery.data != null)) return;

		let res: Map<string, number> = new Map();

		for (const post of postsQuery.data.posts) {
			if (!res.has(post.author.handle)) {
				res.set(post.author.handle, 1);
			} else {
				res.set(post.author.handle, res.get(post.author.handle) + 1);
			}
		}

		return res.entries().toArray();
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
					<div class="flex justify-center flex-col w-min">
						<p class="text-5 text-white font-bold text-center">
							Likes having alt text:
						</p>
						<div class="flex gap-4">
							<PieChart
								padding={17}
								data={Object.values(hasAltText())}
								labels={["Yes", "No"]}
							></PieChart>
							<ChartLegend labels={["Yes", "No"]}></ChartLegend>
						</div>
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
					</div>
					<div class="cols-2 p-2 gap-4">
						<p class="text-white">
							Number of records: {postsQuery.data.records.length}
						</p>
						<p class="text-white">
							Number of unavailable posts:{" "}
							{postsQuery.data.records.length - postsQuery.data.posts.length}
						</p>
						<table class="bg-gray [&_td]:p-2 h-min w-min">
							<thead>
								<tr>
									<td>Mon</td>
									<td>Tue</td>
									<td>Wed</td>
									<td>Thu</td>
									<td>Fri</td>
									<td>Sat</td>
									<td>Sun</td>
								</tr>
							</thead>
							<tbody>
								<tr>
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
						<div>
							<p class="text-white m-t-2 font-bold text-5">
								Likes based on hour:
							</p>
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
						<div>
							<p class="text-white m-t-2 font-bold text-5">
								Likes based on author (top 10):
							</p>
							<div class="text-white">
								<For
									each={countPerAuthor()
										.sort((a, b) => a[1] - b[1])
										.reverse()
										.slice(0, 10)}
								>
									{(val) => (
										<p>
											{val[0]} - {val[1]}
										</p>
									)}
								</For>
							</div>
						</div>
					</div>
				</Match>
			</Switch>
		</>
	);
}
