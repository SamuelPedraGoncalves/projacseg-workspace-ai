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
// Importar o store aplica o tema salvo do colaborador antes da primeira renderização.
import "./features/theme/theme-store";

const container = document.getElementById("root");
if (!container) throw new Error("Elemento #root não encontrado.");

const router = createBrowserRouter(routes);

createRoot(container).render(
  <StrictMode>
    <AppProviders client={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
