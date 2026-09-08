-- MOVA — Formularios paso 7: seed de las 8 plantillas del sistema.
--
-- Una plantilla del sistema es un `forms` con is_template = true y
-- professor_id = null (RLS: cualquier profesor la lee — migración 26).
-- `create_form_from_template` (migración 27) hace deep-copy de las tablas
-- de trabajo (secciones/preguntas/opciones/reglas) a un formulario nuevo
-- del profesor, remapeando ids. Por eso las plantillas NO necesitan un
-- snapshot en form_versions.
--
-- Idempotente: borra las plantillas del sistema y las vuelve a crear. El
-- `template_source_id` de formularios ya creados a partir de una plantilla
-- es `on delete set null`, así que borrarlas solo pierde la trazabilidad,
-- no datos del profesor.

-- ============================================================
-- Helpers efímeros (pg_temp, se descartan al cerrar la sesión).
-- ============================================================
create or replace function pg_temp._form(p_name text, p_desc text)
returns uuid language sql as $$
  insert into public.forms (professor_id, name, description, status, is_template)
  values (null, p_name, p_desc, 'published', true)
  returning id;
$$;

create or replace function pg_temp._sec(
  p_f uuid, p_ord int, p_title text, p_desc text default null, p_sensitive boolean default false
) returns uuid language sql as $$
  insert into public.form_sections (form_id, "order", title, description, sensitive)
  values (p_f, p_ord, p_title, p_desc, p_sensitive)
  returning id;
$$;

create or replace function pg_temp._q(
  p_f uuid, p_s uuid, p_ord int, p_type text, p_label text,
  p_required boolean default false, p_sensitive boolean default false,
  p_config jsonb default '{}'::jsonb, p_help text default null
) returns uuid language sql as $$
  insert into public.form_questions
    (form_id, section_id, "order", type, label, required, sensitive, config, help_text)
  values (p_f, p_s, p_ord, p_type, p_label, p_required, p_sensitive,
          coalesce(p_config, '{}'::jsonb), p_help)
  returning id;
$$;

-- p_pairs: array plano [value1, label1, value2, label2, ...]
create or replace function pg_temp._opt(p_q uuid, p_f uuid, p_pairs text[])
returns void language plpgsql as $$
declare i int := 1;
begin
  while i <= array_length(p_pairs, 1) loop
    insert into public.form_question_options (question_id, form_id, "order", value, label)
    values (p_q, p_f, (i - 1) / 2, p_pairs[i], p_pairs[i + 1]);
    i := i + 2;
  end loop;
end $$;

-- Regla "mostrar p_target si la respuesta de p_when_q == p_value".
create or replace function pg_temp._rule_show(
  p_f uuid, p_ord int, p_when_q uuid, p_value jsonb, p_target_q uuid
) returns void language sql as $$
  insert into public.form_rules (form_id, "order", "when", "match", action, target)
  values (
    p_f, p_ord,
    jsonb_build_array(jsonb_build_object('questionId', p_when_q::text, 'op', 'eq', 'value', p_value)),
    'all', 'show',
    jsonb_build_object('kind', 'question', 'id', p_target_q::text)
  );
$$;

-- ============================================================
-- Reemplazo de las plantillas del sistema.
-- ============================================================
delete from public.forms where is_template and professor_id is null;

do $$
declare
  f uuid; s1 uuid; s2 uuid;
  qy uuid; qd uuid;
