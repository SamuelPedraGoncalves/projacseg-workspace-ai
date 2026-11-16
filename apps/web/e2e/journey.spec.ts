import { expect, test } from "@playwright/test";

const rootVar = (name: string) =>
  `getComputedStyle(document.documentElement).getPropertyValue("${name}").trim()`;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test("filtros, detalhes e assistente funcionam", async ({ page, isMobile }) => {
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Lucas!");

  await page.getByRole("button", { name: "Em risco", exact: true }).click();
  await expect(page).toHaveURL(/\/em-risco$/);
  await expect(page.getByRole("list", { name: "Negócios" }).getByRole("listitem")).toHaveCount(3);

  await page.getByRole("button", { name: "Abrir negócio de Roberto Lima" }).click();
  await expect(page.getByRole("dialog", { name: "Roberto Lima" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.getByRole("button", { name: "Conversar com assistente" }).click();
  const chat = page.getByRole("dialog", { name: "Assistente Projacseg" });
  await chat.getByLabel("Mensagem ao assistente").fill("quem está aguardando?");
  await chat.getByRole("button", { name: "Enviar" }).click();
  await expect(chat.getByText(/Clínica Oliveira/)).toBeVisible();
  await page.keyboard.press("Escape");

  if (isMobile) {
    const toggle = page.getByRole("button", { name: "Abrir menu" });
    await expect(page.getByRole("navigation", { name: "Menu principal" })).toBeHidden();
    await toggle.click();
    await expect(page.getByRole("navigation", { name: "Menu principal" })).toBeVisible();
  }
});

test("tema persiste após recarregar e pode ser restaurado", async ({ page, isMobile }) => {
  if (isMobile) await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("button", { name: "Temas" }).click();
  const dialog = page.getByRole("dialog", { name: "Personalizar tema" });
  await dialog.getByRole("button", { name: "Roxo" }).click();
  expect(await page.evaluate(rootVar("--theme-base"))).toBe("#6534ae");

  await page.reload();
  expect(await page.evaluate(rootVar("--theme-base"))).toBe("#6534ae");

  if (isMobile) await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("button", { name: "Temas" }).click();
  await page.getByRole("button", { name: "Restaurar padrão" }).click();
  expect(await page.evaluate(rootVar("--theme-base"))).toBe("#0649a8");

  await page.reload();
  expect(await page.evaluate(rootVar("--theme-base"))).toBe("#0649a8");
});

test("não há rolagem horizontal", async ({ page }) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
