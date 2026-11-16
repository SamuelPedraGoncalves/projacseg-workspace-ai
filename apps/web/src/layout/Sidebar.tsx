import { cn } from "@projacseg/ui";
import {
  BriefcaseBusiness,
  CircleCheck,
  CircleChevronRight,
  Clock,
  Hourglass,
  Menu,
  Palette,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { useId, useState, type ComponentProps } from "react";
import { NavLink } from "react-router";
import { useUiStore } from "../app/ui-store";
import { VIEWS } from "../features/journey/views";

const NAV_ITEMS: { path: string; label: string; icon: LucideIcon }[] = [
  { path: VIEWS.today.path, label: VIEWS.today.pageTitle, icon: CircleChevronRight },
  { path: VIEWS.all.path, label: VIEWS.all.pageTitle, icon: BriefcaseBusiness },
  { path: VIEWS.risk.path, label: VIEWS.risk.pageTitle, icon: Clock },
  { path: VIEWS.waiting.path, label: VIEWS.waiting.pageTitle, icon: Hourglass },
];

const itemClass = cn(
  "flex w-full cursor-pointer items-center gap-2.5 rounded-[14px] bg-transparent px-[15px] py-[17px] text-left",
  "text-[clamp(14px,1.25vw,20px)] whitespace-nowrap text-inherit transition-colors duration-200",
  "hover:bg-white/20 aria-[current=page]:bg-white/20",
  "max-[900px]:px-2.5 max-[900px]:py-[13px] max-[900px]:text-xs",
);

function SidebarButton({
  icon: Icon,
  children,
  ...props
}: ComponentProps<"button"> & { icon: LucideIcon }) {
  return (
    <button type="button" className={itemClass} {...props}>
      <Icon className="size-[18px]" aria-hidden="true" />
      {children}
    </button>
  );
}

export function Sidebar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const setAssistantOpen = useUiStore((state) => state.setAssistantOpen);
  const setThemeOpen = useUiStore((state) => state.setThemeOpen);
  const closeMenu = () => setMenuOpen(false);

  return (
    <aside
      data-surface="gradient"
      className={cn(
        "sticky top-2.5 flex h-[calc(100vh-20px)] w-[21%] min-w-[250px] shrink-0 flex-col overflow-y-auto",
        "[scrollbar-color:rgb(255_255_255/0.35)_transparent] [scrollbar-width:thin]",
        "rounded-(--radius-large) bg-(image:--theme-gradient) px-[30px] pt-[58px] pb-8 text-(--theme-on-gradient)",
        "max-[1200px]:min-w-[215px] max-[1200px]:px-4 max-[1200px]:pt-10 max-[1200px]:pb-[22px]",
        "max-[900px]:min-w-[180px] max-[900px]:px-2.5 max-[900px]:pt-[30px] max-[900px]:pb-[18px]",
        "max-[650px]:relative max-[650px]:top-0 max-[650px]:h-auto max-[650px]:w-full max-[650px]:min-w-0 max-[650px]:p-5",
      )}
    >
      <div className="mb-11 flex items-center justify-between gap-3 pl-4 max-[900px]:pl-2 max-[650px]:mb-0">
        <div>
          <p className="text-[clamp(24px,2.4vw,40px)] leading-[1.2] font-extrabold tracking-[-1px] max-[900px]:text-[21px]">
            PROJACSEG
          </p>
          <p className="mt-1 text-sm opacity-90">Workspace AI</p>
        </div>
        <button
          type="button"
          className="hidden size-11 cursor-pointer place-items-center rounded-xl bg-white/20 max-[650px]:grid"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>

      <div
        id={menuId}
        className={cn(
          "flex flex-1 flex-col",
          !menuOpen && "max-[650px]:hidden",
          "max-[650px]:mt-4",
        )}
      >
        <nav aria-label="Menu principal">
          <ul className="flex flex-col gap-1 max-[650px]:grid max-[650px]:grid-cols-2">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <li key={path}>
                <NavLink to={path} end className={itemClass} onClick={closeMenu}>
                  <Icon className="size-[18px]" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
            <li>
              <SidebarButton
                icon={Sparkles}
                aria-haspopup="dialog"
                onClick={() => {
                  closeMenu();
                  setAssistantOpen(true);
                }}
              >
                Assistente IA
              </SidebarButton>
            </li>
            <li>
              <NavLink to={VIEWS.resolved.path} end className={itemClass} onClick={closeMenu}>
                <CircleCheck className="size-[18px]" aria-hidden="true" />
                {VIEWS.resolved.pageTitle}
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="mt-auto max-[650px]:mt-2">
          <SidebarButton
            icon={Palette}
            aria-haspopup="dialog"
            onClick={() => {
              closeMenu();
              setThemeOpen(true);
            }}
          >
            Temas
          </SidebarButton>
        </div>
      </div>
    </aside>
  );
}
