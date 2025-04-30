import {
  createSignal,
  onMount,
  Suspense,
  JSX,
  Switch,
  Match,
  createResource,
} from "solid-js";
import {
  createAuthorizationUrl,
  deleteStoredSession,
  finalizeAuthorization,
  getSession,
  OAuthUserAgent,
  resolveFromIdentity,
  Session,
} from "@atcute/oauth-browser-client";
import { At } from "@atcute/client/lexicons";
import { XRPC } from "@atcute/client";
import { A } from "@solidjs/router";
import Popover from "@corvu/popover";
import Dialog from "@corvu/dialog";

export const [loginState, setLoginState] = createSignal(false);
export let agent: OAuthUserAgent;
export let xrpc: XRPC;

export default function App(props: { children: JSX.Element }) {
  onMount(async () => {
    await retrieveSession();
  });

  let handleInput: HTMLInputElement;

  const login = async () => {
    const { identity, metadata } = await resolveFromIdentity(handleInput.value);

    const authUrl = await createAuthorizationUrl({
      metadata: metadata,
      identity: identity,
      scope: import.meta.env.VITE_OAUTH_SCOPE,
    });

    await new Promise((resolve) => setTimeout(resolve, 250));
    location.assign(authUrl);

    await new Promise((_resolve, reject) => {
      const listener = () => {
        reject(new Error(`user aborted the login request`));
      };

      window.addEventListener("pageshow", listener, { once: true });
    });
  };

  const logout = async () => {
    try {
      await agent.signOut();
      location.assign("/");
    } catch (err) {
      deleteStoredSession(agent.sub);
      location.assign("/");
    }
  };

  const [profile] = createResource(loginState, async () => {
    const res = await xrpc.get("app.bsky.actor.getProfile", {
      params: {
        actor: agent.sub as At.Did,
      },
    });

    return res.data;
  });

  return (
    <>
      <nav class="flex bg-neutral-800 text-white p-2 justify-between items-center h-16">
        <A href="/" class="text-6 font-bold">
          <span class="text-blue-500">Blue</span>
          <span class="text-yellow-500">Catalog</span>
        </A>

        <Switch>
          <Match when={loginState()}>
            <Popover>
              <Popover.Anchor class="h-32px">
                <Popover.Trigger>
                  <img
                    src={profile() ? profile().avatar : ""}
                    width={32}
                    height={32}
                    class="rounded"
                  />
                </Popover.Trigger>
              </Popover.Anchor>
              <Popover.Portal>
                <Popover.Content>
                  <div class="bg-neutral-700 p-2 rounded">
                    <p class="text-white">{profile().displayName}</p>
                    <p class="text-neutral-500">@{profile().handle}</p>
                    <div class="flex justify-evenly text-white">
                      <Popover.Close>
                        <A href="/settings">Settings</A>
                      </Popover.Close>
                      <button onclick={logout}>Logout</button>
                    </div>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover>
          </Match>
          <Match when={!loginState()}>
            <Dialog closeOnEscapeKeyDown closeOnOutsidePointer>
              <Dialog.Trigger
                class="bg-neutral-700 text-white p-2 rounded"
                id="login"
              >
                Login
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay class="fixed inset-0 z-50 bg-black/50" />
                <Dialog.Content class="fixed left-50% top-50% z-50 min-w-80 translate-x--50% translate-y--50% rounded-lg b-2 b-neutral-700 px-6 py-5 bg-neutral-800 text-white">
                  <Dialog.Label class="text-center font-700 text-6">
                    Login
                  </Dialog.Label>
                  <hr class="text-neutral-600 m-y-2"></hr>
                  <label>Handle:</label>
                  <input
                    type="text"
                    placeholder="example.bsky.social"
                    class="w-full p-1 bg-neutral-700 rounded m-t-1"
                    ref={handleInput}
                  ></input>
                  <button
                    class="text-align-center w-full p-2 bg-neutral-700 rounded m-t-3"
                    onclick={login}
                  >
                    Login
                  </button>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog>
          </Match>
        </Switch>
      </nav>
      <main>
        <Suspense>{props.children}</Suspense>
      </main>
    </>
  );
}

const retrieveSession = async () => {
  const init = async (): Promise<Session | undefined> => {
    const params = new URLSearchParams(location.hash.slice(1));

    if (params.has("state") && (params.has("code") || params.has("error"))) {
      history.replaceState(null, "", location.pathname + location.search);

      const session = await finalizeAuthorization(params);
      const did = session.info.sub;

      localStorage.setItem("lastSignedIn", did);
      return session;
    } else {
      const lastSignedIn = localStorage.getItem("lastSignedIn");

      if (lastSignedIn) {
        try {
          return await getSession(lastSignedIn as At.Did);
        } catch (err) {
          deleteStoredSession(lastSignedIn as At.Did);
          localStorage.removeItem("lastSignedIn");
          throw err;
        }
      }
    }
  };

  const session = await init().catch(() => {});

  if (session) {
    agent = new OAuthUserAgent(session);
    xrpc = new XRPC({ handler: agent });
    setLoginState(true);
  }
};
