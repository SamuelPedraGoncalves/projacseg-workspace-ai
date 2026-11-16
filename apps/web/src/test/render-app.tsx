import { render } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router";
import { AppProviders } from "../app/providers";
import { createQueryClient } from "../app/query-client";
import { routes } from "../app/routes";
import { createDemoPlatform, type Platform } from "../platform/platform";

/** Renderiza a aplicação completa numa rota, com QueryClient isolado por teste. */
export function renderApp(path = "/", platform: Platform = createDemoPlatform()) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  const utils = render(
    <AppProviders client={client} platform={platform}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...utils, router };
}
