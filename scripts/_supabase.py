"""Helper mínimo para hablar con la REST API de Supabase (PostgREST) usando
solo la librería estándar de Python — sin instalar `requests` ni nada nuevo,
para que estos scripts sean reproducibles sin depender de un entorno armado
a mano.

Usa la service_role key: bypassea RLS a propósito (estos scripts son el
"service_role" que puebla catálogos y la biblioteca, tal como describe
docs/auditoria-03-arquitectura-objetivo.md sección F — nunca se corren
desde el cliente).

Lee las credenciales de `.env.local` en la raíz del repo (o de variables de
entorno ya exportadas, que tienen prioridad).
"""

import json
import os
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def _load_env_local() -> dict:
    env_path = REPO_ROOT / ".env.local"
    values = {}
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            values[key.strip()] = value.strip()
    return values


def get_credentials() -> tuple[str, str]:
    env = _load_env_local()
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit(
            "Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. "
            "Corré esto desde la raíz del repo con .env.local presente, o "
            "exportá las variables antes de correr el script."
        )
    return url.rstrip("/"), key


class SupabaseRest:
    def __init__(self, dry_run: bool = False):
        self.base_url, self.service_role_key = get_credentials()
        self.dry_run = dry_run

    def upsert(self, table: str, rows: list[dict], on_conflict: str) -> list[dict]:
        """Upsert (insert o actualiza si ya existe) vía PostgREST.
        Devuelve las filas resultantes (con sus id) para poder referenciarlas."""
        if not rows:
            return []
        if self.dry_run:
            print(f"  [dry-run] upsert {len(rows)} fila(s) en {table} (on_conflict={on_conflict})")
            return [{**row, "id": f"dry-run-{table}-{i}"} for i, row in enumerate(rows)]

        url = f"{self.base_url}/rest/v1/{table}?on_conflict={on_conflict}"
        body = json.dumps(rows).encode("utf-8")
        req = urllib.request.Request(url, data=body, method="POST")
        req.add_header("apikey", self.service_role_key)
        req.add_header("Authorization", f"Bearer {self.service_role_key}")
        req.add_header("Content-Type", "application/json")
        req.add_header("Prefer", "resolution=merge-duplicates,return=representation")

        try:
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8")
            raise SystemExit(f"Error {e.code} al insertar en {table}: {detail}") from e

    def select(self, table: str, params: str = "select=*") -> list[dict]:
        url = f"{self.base_url}/rest/v1/{table}?{params}"
        req = urllib.request.Request(url, method="GET")
        req.add_header("apikey", self.service_role_key)
        req.add_header("Authorization", f"Bearer {self.service_role_key}")
        try:
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8")
            raise SystemExit(f"Error {e.code} al leer {table}: {detail}") from e
