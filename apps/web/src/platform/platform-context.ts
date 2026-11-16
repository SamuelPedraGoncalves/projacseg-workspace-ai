import { createContext, useContext } from "react";
import type { Platform } from "./platform";

export const PlatformContext = createContext<Platform | null>(null);

export function usePlatform(): Platform {
  const platform = useContext(PlatformContext);
  if (!platform) throw new Error("usePlatform precisa estar dentro de <PlatformContext.Provider>.");
  return platform;
}
