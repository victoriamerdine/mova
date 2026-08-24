import React, { useState, useMemo } from "react";
import {
  Dumbbell,
  LayoutDashboard,
  Users,
  LibraryBig,
  ClipboardList,
  BarChart3,
  Settings,
  Search,
  Plus,
  Layers,
  Trash2,
  GripVertical,
  Link2,
  Save,
  ChevronLeft,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Datos                                                               */
/* ------------------------------------------------------------------ */

const EXERCISE_LIBRARY = [
  { id: "lib-1", name: "Peso Muerto Rumano", muscles: ["Isquios", "Glúteo"] },
  { id: "lib-2", name: "Sentadilla Goblet", muscles: ["Cuádriceps", "Glúteo"] },
  { id: "lib-3", name: "Remo con mancuerna", muscles: ["Dorsal", "Bíceps"] },
  { id: "lib-4", name: "Press banca inclinado", muscles: ["Pectoral", "Tríceps"] },
  { id: "lib-5", name: "Dominadas supinas", muscles: ["Dorsal", "Bíceps"] },
  { id: "lib-6", name: "Press militar mancuerna", muscles: ["Hombro", "Tríceps"] },
  { id: "lib-7", name: "Zancada caminando", muscles: ["Cuádriceps", "Glúteo"] },
  { id: "lib-8", name: "Curl femoral en banco", muscles: ["Isquios"] },
  { id: "lib-9", name: "Face pull en polea", muscles: ["Deltoide post."] },
  { id: "lib-10", name: "Hip thrust con barra", muscles: ["Glúteo"] },
  { id: "lib-11", name: "Elevaciones laterales", muscles: ["Hombro"] },
  { id: "lib-12", name: "Curl bíceps barra Z", muscles: ["Bíceps"] },
  { id: "lib-13", name: "Fondos en paralelas", muscles: ["Pectoral", "Tríceps"] },
  { id: "lib-14", name: "Plancha con carga", muscles: ["Core"] },
];

const INITIAL_BLOCKS = [
  {
    id: "block-1",
    kind: "individual",
    exercise: "Peso Muerto Rumano",
    sets: 3,
    reps: 8,
    load: 40,
    rest: 90,
  },
  {
    id: "block-2",
    kind: "superset",
    rounds: 3,
    rest: 60,
    exercises: [
      { id: "block-2-a1", label: "A1", exercise: "Sentadilla Goblet", sets: 3, reps: 12 },
      { id: "block-2-a2", label: "A2", exercise: "Remo con mancuerna", sets: 3, reps: 12 },
    ],
  },
];

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Alumnos", icon: Users, count: 24 },
  { label: "Biblioteca", icon: LibraryBig, count: 764 },
  { label: "Planes", icon: ClipboardList, count: 21 },
  { label: "Analítica", icon: BarChart3 },
  { label: "Configuración", icon: Settings },
];

const DRAG_TYPE = "application/x-nucleo-exercise";

let uid = 100;
const nextId = (prefix) => `${prefix}-${uid++}`;

/* ------------------------------------------------------------------ */
/* Piezas pequeñas reutilizables                                       */
/* ------------------------------------------------------------------ */

function MetricField({ label, value, unit, onChange }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      <div className="flex h-8 items-center rounded-lg border border-zinc-200 bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/30">
        <input
          type="number"
          inputMode="numeric"
          value={Number.isNaN(value) ? "" : value}
          onChange={(e) => onChange(e.target.valueAsNumber)}
          className="h-full w-full min-w-0 rounded-lg bg-transparent px-2.5 text-right font-mono text-sm text-zinc-900 outline-none"
        />
        {unit ? (
          <span className="pr-2.5 text-xs font-medium text-zinc-400 select-none">{unit}</span>
        ) : null}
      </div>
    </label>
  );
}

