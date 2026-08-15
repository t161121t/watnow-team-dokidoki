import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { PwaUpdatePrompt } from "@/components/pwa-update-prompt";
import { router } from "@/router";
import "@/styles.css";

const AppDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@/components/app-devtools").then((module) => ({ default: module.AppDevtools })),
    )
  : null;

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <PwaUpdatePrompt />
      {AppDevtools ? (
        <Suspense fallback={null}>
          <AppDevtools />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  </StrictMode>,
);
