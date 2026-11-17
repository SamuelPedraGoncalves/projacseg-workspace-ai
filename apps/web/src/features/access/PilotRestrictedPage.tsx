/**
 * Mostrada dentro do Bitrix24 a quem está fora do modo piloto. O backend não emite sessão para essa
 * pessoa: não há dados a exibir, nem demonstrativos.
 */
export function PilotRestrictedPage() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section
        aria-labelledby="pilot-title"
        className="w-full max-w-[520px] rounded-(--radius-large) bg-(--theme-surface) p-8 text-center"
      >
        <p className="text-[28px] font-extrabold tracking-[-1px]">PROJACSEG</p>
        <p className="mb-6 text-sm text-(--text-secondary)">Workspace AI</p>
        <h1 id="pilot-title" className="mb-2 text-lg font-semibold">
          Em fase de testes
        </h1>
        <p className="text-sm">
          O Workspace está sendo testado com um grupo restrito e ainda não está disponível para
          você. Nada muda no seu Bitrix24 por enquanto.
        </p>
      </section>
    </main>
  );
}