begin
  -- ----------------------------------------------------------
  -- 1. Evaluación inicial general
  -- ----------------------------------------------------------
  f := pg_temp._form(
    'Evaluación inicial general',
    'Datos base, objetivo, disponibilidad y un bloque de salud y lesiones. Punto de partida para cualquier alumno nuevo, en cualquier deporte.');
  s1 := pg_temp._sec(f, 0, 'Datos y objetivo');
  s2 := pg_temp._sec(f, 1, 'Salud y lesiones',
    'Esta información se comparte solo con tu profesor, para adaptar el plan. Podés dejar en blanco lo que prefieras.', true);

  perform pg_temp._q(f, s1, 0, 'birth_date', 'Fecha de nacimiento', true);
  perform pg_temp._q(f, s1, 1, 'height', 'Altura', false, false, '{"unit":"cm"}'::jsonb);
  perform pg_temp._q(f, s1, 2, 'weight', 'Peso', false, false, '{"unit":"kg"}'::jsonb);
  qy := pg_temp._q(f, s1, 3, 'single_select', '¿Cuál es tu objetivo principal?', true);
  perform pg_temp._opt(qy, f, array[
    'salud','Salud general y bienestar',
    'grasa','Bajar grasa corporal',
    'musculo','Ganar masa muscular',
    'rendimiento','Rendimiento deportivo',
    'volver','Volver a entrenar después de un tiempo']);
  perform pg_temp._q(f, s1, 4, 'scale', '¿Cómo describirías tu nivel de actividad actual?',
    false, false, '{"min":1,"max":5,"minLabel":"Sedentario","maxLabel":"Muy activo"}'::jsonb);
  perform pg_temp._q(f, s1, 5, 'number', '¿Cuántos días por semana podés entrenar?',
    true, false, '{"min":0,"max":14}'::jsonb);
  qy := pg_temp._q(f, s1, 6, 'multi_select', '¿Qué equipamiento tenés disponible?');
  perform pg_temp._opt(qy, f, array[
    'gimnasio','Gimnasio completo',
    'mancuernas','Mancuernas',
    'bandas','Bandas elásticas',
    'kettlebell','Kettlebells',
    'barra','Barra y discos',
    'corporal','Solo peso corporal']);
  perform pg_temp._q(f, s1, 7, 'long_text', '¿Practicaste algún deporte o actividad? Contanos tu experiencia');

  perform pg_temp._q(f, s2, 0, 'long_text', 'Aclaraciones médicas relevantes para entrenar (opcional)', false, true);
  qy := pg_temp._q(f, s2, 1, 'yes_no', '¿Tenés alguna lesión o dolor actualmente?', false, true);
  qd := pg_temp._q(f, s2, 2, 'long_text', '¿Dónde y desde cuándo?', false, true);
  perform pg_temp._rule_show(f, 0, qy, 'true'::jsonb, qd);
  perform pg_temp._q(f, s2, 3, 'yes_no', '¿Estás bajo tratamiento médico o tomás alguna medicación relevante para entrenar?', false, true);
  perform pg_temp._q(f, s2, 4, 'yes_no', '¿Alguna vez un médico te desaconsejó hacer actividad física?', false, true);

  -- ----------------------------------------------------------
  -- 2. Fuerza / Gimnasio
  -- ----------------------------------------------------------
  f := pg_temp._form(
    'Fuerza / Gimnasio',
    'Experiencia con los básicos, disponibilidad, cargas de referencia y equipamiento. Para armar un plan de fuerza.');
  s1 := pg_temp._sec(f, 0, 'Entrenamiento de fuerza');
  s2 := pg_temp._sec(f, 1, 'Molestias', 'Solo para tu profesor.', true);

  qy := pg_temp._q(f, s1, 0, 'single_select', '¿Cuánta experiencia tenés con entrenamiento de fuerza?', true);
  perform pg_temp._opt(qy, f, array[
    'ninguna','Ninguna',
    'menos6','Menos de 6 meses',
    'medio','Entre 6 meses y 2 años',
    'mas2','Más de 2 años']);
  perform pg_temp._q(f, s1, 1, 'number', '¿Cuántos días por semana vas a entrenar fuerza?', true, false, '{"min":1,"max":7}'::jsonb);
  perform pg_temp._q(f, s1, 2, 'number', 'Minutos disponibles por sesión', false, false, '{"min":15,"max":180}'::jsonb);
  qy := pg_temp._q(f, s1, 3, 'multi_select', '¿Qué ejercicios ya hacés con técnica cómoda?');
  perform pg_temp._opt(qy, f, array[
    'sentadilla','Sentadilla',
    'peso_muerto','Peso muerto',
    'press_banca','Press de banca',
    'press_militar','Press militar',
    'dominadas','Dominadas',
    'remo','Remo',
    'hip_thrust','Hip thrust']);
  perform pg_temp._q(f, s1, 4, 'number', 'Sentadilla — kg para ~5 repeticiones (si lo sabés)', false, false, '{"min":0}'::jsonb);
  perform pg_temp._q(f, s1, 5, 'number', 'Peso muerto — kg para ~5 repeticiones (si lo sabés)', false, false, '{"min":0}'::jsonb);
  perform pg_temp._q(f, s1, 6, 'number', 'Press de banca — kg para ~5 repeticiones (si lo sabés)', false, false, '{"min":0}'::jsonb);
  qy := pg_temp._q(f, s1, 7, 'multi_select', '¿Qué equipamiento tenés?');
  perform pg_temp._opt(qy, f, array[
    'barra','Barra y discos',
    'rack','Rack o jaula',
    'mancuernas','Mancuernas',
    'poleas','Poleas',
    'maquinas','Máquinas',
    'kettlebells','Kettlebells']);
  perform pg_temp._q(f, s1, 8, 'scale', 'Descanso y energía en el día a día',
    false, false, '{"min":1,"max":5,"minLabel":"Muy bajos","maxLabel":"Excelentes"}'::jsonb);

  qy := pg_temp._q(f, s2, 0, 'yes_no', '¿Hay alguna zona que te moleste al entrenar?', false, true);
  qd := pg_temp._q(f, s2, 1, 'long_text', '¿Cuál y con qué movimientos?', false, true);
  perform pg_temp._rule_show(f, 0, qy, 'true'::jsonb, qd);

  -- ----------------------------------------------------------
  -- 3. Hipertrofia
  -- ----------------------------------------------------------
  f := pg_temp._form(
    'Hipertrofia',
    'Prioridades musculares, volumen disponible, alimentación y descanso. Para un plan orientado a ganar masa.');
  s1 := pg_temp._sec(f, 0, 'Objetivo de volumen');
  s2 := pg_temp._sec(f, 1, 'Molestias', 'Solo para tu profesor.', true);

  qy := pg_temp._q(f, s1, 0, 'single_select', 'Experiencia entrenando para volumen muscular', true);
  perform pg_temp._opt(qy, f, array[
    'principiante','Principiante',
    'intermedio','Intermedio',
    'avanzado','Avanzado']);
  perform pg_temp._q(f, s1, 1, 'number', 'Días por semana disponibles', true, false, '{"min":1,"max":7}'::jsonb);
  perform pg_temp._q(f, s1, 2, 'number', 'Minutos por sesión', false, false, '{"min":20,"max":180}'::jsonb);
  qy := pg_temp._q(f, s1, 3, 'multi_select', 'Grupos musculares que querés priorizar');
  perform pg_temp._opt(qy, f, array[
    'pecho','Pecho',
    'espalda','Espalda',
    'hombros','Hombros',
    'biceps','Bíceps',
    'triceps','Tríceps',
    'cuadriceps','Cuádriceps',
    'isquios','Isquios',
    'gluteos','Glúteos',
    'gemelos','Gemelos',
    'core','Core']);
  perform pg_temp._q(f, s1, 4, 'weight', 'Peso actual', false, false, '{"unit":"kg"}'::jsonb);
  qy := pg_temp._q(f, s1, 5, 'single_select', 'Objetivo de peso corporal', true);
  perform pg_temp._opt(qy, f, array['bajar','Bajar','mantener','Mantener','subir','Subir']);
  qy := pg_temp._q(f, s1, 6, 'single_select', '¿Cómo manejás la alimentación hoy?');
  perform pg_temp._opt(qy, f, array[
    'no_controlo','No la controlo',
    'intuitivo','Como de forma intuitiva',
    'macros','Cuento macros / calorías',
    'nutri','Sigo un plan con nutricionista']);
  perform pg_temp._q(f, s1, 7, 'scale', 'Calidad de sueño',
    false, false, '{"min":1,"max":5,"minLabel":"Mala","maxLabel":"Excelente"}'::jsonb);

  qy := pg_temp._q(f, s2, 0, 'yes_no', '¿Algún ejercicio te genera molestia?', false, true);
  qd := pg_temp._q(f, s2, 1, 'long_text', '¿Cuál?', false, true);
  perform pg_temp._rule_show(f, 0, qy, 'true'::jsonb, qd);

  -- ----------------------------------------------------------
  -- 4. Running
  -- ----------------------------------------------------------
  f := pg_temp._form(
    'Running',
    'Volumen actual, ritmos, objetivo de distancia y fecha de carrera. Para planificar una temporada de running.');
  s1 := pg_temp._sec(f, 0, 'Tu running');
  s2 := pg_temp._sec(f, 1, 'Lesiones', 'Solo para tu profesor.', true);

  qy := pg_temp._q(f, s1, 0, 'single_select', '¿Hace cuánto que corrés?', true);
  perform pg_temp._opt(qy, f, array[
    'empezando','Estoy empezando',
    'menos1','Menos de 1 año',
    'entre1y3','Entre 1 y 3 años',
    'mas3','Más de 3 años']);
  perform pg_temp._q(f, s1, 1, 'distance', 'Distancia semanal actual', false, false, '{"unit":"km"}'::jsonb);
  perform pg_temp._q(f, s1, 2, 'number', 'Días que corrés por semana', true, false, '{"min":1,"max":7}'::jsonb);
  perform pg_temp._q(f, s1, 3, 'pace', 'Ritmo cómodo aproximado', false, false, '{"unit":"min/km"}'::jsonb);
  qy := pg_temp._q(f, s1, 4, 'single_select', '¿Cuál es tu objetivo?', true);
  perform pg_temp._opt(qy, f, array[
    '5k','5K',
    '10k','10K',
    '21k','21K (media)',
    '42k','42K (maratón)',
    'trail','Trail',
    'salud','Salud y estado físico']);
  perform pg_temp._q(f, s1, 5, 'date', '¿Tenés una carrera con fecha? (opcional)');
  perform pg_temp._q(f, s1, 6, 'duration', 'Mejor tiempo reciente en 10K (opcional)', false, false, '{"unit":"hh:mm"}'::jsonb);
  perform pg_temp._q(f, s1, 7, 'yes_no', '¿Hacés trabajo de fuerza actualmente?');

  qy := pg_temp._q(f, s2, 0, 'yes_no', '¿Tuviste lesiones de carrera (fascitis, periostitis, rodilla, sóleo…)?', false, true);
  qd := pg_temp._q(f, s2, 1, 'long_text', '¿Cuáles y cuándo?', false, true);
  perform pg_temp._rule_show(f, 0, qy, 'true'::jsonb, qd);

  -- ----------------------------------------------------------
  -- 5. Fútbol
  -- ----------------------------------------------------------
  f := pg_temp._form(
    'Fútbol',
    'Nivel, puesto, carga de partidos y entrenamientos, y qué querés mejorar. Para preparación física orientada al fútbol.');
  s1 := pg_temp._sec(f, 0, 'Tu fútbol');
  s2 := pg_temp._sec(f, 1, 'Lesiones', 'Solo para tu profesor.', true);

  qy := pg_temp._q(f, s1, 0, 'single_select', '¿En qué nivel jugás?', true);
  perform pg_temp._opt(qy, f, array[
    'recreativo','Recreativo',
    'amateur','Amateur federado',
    'semi','Semiprofesional',
    'pro','Profesional']);
  qy := pg_temp._q(f, s1, 1, 'single_select', 'Puesto habitual');
  perform pg_temp._opt(qy, f, array[
    'arquero','Arquero',
    'defensor','Defensor',
    'medio','Mediocampista',
    'delantero','Delantero']);
  perform pg_temp._q(f, s1, 2, 'number', 'Partidos por semana', false, false, '{"min":0,"max":10}'::jsonb);
  perform pg_temp._q(f, s1, 3, 'number', 'Entrenamientos con el equipo por semana', false, false, '{"min":0,"max":10}'::jsonb);
  qy := pg_temp._q(f, s1, 4, 'multi_select', '¿Qué querés mejorar?');
  perform pg_temp._opt(qy, f, array[
    'velocidad','Velocidad',
    'aceleracion','Aceleración',
    'cambio_dir','Cambio de dirección',
    'resistencia','Resistencia',
    'salto','Salto y potencia',
    'fuerza','Fuerza',
    'prevencion','Prevención de lesiones']);
  perform pg_temp._q(f, s1, 5, 'yes_no', '¿Hacés trabajo de gimnasio complementario?');
  perform pg_temp._q(f, s1, 6, 'scale', '¿Cómo llegás físicamente al final del partido?',
    false, false, '{"min":1,"max":5,"minLabel":"Fundido","maxLabel":"Entero"}'::jsonb);

  qy := pg_temp._q(f, s2, 0, 'yes_no', '¿Lesiones musculares en el último año (isquios, aductores, pubis…)?', false, true);
  qd := pg_temp._q(f, s2, 1, 'long_text', '¿Cuáles y cuándo?', false, true);
  perform pg_temp._rule_show(f, 0, qy, 'true'::jsonb, qd);

  -- ----------------------------------------------------------
  -- 6. Pádel
  -- ----------------------------------------------------------
  f := pg_temp._form(
    'Pádel',
    'Nivel, posición, frecuencia de juego y foco de trabajo. Para preparación física orientada al pádel.');
  s1 := pg_temp._sec(f, 0, 'Tu pádel');
  s2 := pg_temp._sec(f, 1, 'Molestias y lesiones', 'Solo para tu profesor.', true);

  qy := pg_temp._q(f, s1, 0, 'single_select', 'Nivel', true);
  perform pg_temp._opt(qy, f, array[
    'iniciacion','Iniciación',
    'intermedio','Intermedio',
    'avanzado','Avanzado',
    'competicion','Competición']);
  qy := pg_temp._q(f, s1, 1, 'single_select', 'Posición');
  perform pg_temp._opt(qy, f, array['derecha','Derecha','reves','Revés','indistinto','Indistinto']);
  perform pg_temp._q(f, s1, 2, 'number', 'Veces que jugás por semana', false, false, '{"min":0,"max":14}'::jsonb);
  qy := pg_temp._q(f, s1, 3, 'multi_select', '¿Qué querés trabajar?');
  perform pg_temp._opt(qy, f, array[
    'lateral','Desplazamientos laterales',
    'potencia','Potencia',
    'reaccion','Reacción',
    'resistencia','Resistencia intermitente',
    'rotacion','Rotación de tronco',
    'hombro','Prevención de hombro',
    'lumbar','Prevención lumbar']);
  perform pg_temp._q(f, s1, 4, 'yes_no', '¿Hacés preparación física fuera de la cancha?');
  perform pg_temp._q(f, s1, 5, 'scale', 'Molestia en hombro o codo después de jugar',
    false, false, '{"min":1,"max":5,"minLabel":"Nada","maxLabel":"Mucha"}'::jsonb);

  qy := pg_temp._q(f, s2, 0, 'yes_no', '¿Tuviste epicondilitis, problemas de hombro o lumbares?', false, true);
  qd := pg_temp._q(f, s2, 1, 'long_text', '¿Qué y cuándo?', false, true);
  perform pg_temp._rule_show(f, 0, qy, 'true'::jsonb, qd);

  -- ----------------------------------------------------------
  -- 7. Karate
  -- ----------------------------------------------------------
  f := pg_temp._form(
    'Karate',
    'Nivel, foco (kata / kumite), capacidades a mejorar y flexibilidad. Para preparación física orientada al karate.');
  s1 := pg_temp._sec(f, 0, 'Tu karate');
  s2 := pg_temp._sec(f, 1, 'Lesiones', 'Solo para tu profesor.', true);

  qy := pg_temp._q(f, s1, 0, 'single_select', 'Cinturón / nivel', true);
  perform pg_temp._opt(qy, f, array[
    'blanco_amarillo','De blanco a amarillo',
    'naranja_verde','De naranja a verde',
    'azul_marron','De azul a marrón',
    'negro','Cinturón negro']);
  qy := pg_temp._q(f, s1, 1, 'single_select', '¿Qué trabajás principalmente?');
  perform pg_temp._opt(qy, f, array['kata','Kata','kumite','Kumite','ambos','Ambos']);
  perform pg_temp._q(f, s1, 2, 'number', 'Entrenamientos por semana', false, false, '{"min":1,"max":14}'::jsonb);
  qy := pg_temp._q(f, s1, 3, 'multi_select', 'Capacidades a mejorar');
  perform pg_temp._opt(qy, f, array[
    'velocidad','Velocidad',
    'potencia','Potencia',
    'reaccion','Reacción',
    'flexibilidad','Flexibilidad',
    'coordinacion','Coordinación',
    'estabilidad','Estabilidad',
    'resistencia','Resistencia']);
  perform pg_temp._q(f, s1, 4, 'scale', 'Flexibilidad de cadera (patada alta cómoda)',
    false, false, '{"min":1,"max":5,"minLabel":"Poca","maxLabel":"Mucha"}'::jsonb);
  perform pg_temp._q(f, s1, 5, 'yes_no', '¿Hacés trabajo físico complementario?');

  qy := pg_temp._q(f, s2, 0, 'yes_no', '¿Lesiones en rodilla, tobillo, cadera u hombro?', false, true);
  qd := pg_temp._q(f, s2, 1, 'long_text', '¿Cuáles y cuándo?', false, true);
  perform pg_temp._rule_show(f, 0, qy, 'true'::jsonb, qd);

  -- ----------------------------------------------------------
  -- 8. Preparación física (genérico deportivo)
  -- ----------------------------------------------------------
  f := pg_temp._form(
    'Preparación física',
    'Deporte, momento de la temporada, competencia objetivo y prioridades. Sirve para cualquier deporte no cubierto por otra plantilla.');
  s1 := pg_temp._sec(f, 0, 'Contexto deportivo');
  s2 := pg_temp._sec(f, 1, 'Lesiones', 'Solo para tu profesor.', true);

  perform pg_temp._q(f, s1, 0, 'short_text', '¿Para qué deporte o actividad es esta preparación?', true);
  qy := pg_temp._q(f, s1, 1, 'single_select', 'Momento de la temporada', true);
  perform pg_temp._opt(qy, f, array[
    'pretemporada','Pretemporada',
    'temporada','En temporada',
    'fuera','Fuera de temporada',
    'puesta_punto','Puesta a punto',
    'vuelta_lesion','Vuelta de lesión']);
  perform pg_temp._q(f, s1, 2, 'date', 'Fecha de la próxima competencia importante (opcional)');
  perform pg_temp._q(f, s1, 3, 'number', 'Sesiones de tu deporte por semana', false, false, '{"min":0,"max":21}'::jsonb);
  perform pg_temp._q(f, s1, 4, 'number', 'Sesiones de preparación física disponibles por semana', true, false, '{"min":0,"max":14}'::jsonb);
  qy := pg_temp._q(f, s1, 5, 'multi_select', 'Prioridades');
  perform pg_temp._opt(qy, f, array[
    'fuerza','Fuerza',
    'potencia','Potencia',
    'velocidad','Velocidad',
    'aceleracion','Aceleración',
    'cambio_dir','Cambio de dirección',
    'aerobica','Resistencia aeróbica',
    'anaerobica','Resistencia anaeróbica',
    'movilidad','Movilidad',
    'prevencion','Prevención de lesiones']);
  perform pg_temp._q(f, s1, 6, 'scale', 'Nivel de fatiga general actual',
    false, false, '{"min":1,"max":5,"minLabel":"Fresco","maxLabel":"Muy fatigado"}'::jsonb);

  qy := pg_temp._q(f, s2, 0, 'yes_no', '¿Lesiones activas o recientes?', false, true);
  qd := pg_temp._q(f, s2, 1, 'long_text', '¿Cuáles y en qué estado?', false, true);
  perform pg_temp._rule_show(f, 0, qy, 'true'::jsonb, qd);
end $$;

drop function if exists pg_temp._form(text, text);
drop function if exists pg_temp._sec(uuid, int, text, text, boolean);
drop function if exists pg_temp._q(uuid, uuid, int, text, text, boolean, boolean, jsonb, text);
drop function if exists pg_temp._opt(uuid, uuid, text[]);
drop function if exists pg_temp._rule_show(uuid, int, uuid, jsonb, uuid);
