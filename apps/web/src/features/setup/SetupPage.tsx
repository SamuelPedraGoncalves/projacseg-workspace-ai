import type { PortalUserRef } from "@projacseg/shared";
import { Button } from "@projacseg/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Navigate } from "react-router";
import { usePlatform } from "../../platform/platform-context";
import { MappingForm } from "./MappingForm";
import { SETUP_STATUS_KEY, useSetupApi, useSetupStatus, type SetupApi } from "./setup-api";

/** Cartão do primeiro acesso, no visual da tela de boas-vindas (gradiente do tema). */
function SetupCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center p-6 max-[650px]:p-3">
      <section
        aria-labelledby="setup-title"
        data-surface="gradient"
        className="w-full max-w-[1000px] rounded-(--radius-large) bg-(image:--theme-gradient) px-[clamp(20px,6vw,90px)] py-[clamp(28px,5vw,60px)] text-(--theme-on-gradient) shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
      >
        <h1
          id="setup-title"
          className="mb-6 text-center text-[clamp(26px,3vw,40px)] font-extrabold tracking-[-1px]"
        >
          {title}
        </h1>
        {children}
      </section>
    </main>
  );
}

/** Área branca dentro do cartão, para textos longos e formulários. */
function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="max-h-[60vh] overflow-y-auto rounded-2xl bg-white p-6 text-left text-(--text-primary)">
      {children}
    </div>
  );
}

function useAdvance() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: SETUP_STATUS_KEY });
}

function TermsStep({ api }: { api: SetupApi }) {
  const advance = useAdvance();
  const terms = useQuery({ queryKey: ["setup", "terms"], queryFn: () => api.terms() });
  const accept = useMutation({
    mutationFn: (version: string) => api.acceptTerms(version),
    onSuccess: advance,
  });

  if (!terms.data) return <SetupCard title="Termos de uso">Carregando os termos…</SetupCard>;
  return (
    <SetupCard title={terms.data.title}>
      {terms.data.provisional ? (
        <p className="mb-4 text-center">
          <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
            Versão provisória
          </span>
        </p>
      ) : null}
      <Panel>
        {terms.data.body.split("\n\n").map((paragraph) => (
          <p key={paragraph} className="mb-3 text-sm leading-relaxed last:mb-0">
            {paragraph}
          </p>
        ))}
      </Panel>
      {accept.isError ? (
        <p role="alert" className="mt-4 text-center text-sm">
          {accept.error.message}
        </p>
      ) : null}
      <div className="mt-6 flex justify-center">
        <Button
          variant="white"
          size="md"
          disabled={accept.isPending}
          onClick={() => accept.mutate(terms.data.version)}
        >
          Li e aceito
        </Button>
      </div>
    </SetupCard>
  );
}

