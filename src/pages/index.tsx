import { Show, Suspense } from "solid-js";
import { loginState } from "../app";
import LoggedOut from "./+logged-out";
import LoggedIn from "./+logged_in";
import { LoadingIndicator } from "../components/LoadingIndicator";

export default function Home() {
  return (
    <>
      <Show when={!loginState()}>
        <LoggedOut></LoggedOut>
      </Show>
      <Show when={loginState()}>
        <Suspense
          fallback={
            <div class="h-screen-md max-h-[calc(100vh-4rem)] flex flex-col justify-center items-center text-32">
              <LoadingIndicator></LoadingIndicator>
            </div>
          }
        >
          <LoggedIn></LoggedIn>
        </Suspense>
      </Show>
    </>
  );
}
