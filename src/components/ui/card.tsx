import * as React from 'react';
import { cn } from '@/lib/utils';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-md border-2 border-border bg-card text-card-foreground shadow-md card-tactical', className)} {...props} />
  )
);
Card.displayName = 'Card';

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 p-4 border-b-2 border-border bg-gradient-to-r from-transparent via-amber-500/5 to-transparent', className)} {...props} />
);
export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <h3 className={cn('text-base heading font-bold uppercase tracking-wider pb-2', className)} {...props} />
);
export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-4', className)} {...props} />
);
