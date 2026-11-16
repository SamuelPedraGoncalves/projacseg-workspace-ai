import type { UserContext } from "@projacseg/shared";
import { cn } from "@projacseg/ui";
import { useState } from "react";

/**
 * Avatar com contorno em degradê. Mostra a foto do perfil do Bitrix24 (`PERSONAL_PHOTO`); sem foto,
 * ou se a imagem falhar ao carregar, mostra as iniciais.
 */
export function UserAvatar({ user }: { user: UserContext }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = Boolean(user.avatarUrl) && failedUrl !== user.avatarUrl;

  return (
    <div
      className={cn(
        "size-[110px] shrink-0 rounded-full bg-(image:--theme-gradient) p-1.5",
        "max-[900px]:size-[75px] max-[650px]:size-[58px] max-[650px]:p-1",
      )}
    >
      <div
        role="img"
        aria-label={`Foto de ${user.name}`}
        className="grid size-full place-items-center overflow-hidden rounded-full bg-white text-[32px] font-bold text-(--theme-base) max-[650px]:text-xl"
      >
        {showPhoto ? (
          <img
            src={user.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setFailedUrl(user.avatarUrl ?? null)}
            className="size-full object-cover"
          />
        ) : (
          <span aria-hidden="true">{user.initials}</span>
        )}
      </div>
    </div>
  );
}
