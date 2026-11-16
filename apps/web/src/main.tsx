import "@fontsource/poppins/latin-400.css";
import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-600.css";
import "@fontsource/poppins/latin-700.css";
import "@fontsource/poppins/latin-800.css";
import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router";
import { AppProviders } from "./app/providers";
import { createQueryClient } from "./app/query-client";
import { routes } from "./app/routes";
import { useThemeStore } from "./features/theme/theme-store";
import { bootstrapPlatform } from "./platform/platform";

const container = document.getElementById("root");
if (!container) throw new Error("Elemento #root não encontrado.");

// Identifica o ambiente (Bitrix24 ou demonstração) e o colaborador antes de renderizar, para
// aplicar o tema dele sem "piscar" o tema padrão.
void bootstrapPlatform().then((platform) => {
  useThemeStore.getState().initialize({
    tenantId: platform.user.tenantId,
    bitrixUserId: platform.user.bitrixUserId,
  });

  createRoot(container).render(
    <StrictMode>
      <AppProviders client={createQueryClient()} platform={platform}>
        <RouterProvider router={createBrowserRouter(routes)} />
      </AppProviders>
    </StrictMode>,
  );
});
