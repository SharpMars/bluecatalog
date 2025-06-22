import {
  createSignal,
  onMount,
  Suspense,
  JSX,
  Switch,
  Match,
  createResource,
  createEffect,
  Show,
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
import { Client } from "@atcute/client";
import { A } from "@solidjs/router";
import Popover from "@corvu/popover";
import Dialog from "@corvu/dialog";
import { LoadingIndicator } from "./components/LoadingIndicator";
import { Did } from "@atcute/lexicons";
import {
  CompositeDidDocumentResolver,
  PlcDidDocumentResolver,
  WebDidDocumentResolver,
} from "@atcute/identity-resolver";

type ColorSchemeType = "auto" | "light" | "dark";

export const [loginState, setLoginState] = createSignal(false);
export const [colorScheme, setColorScheme] = createSignal<ColorSchemeType>(
  (localStorage.getItem("color-scheme") as ColorSchemeType)
    ? (localStorage.getItem("color-scheme") as ColorSchemeType)
    : "auto"
);

const colorSchemeMedia = window.matchMedia("(prefers-color-scheme: dark)");

function setColorSchemeClass(dark: boolean) {
  const setter = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  };
  if (document.startViewTransition) {
    const transition = document.startViewTransition(() => {
      setter(dark);
    });

    transition.ready.then(() => {
      document.documentElement.animate({
        duration: 300,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      });
    });
  } else {
    setter(dark);
  }
}

function onColorSchemeMediaChange(ev: MediaQueryListEvent) {
  setColorSchemeClass(ev.matches);
}

createEffect(() => {
  localStorage.setItem("color-scheme", colorScheme());

  switch (colorScheme()) {
    case "auto":
      setColorSchemeClass(colorSchemeMedia.matches);
      colorSchemeMedia.addEventListener("change", onColorSchemeMediaChange);
      break;
    case "light":
      colorSchemeMedia.removeEventListener("change", onColorSchemeMediaChange);
      setColorSchemeClass(false);
      break;
    case "dark":
      colorSchemeMedia.removeEventListener("change", onColorSchemeMediaChange);
      setColorSchemeClass(true);
      break;
  }
});

export let agent: OAuthUserAgent;
export let xrpc: Client;
export const docResolver = new CompositeDidDocumentResolver({
  methods: {
    plc: new PlcDidDocumentResolver(),
    web: new WebDidDocumentResolver(),
  },
});

