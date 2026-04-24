import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 uppercase tracking-wide text-sm',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-primary/60 shadow-lg hover:shadow-xl hover:shadow-primary/20',
        outline: 'border-2 border-border bg-background hover:bg-secondary/50 hover:border-accent/40',
        ghost: 'hover:bg-secondary/40 border border-transparent hover:border-accent/20',
        accent: 'bg-accent text-accent-foreground hover:bg-accent/90 border-2 border-accent/60 shadow-lg hover:shadow-xl hover:shadow-amber-500/30 font-bold',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 border-2 border-destructive/60 shadow-lg hover:shadow-xl hover:shadow-red-500/20',
        tactical: 'bg-charcoal-900 text-white border-2 border-charcoal-700 shadow-inset hover:border-amber-500/50 hover:bg-charcoal-800 hover:shadow-lg hover:shadow-amber-500/20'
      },
      size: { default: 'h-9 px-4 py-2', sm: 'h-8 px-3', lg: 'h-10 px-6', icon: 'h-9 w-9', box: 'h-24 w-24 flex-col' }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
);
Button.displayName = 'Button';
export { buttonVariants };
