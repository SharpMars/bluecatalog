import { A } from "@solidjs/router";
import { Tabs } from "../components/Tabs";
import { createSignal } from "solid-js";

export default function LoggedOut() {
  type FeatureTabs = "search" | "pagination" | "stats";
  const [featureTab, setFeatureTab] = createSignal<FeatureTabs>("search");

  return (
    <>
      <section class="light:text-black dark:text-white p-2">
        <div class="flex flex-col items-center p-t-15dvh">
          <div class="flex items-center gap-1">
            <h1 class="text-[clamp(1.25rem,14vw,6rem)] font-bold">
              <span class="bg-linear-to-b from-[#1185feff] from-40% to-[#66a2ffff] to-80% bg-clip-text text-transparent">
                Blue
              </span>
              <span class="bg-linear-to-b from-[#ffe24dff] from-40% to-[#ffab66ff] to-80% bg-clip-text text-transparent">
                Catalog
              </span>
            </h1>
            <img src="/icons/icon.svg" class="hidden sm:block w-[clamp(6rem,14vw,8rem)]" />
          </div>
          <p class="text-[clamp(1rem,6vw,2rem)] text-center max-w-128">
            Easily search through your Bluesky likes and bookmarks
          </p>
          <div>
            <button
              onClick={() => document.getElementById("login").click()}
              class="light:bg-sky-500 light:hover:bg-sky-400 dark:bg-sky-600 dark:hover:bg-sky-500 text-white p-3 text-5 rounded m-t-4 w-64 transition-ease-linear transition-all transition-100"
            >
              Login
            </button>
            <div class="flex gap-2 m-t-2 justify-center items-center">
              <A href={"/privacy"} class="text-neutral hover:text-white transition-all transition-200 cursor-pointer">
                Privacy Policy
              </A>
              <div class="w-.4 h-4 bg-gray" />
              <div class="flex gap-.5">
                <a
                  target="_blank"
                  href="https://github.com/SharpMars/bluecatalog"
                  class="flex items-center p-1 text-5 group cursor-pointer"
                >
                  <div class="i-mingcute-github-line text-neutral group-hover:text-white transition-all transition-200"></div>
                </a>
                <a
                  target="_blank"
                  href="https://bsky.app/profile/did:plc:irx36xprktslecsbopbwnh5w"
                  class="flex items-center p-1 text-5 group cursor-pointer"
                >
                  <div class="i-mingcute-bluesky-social-line text-neutral group-hover:text-white transition-all transition-200"></div>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div class="m-x-4 md:m-x-auto max-w-192 m-t-15dvh rounded-xl overflow-hidden b-1 b-neutral b-solid shadow-black shadow-lg p-2 bg-black">
          <img src="/screenshot.webp" class="rounded-lg" />
        </div>
      </section>
      <section class="m-x-4 md:m-x-auto max-w-192 m-t-16 light:text-black dark:text-white p-1">
        <h2 class="text-center text-8 font-bold">Features</h2>
        <div class="flex justify-center m-t-2">
          <Tabs
            values={[
              { displayName: "Search & Filters", value: "search" },
              { displayName: "Pagination", value: "pagination" },
              { displayName: "Stats", value: "stats" },
            ]}
            getValue={featureTab}
            setValue={(val) => setFeatureTab(val)}
          />
        </div>
        <div
          hidden={featureTab() != "search"}
          class="flex flex-col md:flex-row gap-8 items-center p-y-4 justify-center"
        >
          <p class="text-center md:text-start">
            Search using text or different types of filters. These filters include filtering by author or by the type of
            embed in the post.
          </p>
          <img src="/search.webp" class="h-64 rounded-lg shadow-lg shadow-black/50" />
        </div>
        <div
          hidden={featureTab() != "pagination"}
          class="flex flex-col md:flex-row gap-8 items-center p-y-4 justify-center"
        >
          <p class="text-center md:text-start">
            Instead of infinite scroll, posts are split by pages. Want to go to your oldest likes? Go to the last page!
            Remember rougly where your favourite post was? Go to that page!
          </p>
          <div class="aspect-ratio-auto w-full max-h-64 flex justify-center">
            <img src="/pagination.webp" class="h-full rounded-lg shadow-lg shadow-black/50" />
          </div>
        </div>
        <div hidden={featureTab() != "stats"} class="flex flex-col md:flex-row gap-8 items-center p-y-4 justify-center">
          <p class="text-center md:text-start">
            Ever wanted stats about your Bluesky likes? Well, you're in luck! Available after sign-in in profile popup
            in top right.
          </p>
          <img src="/stats.webp" class="h-64 rounded-lg shadow-lg shadow-black/50" />
        </div>
      </section>
      <section class="m-x-4 md:m-x-auto max-w-192 m-t-16 light:text-black dark:text-white p-1 m-b-12">
        <h2 class="text-10 font-bold text-center">Want to give it a try?</h2>
        <p class="text-center">
          Here is a demo version! <br />
          <span class="text-neutral">(some features unavailable)</span>
        </p>
        <div class="flex justify-center">
          <A
            href="/preview"
            class="m-x-auto light:bg-sky-500 light:hover:bg-sky-400 dark:bg-sky-600 dark:hover:bg-sky-500 text-white p-3 text-5 rounded m-t-4 w-64
            transition-ease-linear transition-all transition-100 text-center cursor-pointer"
          >
            Go to demo!
          </A>
        </div>
      </section>
    </>
  );
}
