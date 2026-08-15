import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { router } from "@/router";

export function AppDevtools() {
  return (
    <>
      <TanStackRouterDevtools initialIsOpen={false} position="bottom-left" router={router} />
      <ReactQueryDevtools buttonPosition="bottom-right" initialIsOpen={false} />
    </>
  );
}
