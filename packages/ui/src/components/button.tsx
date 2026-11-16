import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

/**
 * Botão base. As variantes usam apenas tokens CSS do tema (`--theme-*`) ou neutros fixos, para que
 * a troca de tema seja automática.
 */
export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 font-[inherit] cursor-pointer",
    "transition-[filter,background-color] duration-200 hover:brightness-[0.96]",
    "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-(--theme-tone-2)",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        gradient: "bg-(image:--theme-gradient) text-(--theme-on-gradient)",
        secondary: "bg-[#f0f0f0] text-(--text-primary)",
        white: "bg-white text-(--text-secondary)",
        ghost: "bg-transparent text-inherit",
      },
      size: {
        sm: "rounded-[10px] px-[18px] py-3 text-[13px]",
        md: "rounded-[11px] px-6 py-[17px] text-[clamp(13px,1.2vw,20px)]",
        icon: "size-[34px] rounded-full text-xl",
      },
    },
    defaultVariants: {
      variant: "gradient",
      size: "sm",
    },
  },
);

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
