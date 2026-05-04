"""
ETL pipeline: PREGRADO_CONSOLIDADO_2016_2_2026_1.xlsx → output/teaching.db

Business rules:
  1.  Drop exact duplicate rows
  1b. Split full dataset into one independent DataFrame per Ciclo Lectivo
  2.  grupo_id = "ID Sección Combinada" when non-empty, else "Nº Clase"
  3.  Parse "Hora Inicio" / "Hora Final" to decimal military hours
  4.  duration = Hora Final - Hora Inicio  (clamped ≥ 0)
  5.  Sum durations per (ciclo, profesor, grupo_id) → weekly hours
  6.  weekly_hours * 16 → semester hours
"""

import os
import re
import sqlite3
import sys
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).parent
EXCEL_PATH = BASE_DIR / "PREGRADO_CONSOLIDADO_2016_2_2026_1.xlsx"
_db_env = os.environ.get("DB_PATH")
DB_PATH = Path(_db_env) if _db_env else BASE_DIR / "output" / "teaching.db"


SEMESTER_DATES = {
    "1": ("02-01", "06-30"),
    "2": ("07-01", "11-30"),
}

_HOUR_RE = re.compile(r"(\d+):(\d+):(AM|PM)", re.IGNORECASE)


def parse_hour(s: str) -> float:
    """Convert '09:00:AM' or '01:00:PM' to decimal military hour."""
    if pd.isna(s):
        return float("nan")
    m = _HOUR_RE.match(str(s).strip())
    if not m:
        raise ValueError(f"Unrecognised hour format: {s!r}")
    h, minute, meridiem = int(m.group(1)), int(m.group(2)), m.group(3).upper()
    if meridiem == "PM" and h != 12:
        h += 12
    elif meridiem == "AM" and h == 12:
        h = 0
    return h + minute / 60.0


_CICLO_RE = re.compile(r"(\d{4})-(\d)")


def derive_dates(ciclo: str):
    """'PERIODO 2024-1' or '2024-1' → ('2024-02-01', '2024-06-30')"""
    m = _CICLO_RE.search(str(ciclo))
    if not m:
        return None, None
    year, sem = m.group(1), m.group(2)
    start_m, end_m = SEMESTER_DATES.get(sem, ("02-01", "06-30"))
    return f"{year}-{start_m}", f"{year}-{end_m}"


def _transform(df: pd.DataFrame) -> pd.DataFrame:
    # ── 1. Drop exact duplicates ─────────────────────────────────────────────
    df = df.drop_duplicates().copy()

    # ── 1b. Split into independent per-semester datasets ─────────────────────
    #   Nº Clase can overlap across semesters; isolating each ciclo prevents
    #   a grupo_id in 2024-1 from colliding with the same value in 2024-2.
    semester_frames = []

    for ciclo, sem_df in df.groupby("Ciclo Lectivo", dropna=False):
        sem_df = sem_df.copy()

        # ── 2. grupo_id: ID Sección Combinada when non-empty, else Nº Clase ──
        has_combined = (
            sem_df["ID Sección Combinada"].notna()
            & (sem_df["ID Sección Combinada"].astype(str).str.strip() != "")
        )
        sem_df["grupo_id"] = sem_df["ID Sección Combinada"].where(
            has_combined, sem_df["Nº Clase"].astype(str)
        )

        # ── 2b. Dedup combined sections: same physical session = same room + time
        #   Within one ID Sección Combinada, multiple courses can share the exact
        #   same Hora Inicio / Hora Final / room — they are ONE session repeated
        #   per merged course. Keep one row; do NOT sum or hours inflate.
        combined_rows = sem_df[has_combined].drop_duplicates(
            subset=["grupo_id", "Hora Inicio", "Hora Final", "ID Instalación"]
        )
        plain_rows = sem_df[~has_combined]
        sem_df = pd.concat([combined_rows, plain_rows], ignore_index=True)

        # ── 3. Parse times → decimal military hours ───────────────────────────
        sem_df["_h_ini"] = sem_df["Hora Inicio"].apply(parse_hour)
        sem_df["_h_fin"] = sem_df["Hora Final"].apply(parse_hour)

        # ── 4. Duration per row (clamped ≥ 0) ─────────────────────────────────
        sem_df["_dur"] = (sem_df["_h_fin"] - sem_df["_h_ini"]).clip(lower=0)

        # ── Department cleanup ─────────────────────────────────────────────────
        sem_df["_dpto"] = sem_df["Descripción.1"].fillna(sem_df["Departamento"].astype(str))

        sem_df = sem_df.rename(columns={"Nombre del curso": "nombre_curso"})

        # ── 5. Aggregate: one row per (ciclo, profesor, grupo_id) ─────────────
        #    Sum durations → weekly hours; * 16 → semester hours
        cert_keys = [
            "Ciclo Lectivo",
            "grupo_id",
            "Nombre profesor",
            "Id profesor",
            "Numero documento docente",
            "Descripción Materia",
            "nombre_curso",
            "Componente Descripción",
            "_dpto",
            "Tipo dedicación",
        ]

        cert = (
            sem_df.groupby(cert_keys, dropna=False)
            .agg(
                horas_semana=("_dur", "sum"),
                num_grupos=("Nº Clase", "nunique"),
            )
            .reset_index()
        )

        cert["horas_semestre"] = cert["horas_semana"] * 16
        semester_frames.append(cert)

    cert = pd.concat(semester_frames, ignore_index=True) if semester_frames else pd.DataFrame()

    # ── Semester dates ────────────────────────────────────────────────────────
    cert[["fecha_inicio", "fecha_fin"]] = cert["Ciclo Lectivo"].apply(
        lambda c: pd.Series(derive_dates(str(c)))
    )

    # ── Final rename ──────────────────────────────────────────────────────────
    cert = cert.rename(columns={
        "Nombre profesor":          "profesor",
        "Id profesor":              "id_profesor",
        "Numero documento docente": "num_doc_docente",
        "Ciclo Lectivo":            "ciclo_lectivo",
        "Descripción Materia":      "materia",
        "Componente Descripción":   "componente",
        "_dpto":                    "departamento",
        "Tipo dedicación":          "tipo_dedicacion",
    })

    # ── 8. Merge rows with identical materia + nombre_curso ───────────────────
    #   Two different grupo_ids for the same course → one certificate entry.
    merge_keys = [
        "ciclo_lectivo",
        "profesor",
        "id_profesor",
        "num_doc_docente",
        "materia",
        "nombre_curso",
        "componente",
        "departamento",
        "tipo_dedicacion",
        "fecha_inicio",
        "fecha_fin",
    ]
    cert = (
        cert.groupby(merge_keys, dropna=False)
        .agg(
            horas_semestre=("horas_semestre", "sum"),
            num_grupos=("num_grupos", "sum"),
        )
        .reset_index()
    )

    return cert[[
        "ciclo_lectivo",
        "profesor",
        "id_profesor",
        "num_doc_docente",
        "componente",
        "materia",
        "nombre_curso",
        "horas_semestre",
        "departamento",
        "fecha_inicio",
        "fecha_fin",
        "tipo_dedicacion",
        "num_grupos",
    ]]


