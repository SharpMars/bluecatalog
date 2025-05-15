/* @refresh reload */
import "virtual:uno.css";

import { render } from "solid-js/web";

import App from "./app";
import { Router } from "@solidjs/router";
import routes from "~solid-pages";

import "@atcute/bluesky";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { configureOAuth } from "@atcute/oauth-browser-client";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?"
  );
}

configureOAuth({
  metadata: {
    client_id: import.meta.env.VITE_OAUTH_CLIENT_ID,
    redirect_uri: import.meta.env.VITE_OAUTH_REDIRECT_URL,
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, refetchOnMount: false },
  },
});

render(
  () => (
    <QueryClientProvider client={queryClient}>
      <Router root={(props) => <App>{props.children}</App>}>{routes}</Router>
    </QueryClientProvider>
  ),
  root
);
