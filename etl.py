"""
ETL pipeline: PREGRADO_CONSOLIDADO_2016_2_2026_1.xlsx → PostgreSQL (via SQLAlchemy)

Business rules:
  1.  Drop exact duplicate rows
  1b. Split full dataset into one independent DataFrame per Ciclo Lectivo
  2.  grupo_id = "ID Sección Combinada" when non-empty, else "Nº Clase"
  3.  Parse "Hora Inicio" / "Hora Final" to decimal military hours
  4.  duration = Hora Final - Hora Inicio  (clamped ≥ 0)
  5.  Sum durations per (ciclo, profesor, grupo_id) → weekly hours
  6.  weekly_hours * 16 → semester hours
"""

import gc
import hashlib
import os
import re
import sys
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL", "")

BASE_DIR = Path(__file__).parent
# DB_PATH kept for backward compat / local fallback only
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


def _row_hash(row) -> str:
    return hashlib.md5("|".join(str(v) for v in row).encode()).hexdigest()


def _save_raw_rows(df: pd.DataFrame, engine, if_exists: str) -> None:
    """Store pre-transform Excel rows in raw_rows table. Enables debug without Excel file."""
    col_map = {
        "Nombre profesor":        "nombre_profesor",
        "Ciclo Lectivo":          "ciclo_lectivo_raw",
        "Nº Clase":               "num_clase",
        "ID Sección Combinada":   "id_seccion_combinada",
        "Hora Inicio":            "hora_inicio",
        "Hora Final":             "hora_final",
        "Clase Principal":        "clase_principal",
        "Descripción Materia":    "descripcion_materia",
        "Nombre del curso":       "nombre_curso",
        "Componente Descripción": "componente_desc",
        "Tipo dedicación":        "tipo_dedicacion",
        "Id profesor":            "id_profesor",
        "Descripción.1":          "descripcion_1",
    }
    optional_map = {
        "Día":            "dia",
        "Dia":            "dia",
        "ID Instalación": "id_instalacion",
        "ID Instalacion": "id_instalacion",
    }
    raw = pd.DataFrame()
    for excel_col, db_col in col_map.items():
        raw[db_col] = df[excel_col] if excel_col in df.columns else None
    seen: set = set()
    for excel_col, db_col in optional_map.items():
        if db_col not in seen and excel_col in df.columns:
            raw[db_col] = df[excel_col]
            seen.add(db_col)
    if "dia" not in seen:
        raw["dia"] = None
    if "id_instalacion" not in seen:
        raw["id_instalacion"] = None
    raw["ciclo_lectivo"] = raw["ciclo_lectivo_raw"].astype(str)
    raw["row_hash"] = [_row_hash(row) for row in df.itertuples(index=False)]
    raw.to_sql("raw_rows", engine, if_exists=if_exists, index=False)
    with engine.connect() as c:
        c.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_raw_rows_ciclo_prof "
            "ON raw_rows(ciclo_lectivo, nombre_profesor)"
        ))
        c.commit()
    del raw


def _table_exists(engine, name: str) -> bool:
    with engine.connect() as c:
        return bool(c.execute(
            text("SELECT 1 FROM information_schema.tables WHERE table_name = :n"),
            {"n": name},
        ).fetchone())


def run_etl_on_file(excel_path: Path, db_path=None, append: bool = False) -> dict:
    """
    Run ETL on excel_path → PostgreSQL (DATABASE_URL).
    db_path is ignored (kept for backward compat).
    If append=True: skip ciclos already present in DB.
    Returns summary dict.
    """
    engine = create_engine(DATABASE_URL)
    df = pd.read_excel(excel_path, engine="calamine")

    skipped_ciclos: list[str] = []
    new_ciclos: list[str] = []

    if append and _table_exists(engine, "certificados"):
        with engine.connect() as c:
            existing = {r[0] for r in c.execute(
                text("SELECT DISTINCT ciclo_lectivo FROM certificados")
            ).fetchall()}
        incoming = set(df["Ciclo Lectivo"].astype(str).dropna().unique())
        skipped_ciclos = sorted(existing & incoming)
        new_ciclo_set  = incoming - existing
        new_ciclos     = sorted(new_ciclo_set)
        df_new = df[df["Ciclo Lectivo"].astype(str).isin(new_ciclo_set)].copy()
        raw_if_exists  = "append"
        cert_if_exists = "append"
    else:
        df_new = df.copy()
        new_ciclos     = sorted(df_new["Ciclo Lectivo"].astype(str).dropna().unique().tolist())
        raw_if_exists  = "replace"
        cert_if_exists = "replace"

    del df; gc.collect()

    _save_raw_rows(df_new, engine, raw_if_exists)

    cert = _transform(df_new)
    del df_new; gc.collect()

    cert.to_sql("certificados", engine, if_exists=cert_if_exists, index=False)
    with engine.connect() as c:
        c.execute(text("CREATE INDEX IF NOT EXISTS idx_profesor ON certificados(profesor)"))
        c.execute(text("CREATE INDEX IF NOT EXISTS idx_ciclo    ON certificados(ciclo_lectivo)"))
        c.execute(text("CREATE INDEX IF NOT EXISTS idx_materia  ON certificados(materia)"))
        c.commit()

    return {
        "new_records": len(cert),
        "new_ciclos": new_ciclos,
        "skipped_ciclos": skipped_ciclos,
    }


def run_etl():
    if len(sys.argv) < 2:
        print("Usage: python etl.py <path-to-excel.xlsx>")
        print(f"Requires DATABASE_URL env var pointing to PostgreSQL.")
        sys.exit(1)
    excel_path = Path(sys.argv[1])
    if not excel_path.exists():
        print(f"File not found: {excel_path}")
        sys.exit(1)

    print(f"Reading {excel_path.name} …")
    raw = pd.read_excel(excel_path, engine="calamine")
    print(f"  Raw rows: {len(raw)}")

    cert = _transform(raw)
    print(f"  After transform: {len(cert)} certificate records")

    for col in ("profesor", "materia", "ciclo_lectivo", "horas_semestre"):
        n = cert[col].isna().sum()
        if n:
            print(f"  WARNING: {n} nulls in '{col}'")

    engine = create_engine(DATABASE_URL)
    cert.to_sql("certificados", engine, if_exists="replace", index=False)
    with engine.connect() as c:
        c.execute(text("CREATE INDEX IF NOT EXISTS idx_profesor ON certificados(profesor)"))
        c.execute(text("CREATE INDEX IF NOT EXISTS idx_ciclo    ON certificados(ciclo_lectivo)"))
        c.execute(text("CREATE INDEX IF NOT EXISTS idx_materia  ON certificados(materia)"))
        c.commit()

    print(f"\nDone. {len(cert)} rows loaded to PostgreSQL.")


if __name__ == "__main__":
    run_etl()
