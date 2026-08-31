#!/usr/bin/env python3
"""Puebla las tablas de referencia (sports, muscles, patterns, stimulus_types)
con los catálogos ya confirmados contra datos reales en
docs/auditoria-02-planificacion-y-biblioteca.md (secciones C, D, E).

No inventa nada: los 8 patrones y los 18 músculos son exactamente los que
aparecen en ejercicios_consolidado_TOTAL.xlsx. `sports` es la lista inicial
de CLAUDE.md §7 (estructura, no lógica específica por deporte).

Uso:
    python3 scripts/seed_reference_data.py [--dry-run]

Reproducible: se puede correr de nuevo sin duplicar nada (upsert por
canonical_name/slug, que tienen constraint UNIQUE en el esquema).
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _supabase import SupabaseRest  # noqa: E402

# Los 8 patrones reales (Auditoría 2 sección C). Grafía canónica: la que usa
# ejercicios_consolidado_TOTAL.xlsx (singular, con espacio) — ver Auditoría 3
# sección J.1 sobre unificar la grafía inconsistente de la planilla de plan.
PATTERNS = [
    "Empuje",
    "Tracción",
    "Dom. Rodilla",
    "Dom. Cadera",
    "A. Empuje",
    "A. Tracción",
    "A. Rodilla",
    "A. Cadera",
]

# Los 18 músculos reales (Auditoría 2 sección D), orden alfabético.
MUSCLES = [
    "Abdominales/Core",
    "Aductores",
    "Antebrazo/Muñeca",
    "Bíceps",
    "Cardio",
    "Cuerpo Completo",
    "Cuádriceps",
    "Espalda",
    "Espalda Baja/Lumbar",
    "Flexores de Cadera",
    "Glúteos",
    "Hombros",
    "Isquiotibiales",
    "Movilidad General",
    "Pantorrillas/Tobillo",
    "Pecho",
    "Piernas (Potencia/Pliometría)",
    "Tríceps",
]

# Las 16 "Categorías" de Excel 2 menos los 8 patrones de arriba = los 8 tipos
# de estímulo reales (Auditoría 2 sección E / Auditoría 3 sección C).
STIMULUS_TYPES = [
    "Fuerza",
    "Movilidad",
    "Pliometría",
    "Cardio",
    "Activación - Cadera/Core (Estabilidad)",
    "Activación - Muñeca/Antebrazo",
    "Activación - Calentamiento General",
    "Activación - Hombro/Manguito Rotador",
]

# Lista inicial de deportes de CLAUDE.md §7 — solo estructura, sin lógica
# específica por deporte en el MVP.
SPORTS = [
    "General",
    "Fútbol",
    "Running",
    "Pádel",
    "Karate",
    "Ciclismo",
    "Natación",
    "Tenis",
    "Rugby",
    "Básquet",
    "Vóley",
    "Triatlón",
]


def slugify(name: str) -> str:
    import re
    import unicodedata

    normalized = unicodedata.normalize("NFD", name)
    without_accents = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    slug = without_accents.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="No escribe nada, solo muestra qué haría")
    args = parser.parse_args()

    db = SupabaseRest(dry_run=args.dry_run)

    print(f"=== Patrones ({len(PATTERNS)}) ===")
    patterns_rows = [
        {"canonical_name": p, "display_name": p, "sort_order": i} for i, p in enumerate(PATTERNS)
    ]
    result = db.upsert("patterns", patterns_rows, on_conflict="canonical_name")
    print(f"  OK: {len(result)} filas")

    print(f"=== Músculos ({len(MUSCLES)}) ===")
    muscles_rows = [
        {"canonical_name": m, "display_name": m, "sort_order": i} for i, m in enumerate(MUSCLES)
    ]
    result = db.upsert("muscles", muscles_rows, on_conflict="canonical_name")
    print(f"  OK: {len(result)} filas")

    print(f"=== Tipos de estímulo ({len(STIMULUS_TYPES)}) ===")
    stimulus_rows = [{"canonical_name": s, "display_name": s} for s in STIMULUS_TYPES]
    result = db.upsert("stimulus_types", stimulus_rows, on_conflict="canonical_name")
    print(f"  OK: {len(result)} filas")

    print(f"=== Deportes ({len(SPORTS)}) ===")
    sports_rows = [{"name": s, "slug": slugify(s), "status": "active"} for s in SPORTS]
    result = db.upsert("sports", sports_rows, on_conflict="slug")
    print(f"  OK: {len(result)} filas")

    print()
    print("Listo. No se sembró `equipment` — no hay un catálogo real confirmado")
    print("todavía en los Excel fuente (ver docs/auditoria-02...), y la regla del")
    print("proyecto es no inventar datos que la fuente no trae.")


if __name__ == "__main__":
    main()