function EditorsStep({ api }: { api: SetupApi }) {
  const { pickUsers } = usePlatform();
  const advance = useAdvance();
  const [editors, setEditors] = useState<PortalUserRef[]>([]);
  const save = useMutation({
    mutationFn: () => api.saveEditors(editors),
    onSuccess: advance,
  });

  async function choose() {
    if (!pickUsers) return;
    const picked = await pickUsers();
    setEditors((current) => {
      const known = new Set(current.map((user) => user.id));
      return [...current, ...picked.filter((user) => !known.has(user.id))];
    });
  }

  return (
    <SetupCard title="Bem-vindo ao WorkSeg AI">
      <p className="mx-auto mb-8 max-w-[780px] text-center text-[15px] leading-relaxed">
        Para começar a usar o WorkSeg AI, defina quem pode criar as regras. Se só você vai criar,
        clique em continuar. Se outras pessoas também vão criar, atualizar e excluir regras, escolha
        essas pessoas no campo abaixo.
      </p>
      {editors.length > 0 ? (
        <ul
          aria-label="Quem pode criar regras"
          className="mx-auto mb-6 flex max-w-[780px] flex-wrap justify-center gap-2"
        >
          {editors.map((editor) => (
            <li
              key={editor.id}
              className="flex items-center gap-2 rounded-full bg-white/20 py-1 pr-1 pl-3 text-sm"
            >
              {editor.name}
              <button
                type="button"
                aria-label={`Remover ${editor.name}`}
                className="grid size-6 cursor-pointer place-items-center rounded-full hover:bg-white/20"
                onClick={() =>
                  setEditors((current) => current.filter((item) => item.id !== editor.id))
                }
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {save.isError ? (
        <p role="alert" className="mb-4 text-center text-sm">
          {save.error.message}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-6">
        <Button variant="white" size="md" disabled={!pickUsers} onClick={() => void choose()}>
          Definir usuários que podem criar regras
        </Button>
        <Button
          size="md"
          className="bg-(image:none) bg-[#00c060] text-white"
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          Continuar
        </Button>
      </div>
    </SetupCard>
  );
}

function MappingStep({ api }: { api: SetupApi }) {
  const advance = useAdvance();
  const mapping = useQuery({ queryKey: ["setup", "mapping"], queryFn: () => api.mapping() });

  return (
    <SetupCard title="Mapeamento dos campos">
      <p className="mx-auto mb-6 max-w-[780px] text-center text-[15px] leading-relaxed">
        Diga ao WorkSeg onde o seu Bitrix24 guarda o tipo do seguro, o ramo e as outras informações
        usadas nas regras. Confira as sugestões antes de salvar.
      </p>
      <Panel>
        {mapping.data ? (
          <MappingForm
            view={mapping.data}
            submitLabel="Salvar e começar"
            onSubmit={async (input) => {
              await api.saveMapping(input);
              await advance();
            }}
          />
        ) : mapping.isError ? (
          <p role="alert">{mapping.error.message}</p>
        ) : (
          <p>Lendo os campos do seu Bitrix24…</p>
        )}
      </Panel>
    </SetupCard>
  );
}

function WaitingAdmin({ api, canClaim }: { api: SetupApi; canClaim: boolean }) {
  const advance = useAdvance();
  const claim = useMutation({ mutationFn: () => api.claimAdmin(), onSuccess: advance });
  return (
    <SetupCard title="WorkSeg AI">
      <p className="text-center text-[15px]">
        O administrador ainda está configurando o WorkSeg AI. Volte em breve.
      </p>
      {canClaim ? (
        <div className="mt-8 text-center">
          <p className="mx-auto mb-4 max-w-[640px] text-sm">
            Você é administrador do Bitrix24. Se quem instalou o WorkSeg não está mais disponível,
            você pode assumir a administração.
          </p>
          {claim.isError ? (
            <p role="alert" className="mb-3 text-sm">
              {claim.error.message}
            </p>
          ) : null}
          <Button
            variant="white"
            size="md"
            disabled={claim.isPending}
            onClick={() => claim.mutate()}
          >
            Assumir a administração
          </Button>
        </div>
      ) : null}
    </SetupCard>
  );
}

/** Primeiro acesso: termos → quem cria regras → mapeamento. Cada passo vem do servidor. */
export function SetupPage() {
  const api = useSetupApi();
  const status = useSetupStatus();

  if (!api) return <Navigate to="/" replace />;
  if (status.isError) {
    return (
      <SetupCard title="WorkSeg AI">
        <p role="alert" className="text-center">
          {status.error.message}
        </p>
      </SetupCard>
    );
  }
  if (!status.data) {
    return (
      <SetupCard title="WorkSeg AI">
        <p className="flex items-center justify-center gap-2">
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          Carregando…
        </p>
      </SetupCard>
    );
  }
  switch (status.data.step) {
    case "terms":
      return <TermsStep api={api} />;
    case "editors":
      return <EditorsStep api={api} />;
    case "mapping":
      return <MappingStep api={api} />;
    case "waiting_admin":
      return <WaitingAdmin api={api} canClaim={status.data.canClaimAdmin} />;
    case "done":
      return <Navigate to="/" replace />;
  }
}
