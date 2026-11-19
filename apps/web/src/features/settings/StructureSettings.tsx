import type { DepartmentNode } from "@projacseg/shared";
import { Button } from "@projacseg/ui";
import { useQuery } from "@tanstack/react-query";
import { usePlatform } from "../../platform/platform-context";
import type { SetupApi } from "../setup/setup-api";

function Department({ node, level }: { node: DepartmentNode; level: number }) {
  return (
    <li
      role="treeitem"
      aria-level={level}
      aria-expanded={node.children.length > 0 ? true : undefined}
    >
      <div className="rounded-xl border border-[#e3e3e3] bg-white px-4 py-3">
        <p className="font-semibold">{node.name}</p>
        <p className="text-sm text-(--text-secondary)">
          {node.head ? `Chefe: ${node.head.name}` : "Sem chefe definido"}
        </p>
      </div>
      {node.children.length > 0 ? (
        <ul role="group" className="mt-2 ml-6 grid gap-2 border-l-2 border-[#e3e3e3] pl-4">
          {node.children.map((child) => (
            <Department key={child.id} node={child} level={level + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * Estrutura da empresa lida do Bitrix24. É ela que define quem é o supervisor de cada comercial.
 * A estrutura é atualizada no próprio Bitrix24; o WorkSeg só lê.
 */
export function StructureSettings({ api }: { api: SetupApi }) {
  const { openCompanyStructure } = usePlatform();
  const structure = useQuery({ queryKey: ["setup", "structure"], queryFn: () => api.structure() });

  return (
    <div className="grid gap-5">
      <p className="text-sm">
        O supervisor de cada comercial é o chefe do departamento dele. Para mudar a estrutura, use a
        estrutura da empresa no Bitrix24; o WorkSeg lê de lá.
      </p>
      <div>
        <Button size="md" disabled={!openCompanyStructure} onClick={() => openCompanyStructure?.()}>
          Atualizar estrutura da empresa
        </Button>
      </div>
      {structure.isError ? (
        <p role="alert" className="text-sm text-(--color-danger)">
          {structure.error.message}
        </p>
      ) : !structure.data ? (
        <p>Lendo a estrutura do Bitrix24…</p>
      ) : structure.data.departments.length === 0 ? (
        <p>Nenhum departamento cadastrado no Bitrix24.</p>
      ) : (
        <ul role="tree" aria-label="Estrutura da empresa" className="grid gap-2">
          {structure.data.departments.map((node) => (
            <Department key={node.id} node={node} level={1} />
          ))}
        </ul>
      )}
    </div>
  );
}
