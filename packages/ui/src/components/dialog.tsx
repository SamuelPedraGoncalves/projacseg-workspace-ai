import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Diálogo acessível (Radix): foco preso, Esc fecha, foco volta ao gatilho, aria-labelledby e
 * aria-describedby automáticos. Visual reproduz os modais da referência.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export interface DialogContentProps extends Omit<
  ComponentProps<typeof DialogPrimitive.Content>,
  "title"
> {
  title: ReactNode;
  description?: ReactNode;
  closeLabel?: string;
}

export function DialogContent({
  title,
  description,
  closeLabel = "Fechar",
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[4px]" />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2",
          "overflow-y-auto rounded-3xl bg-white p-[30px] text-(--text-primary) shadow-[0_24px_80px_rgba(0,0,0,0.15)]",
          "focus:outline-none max-[650px]:p-[22px]",
          className,
        )}
        {...(description ? {} : { "aria-describedby": undefined })}
        {...props}
      >
        <div className="mb-[22px] flex items-start justify-between gap-[15px]">
          <div>
            <DialogPrimitive.Title className="text-2xl font-bold">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-[13px] text-(--text-secondary)">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className={cn(
              "grid size-[34px] shrink-0 cursor-pointer place-items-center rounded-full bg-[#f2f2f2] text-(--text-secondary)",
              "hover:brightness-[0.96] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-(--theme-tone-2)",
            )}
          >
            <X className="size-[18px]" aria-hidden="true" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