function IconButton({ onClick, label, tone = "default", className = "", children }) {
  const toneClasses =
    tone === "danger"
      ? "text-zinc-400 hover:text-red-600 hover:bg-red-50"
      : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex size-7 shrink-0 items-center justify-center rounded-md transition-colors ${toneClasses} ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar del profesor                                                */
/* ------------------------------------------------------------------ */

function AppSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 text-zinc-100 lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-zinc-800 px-5">
        <span className="flex size-8 items-center justify-center rounded-md bg-emerald-500 text-zinc-950">
          <Dumbbell className="size-4.5" />
        </span>
        <span className="text-base font-semibold tracking-tight text-white">Nucleo</span>
        <span className="ml-auto rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-300">
          Coach
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        <p className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
          Gestión
        </p>
        {NAV_ITEMS.map((item) => {
          const active = item.label === "Planes";
          return (
            <a
              key={item.label}
              href="#"
              onClick={(e) => e.preventDefault()}
              className={`group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
              }`}
            >
              {active ? (
                <span className="absolute -left-3 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-emerald-500" />
              ) : null}
              <item.icon className="size-4.5 shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.count ? (
                <span className="ml-auto font-mono text-xs text-zinc-500">{item.count}</span>
              ) : null}
            </a>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 p-3">
        <div className="rounded-lg bg-zinc-800/60 p-3">
          <p className="text-xs font-medium text-zinc-300">Volumen semanal</p>
          <p className="mt-1 font-mono text-2xl leading-none text-white">
            412<span className="ml-1 text-xs font-sans text-zinc-500">series</span>
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
            Acumulado del staff en la semana en curso
          </p>
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Header de la pantalla                                               */
/* ------------------------------------------------------------------ */

function BuilderHeader({ onSave, justSaved }) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/85 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <IconButton label="Volver al plan" className="-ml-1.5">
          <ChevronLeft className="size-4.5" />
        </IconButton>

        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-zinc-900">
            Día 1: Fuerza Tren Superior
          </h1>
          <p className="truncate text-xs text-zinc-500">
            Plan de Victoria · Mesociclo 2, semana 3
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {justSaved ? (
            <span className="hidden text-xs font-medium text-emerald-600 sm:inline">
              Plan guardado
            </span>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-600 active:translate-y-px"
          >
            <Save className="size-4" />
            Guardar plan
          </button>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Bloque individual                                                   */
/* ------------------------------------------------------------------ */

function IndividualBlockCard({ block, onChange, onRemove }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <GripVertical className="size-4 shrink-0 text-zinc-300" />
        <input
          value={block.exercise}
          onChange={(e) => onChange({ exercise: e.target.value })}
          placeholder="Nombre del ejercicio…"
          aria-label="Nombre del ejercicio"
          className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-sm font-medium text-zinc-900 outline-none hover:bg-zinc-50 focus:border-zinc-200 focus:bg-zinc-50"
        />
        <IconButton label="Quitar bloque" tone="danger" onClick={onRemove}>
          <Trash2 className="size-4" />
        </IconButton>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricField label="Series" value={block.sets} onChange={(sets) => onChange({ sets })} />
        <MetricField label="Reps" value={block.reps} onChange={(reps) => onChange({ reps })} />
        <MetricField
          label="Carga"
          unit="kg"
          value={block.load}
          onChange={(load) => onChange({ load })}
        />
        <MetricField
          label="Pausa"
          unit="s"
          value={block.rest}
          onChange={(rest) => onChange({ rest })}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bloque combinado (superserie)                                       */
/* ------------------------------------------------------------------ */

function SupersetBlockCard({
  block,
  onChangeShared,
  onChangeExercise,
  onAddExercise,
  onRemoveExercise,
  onRemove,
}) {
  return (
    <div className="rounded-xl border border-zinc-200 border-l-4 border-l-emerald-500 bg-white p-4 shadow-sm ring-1 ring-emerald-500/10">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          <Layers className="size-3" />
          Superserie
        </span>
        <span className="text-xs text-zinc-500">Bloque combinado</span>
        <IconButton label="Quitar bloque" tone="danger" onClick={onRemove} className="ml-auto">
          <Trash2 className="size-4" />
        </IconButton>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:w-64">
        <MetricField
          label="Vueltas del bloque"
          value={block.rounds}
          onChange={(rounds) => onChangeShared({ rounds })}
        />
        <MetricField
          label="Pausa entre vueltas"
          unit="s"
          value={block.rest}
          onChange={(rest) => onChangeShared({ rest })}
        />
      </div>

      <div className="flex flex-col">
        {block.exercises.map((exercise, index) => (
          <div key={exercise.id}>
            {index > 0 ? (
              <div className="flex items-center gap-2 py-1.5 pl-3.5">
                <Link2 className="size-3.5 shrink-0 -rotate-45 text-emerald-500/60" />
                <span className="text-[10px] uppercase tracking-wide text-zinc-400">
                  intercalado
                </span>
              </div>
            ) : null}

            <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
              <span className="mt-0.5 flex h-6 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 font-mono text-xs font-semibold text-emerald-700">
                {exercise.label}
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <input
                  value={exercise.exercise}
                  onChange={(e) => onChangeExercise(exercise.id, { exercise: e.target.value })}
                  placeholder="Nombre del ejercicio…"
                  aria-label={`Nombre del ejercicio ${exercise.label}`}
                  className="h-7 min-w-0 rounded-md border border-transparent bg-transparent px-1.5 text-sm font-medium text-zinc-900 outline-none hover:bg-white focus:border-zinc-200 focus:bg-white"
                />
                <div className="grid grid-cols-2 gap-3">
                  <MetricField
                    label="Series"
                    value={exercise.sets}
                    onChange={(sets) => onChangeExercise(exercise.id, { sets })}
                  />
                  <MetricField
                    label="Reps"
                    value={exercise.reps}
                    onChange={(reps) => onChangeExercise(exercise.id, { reps })}
                  />
                </div>
              </div>

              {block.exercises.length > 2 ? (
                <IconButton
                  label={`Quitar ${exercise.label}`}
                  tone="danger"
                  onClick={() => onRemoveExercise(exercise.id)}
                  className="mt-0.5"
                >
                  <Trash2 className="size-3.5" />
                </IconButton>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAddExercise}
        className="mt-2.5 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
      >
        <Plus className="size-3.5" />
        Añadir ejercicio al bloque
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Biblioteca de ejercicios (columna derecha)                          */
/* ------------------------------------------------------------------ */

function ExerciseLibrary({ onAddExercise }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EXERCISE_LIBRARY;
    return EXERCISE_LIBRARY.filter(
      (ex) =>
        ex.name.toLowerCase().includes(q) ||
        ex.muscles.some((m) => m.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-zinc-200 p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Biblioteca rápida</h2>
        <p className="text-xs text-zinc-500">
          Arrastrá un ejercicio al plan o tocá + para añadirlo
        </p>
        <div className="mt-1 flex h-8 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/30">
          <Search className="size-3.5 shrink-0 text-zinc-400" />
          <input
            type="search"
            placeholder="Buscar ejercicio o músculo…"
            aria-label="Buscar en la biblioteca"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <ul className="flex flex-col gap-2">
          {results.map((exercise) => (
            <li
              key={exercise.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(exercise));
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="group/lib flex cursor-grab items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 transition-colors hover:bg-zinc-100 active:cursor-grabbing"
            >
              <GripVertical className="mt-0.5 size-3.5 shrink-0 text-zinc-300" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium leading-snug text-zinc-800">
                  {exercise.name}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {exercise.muscles.map((m) => (
                    <span
                      key={m}
                      className="rounded-full border border-zinc-200 px-1.5 py-0.5 text-[10px] font-normal text-zinc-500"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                aria-label={`Añadir ${exercise.name} al plan`}
                onClick={() => onAddExercise(exercise)}
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md text-zinc-400 opacity-0 transition-colors hover:bg-emerald-500 hover:text-white focus-visible:opacity-100 group-hover/lib:opacity-100"
              >
                <Plus className="size-3.5" />
              </button>
            </li>
          ))}

          {results.length === 0 ? (
            <li className="px-2 py-6 text-center text-xs text-zinc-400">
              Sin resultados para "{query}"
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Componente principal                                                */
/* ------------------------------------------------------------------ */

export default function WorkoutBuilderScreen() {
  const [blocks, setBlocks] = useState(INITIAL_BLOCKS);
  const [isDragOver, setIsDragOver] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  function addIndividualBlock(fromLibrary) {
    const block = {
      id: nextId("block"),
      kind: "individual",
      exercise: fromLibrary ? fromLibrary.name : "",
      sets: 3,
      reps: 10,
      load: 20,
      rest: 60,
    };
    setBlocks((prev) => [...prev, block]);
  }

  function addSupersetBlock() {
    const block = {
      id: nextId("block"),
      kind: "superset",
      rounds: 3,
      rest: 60,
      exercises: [
        { id: nextId("ex"), label: "A1", exercise: "", sets: 3, reps: 10 },
        { id: nextId("ex"), label: "A2", exercise: "", sets: 3, reps: 10 },
      ],
    };
    setBlocks((prev) => [...prev, block]);
  }

  function removeBlock(id) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function updateIndividual(id, patch) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function updateSuperset(id, patch) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function updateSupersetExercise(blockId, exerciseId, patch) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId || b.kind !== "superset") return b;
        return {
          ...b,
          exercises: b.exercises.map((ex) => (ex.id === exerciseId ? { ...ex, ...patch } : ex)),
        };
      })
    );
  }

  function addSupersetExercise(blockId) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId || b.kind !== "superset") return b;
        const nextLabel = `A${b.exercises.length + 1}`;
        return {
          ...b,
          exercises: [
            ...b.exercises,
            { id: nextId("ex"), label: nextLabel, exercise: "", sets: 3, reps: 10 },
          ],
        };
      })
    );
  }

  function removeSupersetExercise(blockId, exerciseId) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId || b.kind !== "superset") return b;
        if (b.exercises.length <= 2) return b;
        return {
          ...b,
          exercises: b.exercises
            .filter((ex) => ex.id !== exerciseId)
            .map((ex, i) => ({ ...ex, label: `A${i + 1}` })),
        };
      })
    );
  }

  function handleSave() {
    setJustSaved(true);
    window.clearTimeout(handleSave._t);
    handleSave._t = window.setTimeout(() => setJustSaved(false), 2000);
  }

  return (
    <div className="flex h-full min-h-[720px] w-full bg-zinc-50 font-sans text-zinc-900 antialiased">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <BuilderHeader onSave={handleSave} justSaved={justSaved} />

        <main className="grid flex-1 items-start gap-6 p-4 sm:p-6 lg:grid-cols-[7fr_3fr]">
          <div
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes(DRAG_TYPE)) {
                e.preventDefault();
                setIsDragOver(true);
              }
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              const raw = e.dataTransfer.getData(DRAG_TYPE);
              if (!raw) return;
              e.preventDefault();
              setIsDragOver(false);
              addIndividualBlock(JSON.parse(raw));
            }}
            className={`flex flex-col gap-4 rounded-xl transition-colors ${
              isDragOver ? "bg-emerald-50 ring-2 ring-emerald-400 ring-dashed" : ""
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => addIndividualBlock()}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                <Plus className="size-4" />
                Añadir bloque individual
              </button>
              <button
                type="button"
                onClick={addSupersetBlock}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                <Layers className="size-4" />
                Añadir bloque combinado
              </button>
            </div>

            {blocks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 px-5 py-10 text-center text-sm text-zinc-500">
                Todavía no hay bloques. Añadí uno o arrastrá un ejercicio desde la biblioteca.
              </div>
            ) : null}

            {blocks.map((block) =>
              block.kind === "individual" ? (
                <IndividualBlockCard
                  key={block.id}
                  block={block}
                  onChange={(patch) => updateIndividual(block.id, patch)}
                  onRemove={() => removeBlock(block.id)}
                />
              ) : (
                <SupersetBlockCard
                  key={block.id}
                  block={block}
                  onChangeShared={(patch) => updateSuperset(block.id, patch)}
                  onChangeExercise={(exId, patch) =>
                    updateSupersetExercise(block.id, exId, patch)
                  }
                  onAddExercise={() => addSupersetExercise(block.id)}
                  onRemoveExercise={(exId) => removeSupersetExercise(block.id, exId)}
                  onRemove={() => removeBlock(block.id)}
                />
              )
            )}
          </div>

          <ExerciseLibrary onAddExercise={(exercise) => addIndividualBlock(exercise)} />
        </main>
      </div>
    </div>
  );
}
