import { Suspense } from "solid-js";
import { PreviewPosts } from "../components/PreviewPosts";

export default function LoggedOut() {
  return (
    <>
      <section>
        <div class="h-screen-lg max-h-[calc(100vh-4rem)] flex flex-col justify-center items-center relative">
          <h1 class="text-[clamp(16px,15vw,4rem)] font-bold">
            <span class="text-blue-500">Blue</span>
            <span class="text-yellow-500">Catalog</span>
          </h1>
          <p class="text-[clamp(8px,7vw,2rem)] text-center light:text-black dark:text-white">
            Search through your Bluesky
            <br /> likes and bookmarks <b>easily</b>
          </p>
          <button
            onClick={() => document.getElementById("login").click()}
            class="light:bg-sky-500 light:hover:bg-sky-400 dark:bg-sky-600 dark:hover:bg-sky-500 text-white p-2 rounded m-t-4 w-48 transition-ease-linear transition-all transition-100"
          >
            Login
          </button>
          <div class="i-mingcute-align-arrow-down-line dark:text-white light:text-black text-4xl absolute bottom-4 animate-bounce"></div>
        </div>
      </section>
      <section class="flex flex-col items-center p-2 p-y-4">
        <h1 class="w-fit text-4xl font-bold dark:text-white light:text-black m-b-2">
          Test it out
        </h1>
        <Suspense>
          <PreviewPosts
            posts={[
              "at://did:plc:irx36xprktslecsbopbwnh5w/app.bsky.feed.post/3lpkllg56g227",
              "at://did:plc:irx36xprktslecsbopbwnh5w/app.bsky.feed.post/3lotwufl6qk2i",
              "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3lh5iyaqqos24",
              "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3lktlkvngcc2k",
            ]}
          ></PreviewPosts>
        </Suspense>
      </section>
    </>
  );
}
