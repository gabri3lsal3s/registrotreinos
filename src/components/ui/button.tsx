import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-bold transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 uppercase tracking-wider active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90",
        outline: "border border-border/60 bg-background hover:bg-muted text-foreground",
        secondary: "bg-muted text-foreground hover:bg-muted/80",
        ghost: "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 text-xs",
        xs: "h-7 px-2.5 text-[10px] rounded-lg",
        sm: "h-9 px-3 text-xs rounded-xl",
        lg: "h-13 px-7 text-sm rounded-2xl",
        icon: "h-11 w-11 p-0",
        "icon-xs": "h-7 w-7 p-0 rounded-lg",
        "icon-sm": "h-9 w-9 p-0 rounded-xl",
        "icon-lg": "h-13 w-13 p-0 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
