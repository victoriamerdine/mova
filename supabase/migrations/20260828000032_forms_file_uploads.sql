-- MOVA — Formularios paso 8: subida de archivos (tipo de pregunta "file").
--
-- El alumno responde SIN cuenta, por token → no hay auth.uid().
--  * Subida: siempre por el route handler app/f/[token]/upload con la
--    service_role key. Valida el token, la pregunta y el tamaño antes de
--    guardar. El valor queda en form_answers.value como jsonb
--    { path, filename, size, mime } — igual que cualquier otra respuesta;
--    el autosave lo persiste.
--  * Descarga (profesor): route handler
--    app/formularios/[id]/respuestas/[submissionId]/archivo — verifica con
--    RLS que el profesor sea dueño de la submission y firma la URL con la
--    service_role key.
--
-- Por eso el bucket es privado y NO lleva policies de storage.objects:
-- ningún usuario (anon ni authenticated) toca Storage directo.

insert into storage.buckets (id, name, public, file_size_limit)
values ('form-uploads', 'form-uploads', false, 15728640)  -- 15 MB
on conflict (id) do update set public = false, file_size_limit = 15728640;
