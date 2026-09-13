'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { setStudentSuspended } from '@/app/alumnos/actions'

export function SuspendStudentButton({
  studentId,
  studentName,
  suspended,
}: {
  studentId: string
  studentName: string
  suspended: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function toggle() {
    const message = suspended
      ? `¿Reactivar a ${studentName}? Vuelve a ver sus planes con vos.`
      : `¿Suspender a ${studentName}? Va a poder seguir entrando a MOVA, pero no va a ver ningún plan activo hasta que lo reactives.`
    if (!window.confirm(message)) return

    startTransition(async () => {
      const res = await setStudentSuspended(studentId, !suspended)
      if (res.error) {
        alert(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <Button
      type="button"
      variant={suspended ? 'default' : 'outline'}
      size="sm"
      disabled={pending}
      onClick={toggle}
    >
      {suspended ? <RotateCcw data-icon="inline-start" /> : <Ban data-icon="inline-start" />}
      {pending ? 'Guardando…' : suspended ? 'Reactivar' : 'Suspender'}
    </Button>
  )
}
