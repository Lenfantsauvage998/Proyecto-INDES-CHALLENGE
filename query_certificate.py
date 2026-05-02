"""
CLI query tool for teacher work certificates.

Usage:
  python query_certificate.py --profesor "Juan Perez"
  python query_certificate.py --profesor "Juan Perez" --ciclo 2024-1
  python query_certificate.py --ciclo 2024-1
  python query_certificate.py --ciclo 2024-1 --export csv
  python query_certificate.py --ciclo 2024-1 --export excel
  python query_certificate.py --list-profesores
  python query_certificate.py --list-ciclos

Flags:
  --profesor NAME   Filter by professor name (partial, case-insensitive)
  --ciclo   PERIOD  Filter by ciclo lectivo (e.g. 2024-1)
  --export  FORMAT  Export to csv or excel (saved in output/)
  --list-profesores Show all unique professor names in the DB
  --list-ciclos     Show all unique ciclos in the DB
"""

import argparse
import sqlite3
import sys
from pathlib import Path

BASE_DIR = Path(__file__).parent
DB_PATH = BASE_DIR / "output" / "teaching.db"

CERT_COLUMNS = [
    "profesor",
    "componente",
    "materia",
    "ciclo_lectivo",
    "horas_semestre",
    "departamento",
    "fecha_inicio",
    "fecha_fin",
]

DISPLAY_HEADERS = [
    "Profesor",
    "Componente",
    "Materia",
    "Periodo Electivo",
    "Horas Semestre",
    "Departamento",
    "Fecha Inicio",
    "Fecha Fin",
]


def get_conn():
    if not DB_PATH.exists():
        print(f"ERROR: DB not found at {DB_PATH}")
        print("Run 'python etl.py' first to generate the database.")
        sys.exit(1)
    return sqlite3.connect(DB_PATH)


def build_query(profesor: str | None, ciclo: str | None) -> tuple[str, list]:
    cols = ", ".join(CERT_COLUMNS)
    sql = f"SELECT {cols} FROM certificados WHERE 1=1"
    params: list = []
    if profesor:
        sql += " AND LOWER(profesor) LIKE ?"
        params.append(f"%{profesor.strip().lower()}%")
    if ciclo:
        sql += " AND ciclo_lectivo LIKE ?"
        params.append(f"%{ciclo}%")
    sql += " ORDER BY profesor, ciclo_lectivo, materia"
    return sql, params


def print_table(rows: list[tuple], headers: list[str]):
    try:
        from tabulate import tabulate
        print(tabulate(rows, headers=headers, tablefmt="grid", floatfmt=".1f"))
    except ImportError:
        # fallback: simple pipe table
        widths = [max(len(str(h)), max((len(str(r[i])) for r in rows), default=0)) for i, h in enumerate(headers)]
        sep = "+" + "+".join("-" * (w + 2) for w in widths) + "+"
        fmt = "|" + "|".join(f" {{:<{w}}} " for w in widths) + "|"
        print(sep)
        print(fmt.format(*headers))
        print(sep)
        for row in rows:
            print(fmt.format(*[str(v) if v is not None else "" for v in row]))
        print(sep)


def export_results(rows: list[tuple], headers: list[str], fmt: str, profesor: str | None, ciclo: str | None):
    import pandas as pd

    df = pd.DataFrame(rows, columns=headers)
    out_dir = BASE_DIR / "output"
    out_dir.mkdir(exist_ok=True)

    tag = "_".join(filter(None, [profesor.replace(" ", "_") if profesor else None, ciclo]))
    if not tag:
        tag = "all"

    if fmt == "csv":
        path = out_dir / f"certificado_{tag}.csv"
        df.to_csv(path, index=False, encoding="utf-8-sig")
        print(f"Exported CSV -> {path}")
    elif fmt == "excel":
        path = out_dir / f"certificado_{tag}.xlsx"
        with pd.ExcelWriter(path, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Certificado")
            ws = writer.sheets["Certificado"]
            for col_cells in ws.columns:
                max_len = max(len(str(c.value)) if c.value else 0 for c in col_cells)
                ws.column_dimensions[col_cells[0].column_letter].width = min(max_len + 4, 50)
        print(f"Exported Excel -> {path}")
    else:
        print(f"Unknown export format: {fmt}")
        sys.exit(1)


def list_values(column: str, label: str):
    conn = get_conn()
    rows = conn.execute(f"SELECT DISTINCT {column} FROM certificados ORDER BY {column}").fetchall()
    conn.close()
    print(f"\n{label} ({len(rows)} found):")
    for (v,) in rows:
        print(f"  {v}")


def main():
    parser = argparse.ArgumentParser(description="Query teaching certificates from DB")
    parser.add_argument("--profesor", help="Professor name (partial match)")
    parser.add_argument("--ciclo", help="Ciclo lectivo (e.g. 2024-1)")
    parser.add_argument("--export", choices=["csv", "excel"], help="Export format")
    parser.add_argument("--list-profesores", action="store_true", help="List all professors")
    parser.add_argument("--list-ciclos", action="store_true", help="List all ciclos")
    args = parser.parse_args()

    if args.list_profesores:
        list_values("profesor", "Profesores in DB")
        return

    if args.list_ciclos:
        list_values("ciclo_lectivo", "Ciclos lectivos in DB")
        return

    if not args.profesor and not args.ciclo:
        parser.print_help()
        print("\nERROR: provide at least --profesor or --ciclo")
        sys.exit(1)

    conn = get_conn()
    sql, params = build_query(args.profesor, args.ciclo)
    rows = conn.execute(sql, params).fetchall()
    conn.close()

    if not rows:
        print("No records found.")
        return

    print(f"\n{len(rows)} record(s) found.\n")

    if args.export:
        export_results(rows, DISPLAY_HEADERS, args.export, args.profesor, args.ciclo)
    else:
        print_table(rows, DISPLAY_HEADERS)


if __name__ == "__main__":
    main()
