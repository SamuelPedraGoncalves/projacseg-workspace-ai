import { Button } from "@projacseg/ui";
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePlatform } from "../../platform/platform-context";

type Status = "running" | "done" | "error";

/** Endereço público que o Bitrix24 chamará quando alguém escrever para o bot. */
function assistantEventsUrl(origin: string = window.location.origin): string {
  return `${origin}/bitrix24/events/assistant`;
}

/**
 * Página de instalação do aplicativo (caminho de instalação configurado no Bitrix24).
 * Registra o bot do assistente e conclui a instalação. Só funciona dentro do portal.
 */
export function InstallPage() {
  const { installer } = usePlatform();
  const [status, setStatus] = useState<Status>("running");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!installer || started.current) return;
    started.current = true;
    installer
      .registerAssistant(assistantEventsUrl())
      .then(() => {
        setStatus("done");
        installer.finish();
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : String(reason));
        setStatus("error");
      });
  }, [installer]);

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section
        aria-live="polite"
        className="w-full max-w-[520px] rounded-(--radius-large) bg-(--theme-surface) p-8 text-center"
      >
        <p className="text-[28px] font-extrabold tracking-[-1px]">PROJACSEG</p>
        <p className="mb-6 text-sm text-(--text-secondary)">Workspace AI — instalação</p>

        {!installer ? (
          <p className="text-sm">
            Esta página é usada pelo Bitrix24 durante a instalação do aplicativo e só funciona
            dentro do portal.
          </p>
        ) : status === "running" ? (
          <p className="flex items-center justify-center gap-2 text-sm">
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            Registrando o assistente no chat do Bitrix24…
          </p>
        ) : status === "done" ? (
          <p className="flex items-center justify-center gap-2 text-sm text-(--color-success)">
            <CircleCheck className="size-5" aria-hidden="true" />
            Instalação concluída.
          </p>
        ) : (
          <div className="text-sm">
            <p className="mb-2 flex items-center justify-center gap-2 text-(--color-danger)">
              <TriangleAlert className="size-5" aria-hidden="true" />
              Não foi possível registrar o assistente.
            </p>
            <p className="mb-5 text-xs break-words text-(--text-secondary)">{error}</p>
            <p className="mb-5">
              O Workspace funciona sem o assistente; ele pode ser registrado depois reinstalando o
              aplicativo. Confira se o escopo <strong>imbot</strong> está habilitado.
            </p>
            <Button onClick={() => installer.finish()}>Concluir sem o assistente</Button>
          </div>
        )}
      </section>
    </main>
  );
}
