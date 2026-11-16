import type { UserContext } from "@projacseg/shared";
import { getGreeting } from "./greeting";
import { UserAvatar } from "./UserAvatar";

interface PageHeaderProps {
  pageTitle: string;
  user: UserContext;
  now?: Date;
}

export function PageHeader({ pageTitle, user, now = new Date() }: PageHeaderProps) {
  return (
    <header className="mb-[25px] flex items-start justify-between gap-5">
      <div>
        <nav aria-label="Você está em" className="mb-1.5 text-sm text-(--text-secondary)">
          Workspace / <span aria-current="page">{pageTitle}</span>
        </nav>
        <h1 className="text-[clamp(32px,3.5vw,58px)] leading-[1.2] font-extrabold tracking-[-1.5px] max-[650px]:text-[32px]">
          {getGreeting(now.getHours())}, {user.name}!
        </h1>
        <p className="mt-3.5 text-[clamp(13px,1vw,17px)] text-(--text-secondary) max-[650px]:text-xs">
          Seu trabalho organizado. Seus negócios acompanhados.
        </p>
      </div>
      <UserAvatar user={user} />
    </header>
  );
}
