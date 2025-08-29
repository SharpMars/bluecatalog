import { Suspense } from "solid-js";
import { PreviewPosts } from "../components/PreviewPosts";
import { LoadingIndicator } from "../components/LoadingIndicator";

export default function Preview() {
  return (
    <>
      <section class="flex flex-col items-center p-2 p-y-4">
        <h1 class="w-fit text-4xl font-bold dark:text-white light:text-black m-b-2 text-center">
          Welcome to the demo!
        </h1>
        <Suspense
          fallback={
            <div class="h-screen-md max-h-[calc(100vh-4rem)] flex flex-col justify-center items-center text-32">
              <LoadingIndicator></LoadingIndicator>
            </div>
          }
        >
          <PreviewPosts
            posts={[
              "at://did:plc:irx36xprktslecsbopbwnh5w/app.bsky.feed.post/3lv7bcp5y522x",
              "at://did:plc:irx36xprktslecsbopbwnh5w/app.bsky.feed.post/3lwcp37wl3226",
              "at://did:plc:irx36xprktslecsbopbwnh5w/app.bsky.feed.post/3lul6zpqisk2w",
              "at://did:plc:wshs7t2adsemcrrd4snkeqli/app.bsky.feed.post/3lvvzljpfhc2x",
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
