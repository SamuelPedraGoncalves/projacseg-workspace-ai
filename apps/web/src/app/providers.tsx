import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { Platform } from "../platform/platform";
import { PlatformContext } from "../platform/platform-context";

interface AppProvidersProps {
  client: QueryClient;
  platform: Platform;
  children: ReactNode;
}

export function AppProviders({ client, platform, children }: AppProvidersProps) {
  return (
    <PlatformContext.Provider value={platform}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </PlatformContext.Provider>
  );
}
