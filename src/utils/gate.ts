import { useNavigate } from "@solidjs/router";
import { xrpc } from "../app";

export function gateRoute() {
  if (!xrpc) useNavigate()("/");
}
