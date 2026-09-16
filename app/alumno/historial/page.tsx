import { redirect } from 'next/navigation'

/** El historial se unificó con el calendario del alumno — ver /alumno/calendario. */
export default function StudentHistoryPage() {
  redirect('/alumno/calendario')
}