def run_etl_on_file(excel_path: Path, db_path: Path, append: bool = False) -> dict:
    """
    Run ETL on excel_path → db_path.
    If append=True: skip ciclos already present in DB.
    Returns summary dict.
    """
    df = pd.read_excel(excel_path, engine="openpyxl")
    cert = _transform(df)

    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)

    skipped_ciclos: list[str] = []
    new_ciclos: list[str] = []

    if append and _table_exists(conn, "certificados"):
        existing = {r[0] for r in conn.execute("SELECT DISTINCT ciclo_lectivo FROM certificados").fetchall()}
        incoming = set(cert["ciclo_lectivo"].dropna().unique())
        skipped_ciclos = sorted(existing & incoming)
        new_ciclo_set = incoming - existing
        new_ciclos = sorted(new_ciclo_set)
        cert = cert[cert["ciclo_lectivo"].isin(new_ciclo_set)]
        if_exists = "append"
    else:
        new_ciclos = sorted(cert["ciclo_lectivo"].dropna().unique().tolist())
        if_exists = "replace"

    cert.to_sql("certificados", conn, if_exists=if_exists, index=False)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_profesor ON certificados(profesor)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ciclo    ON certificados(ciclo_lectivo)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_materia  ON certificados(materia)")
    conn.commit()
    conn.close()

    return {
        "new_records": len(cert),
        "new_ciclos": new_ciclos,
        "skipped_ciclos": skipped_ciclos,
    }


def _table_exists(conn: sqlite3.Connection, name: str) -> bool:
    return bool(conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
    ).fetchone())


def run_etl():
    print(f"Reading {EXCEL_PATH.name} …")
    raw = pd.read_excel(EXCEL_PATH, engine="openpyxl")
    print(f"  Raw rows: {len(raw)}")

    cert = _transform(raw)
    print(f"  After dedup + Clase Principal filter: {len(cert)} certificate records")

    for col in ("profesor", "materia", "ciclo_lectivo", "horas_semestre"):
        n = cert[col].isna().sum()
        if n:
            print(f"  WARNING: {n} nulls in '{col}'")

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cert.to_sql("certificados", conn, if_exists="replace", index=False)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_profesor ON certificados(profesor)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ciclo    ON certificados(ciclo_lectivo)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_materia  ON certificados(materia)")
    conn.commit()
    conn.close()

    print(f"\nDone. DB saved to: {DB_PATH}")
    print(f"Table 'certificados': {len(cert)} rows")


if __name__ == "__main__":
    run_etl()
