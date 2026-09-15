#!/usr/bin/env python3
"""Puebla las tablas de referencia (sports, muscles, patterns, stimulus_types,
training_capacities, sport_profiles) con los catálogos ya confirmados contra
datos reales en docs/auditoria-02-planificacion-y-biblioteca.md (secciones
C, D, E) y con los ejemplos textuales de CLAUDE.md (§7, §8, §9 — Fase 4).

No inventa nada: los 8 patrones y los 18 músculos son exactamente los que
aparecen en ejercicios_consolidado_TOTAL.xlsx. `sports` es la lista inicial
de CLAUDE.md §7 (estructura, no lógica específica por deporte).
`training_capacities` es la unión literal de los ejemplos de §9 (lista base)
y las demandas nombradas por deporte en §8 (Fútbol/Running/Pádel/Karate) —
ningún nombre de capacidad se inventó, todos aparecen tal cual en el texto.
Los 4 `sport_profiles` (uno por deporte con ejemplo en §8) enlazan
exactamente las capacidades que ese párrafo lista, con importancia uniforme
(3/5): el CLAUDE.md no las jerarquiza entre sí, solo las enumera.

Uso:
    python3 scripts/seed_reference_data.py [--dry-run]

Reproducible: se puede correr de nuevo sin duplicar nada (upsert por
canonical_name/slug, que tienen constraint UNIQUE en el esquema).
"""

import argparse
import sys
from pathlib import Path
from urllib.parse import quote

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

# Capacidades físicas — CLAUDE.md §9 (lista base, primeras 16) + demandas
# nombradas por deporte en §8 que no estaban ya en esa lista (el resto de
# las líneas). Orden: primero §9 tal cual, después lo que agrega §8.
TRAINING_CAPACITIES = [
    "Fuerza",
    "Hipertrofia",
    "Potencia",
    "Velocidad",
    "Aceleración",
    "Desaceleración",
    "Resistencia aeróbica",
    "Resistencia anaeróbica",
    "Movilidad",
    "Estabilidad",
    "Coordinación",
    "Reacción",
    "Agilidad",
    "Técnica",
    # De §8 (demandas por deporte), no cubiertas arriba:
    "Resistencia",
    "Cambio de dirección",
    "Trabajo unilateral",
    "Umbral",
    "Economía de carrera",
    "Resistencia intermitente",
    "Desplazamiento lateral",
    "Rotación",
    "Anti-rotación",
]

# Perfiles deportivos de ejemplo — CLAUDE.md §8, un perfil por cada deporte
# que el documento describe con capacidades/demandas concretas. Los demás
# deportes de SPORTS quedan sin perfil todavía (no hay datos de origen).
SPORT_PROFILES = {
    "Fútbol": [
        "Aceleración",
        "Desaceleración",
        "Velocidad",
        "Cambio de dirección",
        "Potencia",
        "Resistencia",
        "Fuerza",
        "Trabajo unilateral",
    ],
    "Running": [
        "Resistencia aeróbica",
        "Umbral",
        "Velocidad",
        "Economía de carrera",
        "Fuerza",
        "Potencia",
    ],
    "Pádel": [
        "Desplazamiento lateral",
        "Aceleración",
        "Desaceleración",
        "Rotación",
        "Anti-rotación",
        "Potencia",
        "Coordinación",
        "Resistencia intermitente",
    ],
    "Karate": [
        "Velocidad",
        "Potencia",
        "Reacción",
        "Movilidad",
        "Coordinación",
        "Estabilidad",
        "Técnica",
    ],
}


# Actividades de ejemplo — CLAUDE.md §18, los mismos Training Items de tipo
# ACTIVITY que el documento usa como ejemplo por deporte (no ejercicios de
# gimnasio: carreras, tiempos, juegos reducidos). `activities` existe desde
# la Fase 1 pero nunca se pobló — nadie la consumía todavía.
ACTIVITIES = [
    ("5 km a ritmo determinado", "Running"),
    ("8 x 400 m", "Running"),
    ("Juego reducido 4v4", "Fútbol"),
    ("Trabajo técnico de bandeja", "Pádel"),
    ("5 x 3 min de kumite", "Karate"),
    ("60 minutos zona 2", "Ciclismo"),
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
    sports_result = db.upsert("sports", sports_rows, on_conflict="slug")
    print(f"  OK: {len(sports_result)} filas")
    sport_id_by_name = {row["name"]: row["id"] for row in sports_result}

    print(f"=== Capacidades físicas ({len(TRAINING_CAPACITIES)}) ===")
    capacities_rows = [
        {"name": c, "slug": slugify(c), "description": None} for c in TRAINING_CAPACITIES
    ]
    capacities_result = db.upsert("training_capacities", capacities_rows, on_conflict="slug")
    print(f"  OK: {len(capacities_result)} filas")
    capacity_id_by_name = {row["name"]: row["id"] for row in capacities_result}

    print(f"=== Perfiles deportivos ({len(SPORT_PROFILES)}) ===")
    # sport_profiles no tiene UNIQUE propio (solo id) — se busca por
    # sport_id+name antes de insertar para que correr esto de nuevo no
    # duplique perfiles.
    for sport_name, capacity_names in SPORT_PROFILES.items():
        sport_id = sport_id_by_name.get(sport_name)
        if not sport_id and args.dry_run:
            sport_id = f"dry-run-sport-{slugify(sport_name)}"
        if not sport_id:
            print(f"  ! Deporte '{sport_name}' no encontrado, se salta su perfil")
            continue

        profile_name = f"{sport_name} — Perfil general"
        if args.dry_run:
            print(f"  [dry-run] perfil '{profile_name}' + {len(capacity_names)} capacidades")
            continue

        existing = db.select(
            "sport_profiles",
            f"select=id&sport_id=eq.{sport_id}&name=eq.{quote(profile_name)}",
        )
        if existing:
            profile_id = existing[0]["id"]
            print(f"  {profile_name}: ya existía ({profile_id})")
        else:
            created = db.upsert(
                "sport_profiles",
                [
                    {
                        "sport_id": sport_id,
                        "name": profile_name,
                        "description": "Demandas de referencia (CLAUDE.md §8) — importancia uniforme, el documento no las jerarquiza.",
                    }
                ],
                on_conflict="id",
            )
            profile_id = created[0]["id"]
            print(f"  {profile_name}: creado ({profile_id})")

        links_rows = [
            {
                "sport_profile_id": profile_id,
                "capacity_id": capacity_id_by_name[name],
                "importance": 3,
            }
            for name in capacity_names
            if name in capacity_id_by_name
        ]
        missing = [name for name in capacity_names if name not in capacity_id_by_name]
        if missing:
            print(f"    ! capacidades no encontradas para {sport_name}: {missing}")
        result = db.upsert(
            "sport_profile_capacities", links_rows, on_conflict="sport_profile_id,capacity_id"
        )
        print(f"    {len(result)} capacidades enlazadas")

    print(f"=== Actividades de ejemplo ({len(ACTIVITIES)}) ===")
    activities_rows = [
        {
            "canonical_name": name,
            "display_name": name,
            "sport_id": sport_id_by_name.get(sport_name),
            "status": "active",
        }
        for name, sport_name in ACTIVITIES
    ]
    result = db.upsert("activities", activities_rows, on_conflict="canonical_name")
    print(f"  OK: {len(result)} filas")

    print()
    print("Listo. No se sembró `equipment` — no hay un catálogo real confirmado")
    print("todavía en los Excel fuente (ver docs/auditoria-02...), y la regla del")
    print("proyecto es no inventar datos que la fuente no trae.")


if __name__ == "__main__":
    main()
