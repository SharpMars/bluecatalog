import { Show } from "solid-js";
import { loginState } from "../app";
import LoggedOut from "./+logged-out";
import LoggedIn from "./+logged_in";

export default function Home() {
  return (
    <>
      <Show when={!loginState()}>
        <LoggedOut></LoggedOut>
      </Show>
      <Show when={loginState()}>
        <LoggedIn></LoggedIn>
      </Show>
    </>
  );
}
