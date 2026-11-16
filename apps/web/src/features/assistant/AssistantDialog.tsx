import { Button, DialogContent, cn } from "@projacseg/ui";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { getDemoReply, getDemoWelcome } from "./demo-responses";

interface ChatMessage {
  id: number;
  role: "assistant" | "user";
  text: string;
}

let nextId = 1;
const message = (role: ChatMessage["role"], text: string): ChatMessage => ({
  id: nextId++,
  role,
  text,
});

/** Chat demonstrativo. Respostas predefinidas, sempre rotuladas como tal. */
export function AssistantDialogContent({ userName }: { userName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    message("assistant", getDemoWelcome(userName)),
  ]);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const noticeId = useId();

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [
      ...current,
      message("user", text),
      message("assistant", getDemoReply(text)),
    ]);
    setDraft("");
  };

  return (
    <DialogContent title="Assistente Projacseg" description="Seu parceiro de produtividade.">
      <ol
        ref={listRef}
        aria-label="Conversa"
        aria-live="polite"
        className="mb-[18px] flex max-h-[340px] min-h-[220px] flex-col gap-3 overflow-y-auto"
      >
        {messages.map((item) => (
          <li
            key={item.id}
            className={cn(
              "max-w-[90%] rounded-[14px] p-3.5 text-[13px] leading-[1.6]",
              item.role === "assistant"
                ? "self-start bg-(--theme-surface)"
                : "self-end bg-(image:--theme-gradient) text-(--theme-on-gradient)",
            )}
          >
            <span className="sr-only">
              {item.role === "assistant" ? "Demonstração: " : "Você: "}
            </span>
            {item.role === "assistant" ? (
              <span
                aria-hidden="true"
                className="mb-1 block text-[10px] font-semibold tracking-wide text-(--text-muted) uppercase"
              >
                Resposta demonstrativa
              </span>
            ) : null}
            {item.text}
          </li>
        ))}
      </ol>

      <form className="flex gap-2" onSubmit={send}>
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Como posso ajudar?"
          aria-label="Mensagem ao assistente"
          aria-describedby={noticeId}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-[10px] border border-(--border-color) p-3"
        />
        <Button type="submit" disabled={!draft.trim()}>
          Enviar
        </Button>
      </form>

      <p id={noticeId} className="mt-3 text-[11px] text-(--text-muted)">
        Respostas demonstrativas predefinidas. Nenhuma IA conectada nesta versão.
      </p>
    </DialogContent>
  );
}
