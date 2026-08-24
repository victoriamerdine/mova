import { ChevronRight, ListFilter, Plus } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { statusMeta, students } from '@/lib/data/professor'
import { cn } from '@/lib/utils'

export function StudentsTable() {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="items-center border-b px-5 py-4">
        <CardTitle className="text-sm">Mis alumnos</CardTitle>
        <CardDescription className="text-xs">
          24 alumnos activos · ordenados por próxima sesión
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <ListFilter data-icon="inline-start" />
            Filtrar
          </Button>
          <Button size="sm">
            <Plus data-icon="inline-start" />
            Nuevo alumno
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="px-0 py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Nombre</TableHead>
              <TableHead>Objetivo</TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead>Próximo entrenamiento</TableHead>
              <TableHead className="text-right">Adherencia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-10 pr-5">
                <span className="sr-only">Abrir</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => {
              const status = statusMeta[student.status]

              return (
                <TableRow key={student.id} className="group">
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8 rounded-md">
                        <AvatarFallback className="bg-secondary text-secondary-foreground rounded-md text-[11px] font-semibold">
                          {student.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{student.name}</p>
                        <p className="text-muted-foreground max-w-52 truncate text-xs">
                          {student.plan}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="secondary">{student.goal}</Badge>
                  </TableCell>

                  <TableCell>
                    <span className="text-muted-foreground text-xs">{student.level}</span>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm">
                        <span
                          className={cn(
                            'font-medium',
                            student.nextSession.label === 'Atrasado' && 'text-destructive',
                          )}
                        >
                          {student.nextSession.label}
                        </span>
                        <span className="text-muted-foreground font-mono text-xs tnum">
                          {' · '}
                          {student.nextSession.day}
                        </span>
                      </span>
                      <span className="text-muted-foreground max-w-48 truncate text-xs">
                        {student.nextSession.focus}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <span className="font-mono text-sm tnum">{student.adherence}%</span>
                  </TableCell>

                  <TableCell>
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={cn('size-2 shrink-0 rounded-full', status.dot)}
                      />
                      <span className={cn('text-xs', status.text)}>{status.label}</span>
                    </span>
                  </TableCell>

                  <TableCell className="pr-5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Abrir ficha de ${student.name}`}
                      className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <ChevronRight />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
