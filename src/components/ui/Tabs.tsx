import type { ComponentPropsWithoutRef } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/cn'

export function Tabs({ className, ...props }: ComponentPropsWithoutRef<typeof TabsPrimitive.Root>) {
  // min-w-0 evita que a lista de abas force overflow horizontal quando usada
  // como item de um flex row (ex: cabeçalhos de página em telas pequenas).
  return <TabsPrimitive.Root className={cn('min-w-0', className)} {...props} />
}

export function TabsList({ className, ...props }: ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'flex w-max max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({ className, ...props }: ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'shrink-0 cursor-pointer whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium text-text-secondary transition-colors data-[state=active]:bg-brand-500/15 data-[state=active]:text-brand-300 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({ className, ...props }: ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('animate-fade-in focus-visible:outline-none', className)} {...props} />
}
