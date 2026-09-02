import Link from 'next/link'
import { ChevronRight, UserPlus } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { MyStudent } from '@/lib/supabase/queries/professor-dashboard'

const STATUS_META: Record<MyStudent['status'], { label: string; dot: string }> = {
  active: { label: 'Activo', dot: 'bg-primary' },
  invited: { label: 'Invitado', dot: 'bg-warning' },
  ended: { label: 'Finalizado', dot: 'bg-muted-foreground' },
}

function getInitials(fullName: string) {
  return (
    fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '—'
  )
}

export function StudentsTable({ students }: { students: MyStudent[] }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="items-center border-b px-5 py-4">
        <CardTitle className="text-sm">Mis alumnos</CardTitle>
        <CardDescription className="text-xs">
          {students.length} alumno{students.length === 1 ? '' : 's'}
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <Link href="/alumnos" className={buttonVariants({ size: 'sm' })}>
            <UserPlus data-icon="inline-start" />
            Nuevo alumno
          </Link>
        </CardAction>
      </CardHeader>

      <CardContent className="px-0 py-0">
        {students.length === 0 ? (
          <div className="text-muted-foreground px-5 py-12 text-center text-sm">
            Todavía no tenés alumnos vinculados.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Nombre</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-10 pr-5">
                  <span className="sr-only">Abrir</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                const status = STATUS_META[student.status]

                return (
                  <TableRow key={student.id} className="group">
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8 rounded-md">
                          <AvatarFallback className="bg-secondary text-secondary-foreground rounded-md text-[11px] font-semibold">
                            {getInitials(student.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="truncate text-sm font-medium">{student.fullName}</p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary">{student.level ?? 'Sin definir'}</Badge>
                    </TableCell>

                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', status.dot)} />
                        <span className="text-xs">{status.label}</span>
                      </span>
                    </TableCell>

                    <TableCell className="pr-5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Abrir ficha de ${student.fullName}`}
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
        )}
      </CardContent>
    </Card>
  )
}