export default function App(props: { children: JSX.Element }) {
  onMount(async () => {
    await retrieveSession();
  });

  let handleInput: HTMLInputElement;

  const [isBeingLoggedIn, setIsBeingLoggedIn] = createSignal(false);

  const login = async (ev: MouseEvent) => {
    try {
      setIsBeingLoggedIn(true);

      const { identity, metadata } = await resolveFromIdentity(
        handleInput.value
      );

      const authUrl = await createAuthorizationUrl({
        metadata: metadata,
        identity: identity,
        scope: import.meta.env.VITE_OAUTH_SCOPE,
      });

      await new Promise((resolve) => setTimeout(resolve, 250));
      location.assign(authUrl);

      await new Promise((_resolve, reject) => {
        const listener = () => {
          setIsBeingLoggedIn(false);
          reject(new Error(`user aborted the login request`));
        };

        window.addEventListener("pageshow", listener, { once: true });
      });
    } finally {
      setIsBeingLoggedIn(false);
    }
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
        actor: agent.sub as Did,
      },
    });

    if (!res.ok) {
      throw new Error(JSON.stringify(res.data));
    }

    return res.data;
  });

  return (
    <div class="flex flex-col min-h-screen">
      <nav class="flex light:bg-neutral-100 dark:bg-neutral-800 light:text-black dark:text-white p-x-3 justify-between items-center h-16">
        <A href="/" class="text-6 font-bold">
          <span class="text-blue-500">Blue</span>
          <span class="text-yellow-500">Catalog</span>
        </A>

        <Switch>
          <Match when={loginState()}>
            <Popover
              floatingOptions={{
                shift: {
                  padding: 8,
                },
              }}
            >
              <Popover.Trigger class="h-32px">
                <img
                  src={profile() ? profile().avatar : ""}
                  width={32}
                  height={32}
                  class="rounded"
                />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content>
                  <div class="flex justify-end p-x-3 m-t-1">
                    <svg
                      viewBox="0 0 100 100"
                      class="w-4 light:text-neutral-300 dark:text-neutral-700"
                    >
                      <polygon
                        points="0,100 50,0, 100,100"
                        fill="currentColor"
                      ></polygon>
                    </svg>
                  </div>
                  <div class="light:bg-neutral-300 dark:bg-neutral-700 p-2 rounded light:text-black dark:text-white">
                    <Show when={!profile.error}>
                      <p class="font-600">{profile().displayName}</p>
                      <p class="text-neutral-500">@{profile().handle}</p>
                    </Show>
                    <div class="flex justify-evenly">
                      <Popover.Close>
                        <A href="/settings">
                          <div class="i-mingcute-settings-5-line inline-block v--10%"></div>
                          Settings
                        </A>
                      </Popover.Close>
                      <button onclick={logout} class="cursor-pointer">
                        <div class="i-mingcute-exit-line inline-block v--10%"></div>
                        Logout
                      </button>
                    </div>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover>
          </Match>
          <Match when={!loginState()}>
            <div class="flex gap-3 items-center">
              <A href="/settings">Settings</A>
              <Dialog closeOnEscapeKeyDown closeOnOutsidePointer>
                <Dialog.Trigger
                  class="light:bg-sky-500 light:hover:bg-sky-400 dark:bg-sky-600 dark:hover:bg-sky-500 text-white p-2 rounded transition-ease-linear transition-all transition-100"
                  id="login"
                >
                  Login
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay class="fixed inset-0 z-50 bg-black/50" />
                  <Dialog.Content class="fixed left-50% top-50% z-50 min-w-80 translate-x--50% translate-y--50% rounded-lg b-2 light:b-neutral-300 dark:b-neutral-700 px-6 py-5 light:bg-neutral-200 dark:bg-neutral-800 light:text-black dark:text-white">
                    <Dialog.Label class="text-center font-700 text-6">
                      Login
                    </Dialog.Label>
                    <hr class="light:text-neutral-400 dark:text-neutral-600 m-y-2"></hr>
                    <label>Handle:</label>
                    {(() => {
                      let actualLoginButton: HTMLButtonElement;
                      return (
                        <>
                          <input
                            type="text"
                            placeholder="example.bsky.social"
                            name="handle"
                            class="w-full p-1 light:bg-neutral-300 dark:bg-neutral-700 rounded m-t-1"
                            ref={handleInput}
                            onkeypress={(ev) => {
                              if (ev.key == "Enter") {
                                actualLoginButton.click();
                              }
                            }}
                          ></input>
                          <button
                            class="text-align-center w-full p-2 light:bg-neutral-300 dark:bg-neutral-600 rounded m-t-3 light:hover:bg-neutral-400 dark:hover:bg-neutral-700 light:disabled:bg-neutral-500 dark:disabled:bg-neutral-900 disabled:cursor-no-drop transition-ease-linear transition-all transition-100"
                            onclick={login}
                            ref={actualLoginButton}
                            disabled={isBeingLoggedIn()}
                          >
                            <Show when={isBeingLoggedIn()} fallback={"Login"}>
                              <div class="flex text-6 justify-center m-x-1.80">
                                <LoadingIndicator></LoadingIndicator>
                              </div>
                            </Show>
                          </button>
                        </>
                      );
                    })()}
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog>
            </div>
          </Match>
        </Switch>
      </nav>
      <main class="flex-1 dark:bg-neutral-900 light:bg-neutral-200">
        <Suspense>{props.children}</Suspense>
      </main>
      <footer class="flex light:bg-neutral-100 dark:bg-neutral-800 light:text-black dark:text-white p-y-2 p-x-4 h-16 items-center justify-between">
        <div></div>
        <div class="flex gap-4">
          <a href="/privacy">Privacy Policy</a>
          <a href="https://github.com/SharpMars/bluecatalog">GitHub</a>
        </div>
      </footer>
    </div>
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
          return await getSession(lastSignedIn as Did);
        } catch (err) {
          deleteStoredSession(lastSignedIn as Did);
          localStorage.removeItem("lastSignedIn");
          throw err;
        }
      }
    }
  };

  const session = await init().catch(() => {});

  if (session) {
    agent = new OAuthUserAgent(session);
    xrpc = new Client({ handler: agent });
    xrpc.proxy = {
      did: localStorage.getItem("proxyDid")
        ? (localStorage.getItem("proxyDid") as Did)
        : "did:web:api.bsky.app",
      serviceId: "#bsky_appview",
    };
    setLoginState(true);
  }
};
