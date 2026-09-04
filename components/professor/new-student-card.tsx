'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CreateStudentUsernameForm } from '@/components/professor/create-student-username-form'
import { inviteStudent } from '@/app/alumnos/actions'

const TABS = [
  { id: 'email', label: 'Por email' },
  { id: 'username', label: 'Usuario y contraseña' },
] as const

export function NewStudentCard({ error }: { error?: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('email')

  return (
    <Card className="gap-0 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-sm">Nuevo alumno</CardTitle>
        <CardDescription className="text-xs">
          {tab === 'email'
            ? 'Le llega un email para que cree su contraseña y acceda a su plan.'
            : 'Elegís vos el usuario y la contraseña — sin email. Después se la pasás por WhatsApp.'}
        </CardDescription>
        <div className="mt-3 flex overflow-hidden rounded-lg border border-border text-xs w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={t.id === tab ? 'bg-muted px-3 py-1.5 font-medium' : 'text-muted-foreground px-3 py-1.5'}
            >
              {t.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-5 pt-4">
        {error ? <p className="bg-destructive/10 text-destructive mb-3 rounded-lg px-3 py-2 text-sm">{error}</p> : null}

        {tab === 'email' ? (
          <form action={inviteStudent} className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-48 flex-1 flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">Nombre</span>
              <Input type="text" name="fullName" required placeholder="Nombre del alumno" />
            </label>
            <label className="flex min-w-48 flex-1 flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">Email</span>
              <Input type="email" name="email" required placeholder="alumno@ejemplo.com" />
            </label>
            <Button type="submit" className="h-8">
              <UserPlus data-icon="inline-start" />
              Invitar
            </Button>
          </form>
        ) : (
          <CreateStudentUsernameForm />
        )}
      </CardContent>
    </Card>
  )
}
