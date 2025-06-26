import { A } from "@solidjs/router";
import { refetchPrivacyUpdated } from "../app";

export const lastUpdatedPrivacy = new Date(2025, 4, 20);

export default function PrivacyPolicy() {
  localStorage.setItem(
    "previous-last-updated",
    lastUpdatedPrivacy.toISOString()
  );
  refetchPrivacyUpdated();

  return (
    <section class="p-4 p-y-0 flex md:justify-center light:text-black dark:text-white">
      <div class="md:min-w-2xl w-full md:w-a m-x-2 m-y-2">
        <h1 class="font-900 text-10">Privacy Policy</h1>
        <p class="m-b-2">
          Last updated:{" "}
          {new Intl.DateTimeFormat("en-GB").format(lastUpdatedPrivacy)}
        </p>
        <p>
          BlueCatalog is completely client-side app. This means that all data
          used to operate this web app is stored only on your device.
        </p>
        <h2 class="text-6 font-700 m-t-2">Updates</h2>
        <p>
          We reserve the right to update this privacy policy from time to time.
        </p>
        <h2 class="text-6 font-700 m-t-2">Data stored on your device</h2>
        <p>
          Data is downloaded and stored only upon user's request or consent.
          <br />
          This may include signing in or accepting a request inside a popup
          dialog while using the app.
          <br />
          Data stored includes:
        </p>
        <ul class="list-disc p-l-8">
          <li>
            Credentials used to authenticate with your ATProto PDS/Bluesky
            account
          </li>
          <li>Cache of your Bluesky likes and bookmarks</li>
        </ul>
        <h2 class="text-6 font-700 m-t-2">Data usage</h2>
        <p>
          All data provided to the app is used only on this device. All
          processing is done on-device. This processing includes:
        </p>
        <ul class="list-disc p-l-8">
          <li>Generating a cache of your Bluesky likes and bookmarks</li>
          <li>Search index based on the generated cache</li>
        </ul>
        <h2 class="text-6 font-700 m-t-2">Third party services</h2>
        <ul class="list-disc p-l-8">
          <li>Link favicons are using DuckDuckGo favicon API</li>
          <li>
            Bluesky/ATProto network is used to get the data used in the app
          </li>
          <li>Fonts are using Bunny Fonts</li>
        </ul>
        <h2 class="text-6 font-700 m-t-2">Data deletion</h2>
        <p>To delete the data stored on your device you need to:</p>
        <ul class="list-disc p-l-8">
          <li>
            Go to the{" "}
            <A
              href="/settings"
              class="text-sky-500 underline underline-1 underline-sky-500 underline-solid"
            >
              Settings
            </A>{" "}
            and press "Clear cache". This will delete the cache.
          </li>
          <li>Log out. This will delete the credentials.</li>
        </ul>
      </div>
    </section>
  );
}
