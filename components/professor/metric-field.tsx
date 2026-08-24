'use client'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'

type MetricFieldProps = {
  label: string
  value: number
  unit?: string
  onChange: (value: number) => void
  min?: number
  max?: number
}

export function MetricField({ label, value, unit, onChange, min = 0, max }: MetricFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
        {label}
      </span>
      <InputGroup>
        <InputGroupInput
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={Number.isNaN(value) ? '' : value}
          onChange={(e) => onChange(e.target.valueAsNumber)}
          className="tnum text-right font-mono"
        />
        {unit ? (
          <InputGroupAddon align="inline-end">
            <InputGroupText>{unit}</InputGroupText>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </label>
  )
}
