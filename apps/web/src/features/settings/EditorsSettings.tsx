import type { PortalUserRef } from "@projacseg/shared";
import { Button } from "@projacseg/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { usePlatform } from "../../platform/platform-context";
import { SETUP_STATUS_KEY, type SetupApi } from "../setup/setup-api";

/** Quem pode criar regras. Só o administrador altera (a API também confere). */
export function EditorsSettings({ api, admin }: { api: SetupApi; admin: boolean }) {
  const query = useQuery({ queryKey: ["setup", "editors"], queryFn: () => api.editors() });
  if (query.isError) return <p role="alert">{query.error.message}</p>;
  if (!query.data) return <p>Carregando…</p>;
  return (
    <EditorsForm key={query.dataUpdatedAt} api={api} admin={admin} initial={query.data.editors} />
  );
}

function EditorsForm({
  api,
  admin,
  initial,
}: {
  api: SetupApi;
  admin: boolean;
  initial: PortalUserRef[];
}) {
  const { pickUsers } = usePlatform();
  const client = useQueryClient();
  const [editors, setEditors] = useState<PortalUserRef[]>(initial);

  const save = useMutation({
    mutationFn: () => api.saveEditors(editors),
    onSuccess: () => client.invalidateQueries({ queryKey: SETUP_STATUS_KEY }),
  });

  async function add() {
    if (!pickUsers) return;
    const picked = await pickUsers();
    setEditors((current) => {
      const known = new Set(current.map((user) => user.id));
      return [...current, ...picked.filter((user) => !known.has(user.id))];
    });
  }

  return (
    <div className="grid gap-5">
      <p className="text-sm">
        O administrador sempre pode criar regras. Estas pessoas também podem criar, editar e excluir
        regras e ver as Configurações.
      </p>
      {editors.length === 0 ? (
        <p className="text-sm text-(--text-secondary)">Só o administrador cria regras.</p>
      ) : (
        <ul aria-label="Quem pode criar regras" className="flex flex-wrap gap-2">
          {editors.map((editor) => (
            <li
              key={editor.id}
              className="flex items-center gap-1 rounded-full bg-[#eef2f8] py-1 pr-1 pl-3 text-sm"
            >
              {editor.name}
              {admin ? (
                <button
                  type="button"
                  aria-label={`Remover ${editor.name}`}
                  className="grid size-6 cursor-pointer place-items-center rounded-full hover:bg-black/5"
                  onClick={() =>
                    setEditors((current) => current.filter((item) => item.id !== editor.id))
                  }
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              ) : (
                <span className="w-2" />
              )}
            </li>
          ))}
        </ul>
      )}

      {admin ? (
        <>
          {save.isError ? (
            <p role="alert" className="text-sm text-(--color-danger)">
              {save.error.message}
            </p>
          ) : null}
          {save.isSuccess ? (
            <p role="status" className="text-sm text-(--color-success)">
              Lista salva.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button size="md" variant="secondary" disabled={!pickUsers} onClick={() => void add()}>
              Adicionar pessoas
            </Button>
            <Button size="md" disabled={save.isPending} onClick={() => save.mutate()}>
              Salvar
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-(--text-secondary)">Só o administrador altera esta lista.</p>
      )}
    </div>
  );
}
