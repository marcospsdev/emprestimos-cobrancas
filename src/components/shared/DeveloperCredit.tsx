import { cn } from '@/lib/cn'

export function DeveloperCredit({ className }: { className?: string }) {
  return (
    <p className={cn('text-xs whitespace-nowrap text-text-muted', className)}>
      Dev{' '}
      <a
        href="https://www.instagram.com/_marcosps"
        target="_blank"
        rel="noopener noreferrer"
        className="cursor-pointer font-medium text-text-secondary transition-colors hover:text-brand-400"
      >
        MarcosPS
      </a>
    </p>
  )
}
