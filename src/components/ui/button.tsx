import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.985] select-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-fg hover:opacity-90 shadow-xs [&_svg]:size-4",
        secondary:
          "bg-bg-elevated text-fg border border-border hover:bg-bg-inset hover:border-border-strong [&_svg]:size-4",
        ghost:
          "text-fg-muted hover:text-fg hover:bg-bg-inset [&_svg]:size-4",
        outline:
          "border border-border text-fg hover:bg-bg-inset hover:border-border-strong [&_svg]:size-4",
        danger:
          "bg-danger text-danger-fg hover:opacity-90 [&_svg]:size-4",
        success:
          "bg-success text-success-fg hover:opacity-90 [&_svg]:size-4",
      },
      size: {
        sm: "h-8 px-3 text-[13px] rounded-[8px]",
        md: "h-9 px-4",
        lg: "h-11 px-6 text-[15px] rounded-lg",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8 rounded-[8px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
