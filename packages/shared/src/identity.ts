import { z } from "zod";

/**
 * Identidade do colaborador dentro de uma empresa (tenant). No futuro vem da sessão OAuth do
 * Bitrix24 resolvida no backend — nunca de parâmetros enviados pelo navegador.
 */
export const userContextSchema = z.object({
  tenantId: z.string().min(1),
  bitrixUserId: z.string().min(1),
  name: z.string().min(1),
  initials: z.string().min(1).max(3),
  avatarUrl: z.url().optional(),
});

export type UserContext = z.infer<typeof userContextSchema>;

export const themePreferenceSchema = z.object({
  tenantId: z.string().min(1),
  bitrixUserId: z.string().min(1),
  baseColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Informe uma cor HEX, como #0649A8."),
  updatedAt: z.iso.datetime(),
});

export type ThemePreference = z.infer<typeof themePreferenceSchema>;
