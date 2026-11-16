import { Navigate, type RouteObject } from "react-router";
import { JourneyPage } from "../features/journey/JourneyPage";
import { VIEWS } from "../features/journey/views";
import { AppShell } from "../layout/AppShell";

/**
 * Rotas da aplicação. Cada visão (Minha Jornada, Meus Negócios, Em Risco, Aguardando, Resolvidos)
 * é uma URL própria e reaproveita a mesma página com um filtro diferente.
 */
export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      ...Object.values(VIEWS).map(({ view, path }) => ({
        path,
        element: <JourneyPage key={view} view={view} />,
      })),
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
];
