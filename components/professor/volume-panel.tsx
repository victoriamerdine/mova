import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { weeklyVolume } from '@/lib/data/professor'
import { cn } from '@/lib/utils'

const max = Math.max(...weeklyVolume.map((row) => Math.max(row.series, row.target)))

export function VolumePanel() {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm">Volumen por patrón</CardTitle>
        <CardDescription className="text-xs">
          Series semanales acumuladas contra objetivo
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5 py-4">
        {weeklyVolume.map((row) => {
          const over = row.series > row.target

          return (
            <div key={row.group} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium">{row.group}</span>
                <span className="text-muted-foreground font-mono text-xs tnum">
                  <span className={cn(over ? 'text-warning-foreground' : 'text-foreground')}>
                    {row.series}
                  </span>
                  {' / '}
                  {row.target}
                </span>
              </div>
              <div className="bg-muted relative h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full',
                    over ? 'bg-warning' : 'bg-primary',
                  )}
                  style={{ width: `${(row.series / max) * 100}%` }}
                />
                <div
                  aria-hidden="true"
                  className="bg-foreground/35 absolute inset-y-0 w-0.5"
                  style={{ left: `${(row.target / max) * 100}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
