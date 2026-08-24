'use client'

import { ChevronDown, Search } from 'lucide-react'

import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { CATEGORIES, MUSCLES } from '@/lib/data/library'

const CATEGORY_OPTIONS = ['Todas', ...CATEGORIES]
const MUSCLE_OPTIONS = ['Todos', ...MUSCLES]

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border-input hover:border-ring/50 focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full appearance-none rounded-lg border bg-transparent pr-8 pl-2.5 text-sm text-foreground outline-none transition-colors focus-visible:ring-3 dark:bg-input/30"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2" />
      </div>
    </label>
  )
}

export function FilterBar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  muscle,
  onMuscleChange,
}: {
  query: string
  onQueryChange: (value: string) => void
  category: string
  onCategoryChange: (value: string) => void
  muscle: string
  onMuscleChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
      <label className="flex min-w-0 flex-[1.4] flex-col gap-1">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          Buscar
        </span>
        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Nombre del ejercicio…"
            aria-label="Buscar ejercicio"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </InputGroup>
      </label>

      <FilterSelect
        label="Categoría"
        value={category}
        onChange={onCategoryChange}
        options={CATEGORY_OPTIONS}
      />
      <FilterSelect
        label="Músculo principal"
        value={muscle}
        onChange={onMuscleChange}
        options={MUSCLE_OPTIONS}
      />
    </div>
  )
}
