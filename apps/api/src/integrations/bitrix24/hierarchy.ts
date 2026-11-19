import type { TenantRecord } from "../../store/types";
import type { Bitrix24Portal } from "./portal";

export interface Department {
  ID: string;
  NAME?: string;
  PARENT?: string;
  UF_HEAD?: string;
}

const TTL_MS = 30 * 60_000;

/**
 * Superiores de um colaborador pela estrutura de departamentos do Bitrix24.
 * Nível 1 = chefe do departamento do colaborador (ou do departamento acima, se ele mesmo for o
 * chefe); cada nível seguinte sobe um departamento.
 */
export class HierarchyResolver {
  private readonly cache = new Map<string, { at: number; departments: Map<string, Department> }>();
  private readonly userDepartments = new Map<string, string[]>();

  constructor(private readonly portal: Bitrix24Portal) {}

  /** Departamentos do portal (cache de 30 min). Também usado pela tela de estrutura. */
  async departments(tenant: TenantRecord): Promise<Map<string, Department>> {
    const cached = this.cache.get(tenant.id);
    if (cached && Date.now() - cached.at < TTL_MS) return cached.departments;
    const list = await this.portal.callAll<Department>(tenant, "department.get", {});
    const departments = new Map(list.map((item) => [String(item.ID), item]));
    this.cache.set(tenant.id, { at: Date.now(), departments });
    return departments;
  }

  private async departmentsOf(tenant: TenantRecord, userId: string): Promise<string[]> {
    const key = `${tenant.id}:${userId}`;
    const cached = this.userDepartments.get(key);
    if (cached) return cached;
    const response = await this.portal.call<{ UF_DEPARTMENT?: (string | number)[] }[]>(
      tenant,
      "user.get",
      { ID: userId },
    );
    const ids = (response.result[0]?.UF_DEPARTMENT ?? []).map(String);
    this.userDepartments.set(key, ids);
    return ids;
  }

  /** Cadeia de superiores (sem repetições), do imediato para cima. */
  async superiors(tenant: TenantRecord, userId: string, maxLevels: number): Promise<string[]> {
    const departments = await this.departments(tenant);
    const chain: string[] = [];
    let departmentId = (await this.departmentsOf(tenant, userId))[0];
    let current = userId;

    for (let guard = 0; guard < 20 && departmentId && chain.length < maxLevels; guard += 1) {
      const department = departments.get(departmentId);
      if (!department) break;
      const head = department.UF_HEAD ? String(department.UF_HEAD) : undefined;
      if (head && head !== "0" && head !== current && head !== userId && !chain.includes(head)) {
        chain.push(head);
        current = head;
      }
      departmentId = department.PARENT ? String(department.PARENT) : undefined;
    }
    return chain;
  }

  invalidate(tenantId: string): void {
    this.cache.delete(tenantId);
    for (const key of this.userDepartments.keys()) {
      if (key.startsWith(`${tenantId}:`)) this.userDepartments.delete(key);
    }
  }
}
