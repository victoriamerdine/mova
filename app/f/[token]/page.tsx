import { FormRunner } from '@/components/forms/form-runner'

export const dynamic = 'force-dynamic'

/**
 * Formulario del alumno — PÚBLICO, sin login. El acceso lo da el `token`
 * de la URL, validado por los RPCs `security definer` (get_submission /
 * start_submission / save_submission_answers / complete_submission).
 */
export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return (
    <main className="bg-background min-h-svh">
      <FormRunner token={token} />
    </main>
  )
}
