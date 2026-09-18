import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/cn'

export const buttonVariants = cva(
  'inline-flex cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-b from-brand-400 to-brand-600 text-white shadow-brand-glow hover:from-brand-300 hover:to-brand-500 active:from-brand-500 active:to-brand-700',
        secondary:
          'bg-surface-elevated text-text-primary border border-border-strong hover:bg-surface-hover active:bg-surface',
        outline:
          'border border-brand-600 text-brand-300 hover:bg-brand-500/10 hover:border-brand-500 active:bg-brand-500/20',
        ghost: 'text-text-secondary hover:bg-surface-hover hover:text-text-primary active:bg-surface-elevated',
        danger: 'bg-danger text-white hover:bg-red-500 active:bg-red-700',
        link: 'text-brand-400 underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Icon icon="tabler:loader-2" className="size-4 animate-spin" />}
        {children}
      </Comp>
    )
  },
)
Button.displayName = 'Button'
