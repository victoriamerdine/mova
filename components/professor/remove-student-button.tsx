'use client'

import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { removeStudent } from '@/app/alumnos/actions'

export function RemoveStudentButton({ studentId, studentName }: { studentId: string; studentName: string }) {
  return (
    <form
      action={removeStudent}
      onSubmit={(e) => {
        if (!window.confirm(`¿Sacar a ${studentName} de tus alumnos? No borra su cuenta, solo la relación con vos.`)) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="studentId" value={studentId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        aria-label={`Sacar a ${studentName} de tus alumnos`}
        className="text-muted-foreground hover:text-destructive"
      >
        <X />
      </Button>
    </form>
  )
}
