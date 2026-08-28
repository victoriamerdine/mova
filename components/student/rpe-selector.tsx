'use client'

import { cn } from '@/lib/utils'

const RPE_VALUES = Array.from({ length: 10 }, (_, i) => i + 1)

export function RpeSelector({
  value,
  onChange,
}: {
  value: number | null
  onChange: (value: number) => void
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="RPE">
      {RPE_VALUES.map((n) => {
        const selected = value === n
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(n)}
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums transition-colors',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-background text-foreground hover:border-ring/50 hover:bg-muted',
            )}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}
