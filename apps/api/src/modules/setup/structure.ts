import type { DepartmentNode } from "@projacseg/shared";

/** Departamento como vem de `department.get`. */
export interface RawDepartment {
  ID: string;
  NAME?: string;
  PARENT?: string;
  UF_HEAD?: string;
}

const byName = (a: DepartmentNode, b: DepartmentNode) => a.name.localeCompare(b.name, "pt-BR");

/**
 * Árvore da estrutura da empresa. Raiz: departamento sem pai ou com pai inexistente. Chefe "0" ou
 * vazio = sem chefe. Pura: os nomes dos chefes vêm prontos em `names`.
 */
export function buildTree(
  departments: RawDepartment[],
  names: Map<string, string>,
): DepartmentNode[] {
  const nodes = new Map<string, DepartmentNode>();
  for (const department of departments) {
    const id = String(department.ID);
    const head = department.UF_HEAD ? String(department.UF_HEAD) : "";
    nodes.set(id, {
      id,
      name: department.NAME?.trim() || `Departamento ${id}`,
      head: head && head !== "0" ? { id: head, name: names.get(head) ?? `Usuário ${head}` } : null,
      children: [],
    });
  }
  const roots: DepartmentNode[] = [];
  for (const department of departments) {
    const node = nodes.get(String(department.ID))!;
    const parent = department.PARENT ? nodes.get(String(department.PARENT)) : undefined;
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (list: DepartmentNode[]) => {
    list.sort(byName);
    for (const node of list) sort(node.children);
  };
  sort(roots);
  return roots;
}

/** Chefes citados na estrutura (para buscar os nomes). */
export function headIds(departments: RawDepartment[]): string[] {
  return [
    ...new Set(
      departments
        .map((department) => (department.UF_HEAD ? String(department.UF_HEAD) : ""))
        .filter((id) => id && id !== "0"),
    ),
  ];
}
