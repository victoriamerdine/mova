# Nucleo — Plataforma de Entrenamiento

Proyecto Next.js (App Router) + Tailwind CSS + shadcn/ui (`base-nova`) para la plataforma
de entrenamiento físico con rol Profesor / Alumno.

## Estado actual

Implementado hasta ahora (rol Profesor, desktop-first):

- **`/`** — Dashboard del profesor (métricas, alertas, tabla de alumnos, panel de volumen).
- **`/constructor`** — Constructor de Entrenamiento: arma bloques individuales y superseries
  (bloques combinados A1/A2…), con biblioteca rápida de ejercicios arrastrable (drag & drop)
  a la derecha.
- **`/biblioteca`** — Biblioteca de Ejercicios: grid de 1.372 ejercicios reales (extraídos de
  `data/ejercicios_consolidado_TOTAL.xlsx`), con filtros por categoría/patrón y músculo
  principal, buscador, paginación y modal de detalle con el video real embebido
  (YouTube Shorts).

Pendiente / no implementado todavía: vistas del rol Alumno (mobile-first), autenticación,
persistencia en backend, y las secciones "Instrucciones paso a paso" / "Errores frecuentes"
por ejercicio (la planilla fuente no trae esos datos; el modal lo indica explícitamente en
vez de inventarlos).

## Estructura relevante

```
app/
  page.tsx              → Dashboard del profesor
  constructor/page.tsx  → Constructor de Entrenamiento
  biblioteca/page.tsx   → Biblioteca de Ejercicios
components/
  professor/            → Sidebar, header, dashboard, constructor de entrenamiento
  library/               → Biblioteca de Ejercicios (filtros, grid, modal, thumbnail)
  ui/                    → Primitivas shadcn/ui (Button, Card, Badge, Input, etc.)
lib/
  data/professor.ts      → Datos de ejemplo del dashboard
  data/builder.ts         → Datos de ejemplo del constructor
  data/library.ts          → Dataset real de ejercicios (generado desde el xlsx)
data/
  ejercicios_consolidado_TOTAL.xlsx        → Fuente real de la Biblioteca de Ejercicios
  PLAN-MUSCULOS-Y-PATRONES-...xlsx         → Planilla de referencia original
previews/
  constructor-entrenamiento.jsx  → Versión standalone (React+Tailwind) para preview rápido
  biblioteca-ejercicios.jsx      → Versión standalone (React+Tailwind) para preview rápido
```

Los archivos en `previews/` son componentes autocontenidos (sin dependencias del proyecto)
pensados para visualizarse rápido en un entorno de preview de React; **la versión
integrada y actualizada vive en `app/` + `components/`**.

## Regenerar `lib/data/library.ts` desde el Excel

Si `data/ejercicios_consolidado_TOTAL.xlsx` se actualiza, `lib/data/library.ts` se puede
regenerar con un script Python (openpyxl) que:

1. Lee la hoja `Consolidado`.
2. Excluye filas con Categoría o Músculo = `Otros / No es ejercicio`.
3. Extrae el ID de video de la URL de YouTube Shorts (columna "Link 1").
4. Marca `approxMatch: true` cuando "Estado de Coincidencia" es "Aproximado (revisar)" o
   "Ambiguo (varias opciones posibles)".

## Desarrollo local

```bash
pnpm install
pnpm dev
```

Requiere Node.js compatible con Next 16 / React 19.
