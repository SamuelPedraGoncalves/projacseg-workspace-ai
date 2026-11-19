import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MappingForm } from "../setup/MappingForm";
import type { SetupApi } from "../setup/setup-api";

export function MappingSettings({ api }: { api: SetupApi }) {
  const client = useQueryClient();
  const mapping = useQuery({ queryKey: ["setup", "mapping"], queryFn: () => api.mapping() });
  const [saved, setSaved] = useState(false);

  if (mapping.isError) return <p role="alert">{mapping.error.message}</p>;
  if (!mapping.data) return <p>Lendo os campos do seu Bitrix24…</p>;
  return (
    <>
      {saved ? (
        <p role="status" className="mb-4 text-sm text-(--color-success)">
          Mapeamento salvo.
        </p>
      ) : null}
      <MappingForm
        key={mapping.dataUpdatedAt}
        view={mapping.data}
        submitLabel="Salvar mapeamento"
        onSubmit={async (input) => {
          setSaved(false);
          await api.saveMapping(input);
          setSaved(true);
          await client.invalidateQueries({ queryKey: ["setup", "mapping"] });
        }}
      />
    </>
  );
}
