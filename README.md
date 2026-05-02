# ISSE — Sistema de Certificación Docente

**Instituto de Enseñanza Superior** — Teacher Work Certificate Management System (2016–2026)

A modern full-stack application for managing, querying, and exporting teaching work certificates for professors across multiple academic periods (semesters).

## Overview

ISSE helps faculty administrators:
- Upload and manage teaching data across 20+ academic periods
- Query professor work certificates by name and semester
- Export certified hours in Excel and CSV formats
- Track and validate teaching load per professor per semester

## Tech Stack

### Frontend
- **React 19** — UI library with hooks
- **TypeScript 6** — Type-safe component development
- **Vite 8** — Lightning-fast build tooling
- **Tailwind CSS 3** — Utility-first styling
- **Lucide React** — SVG icon library
- **Radix UI** — Headless component primitives (tabs, labels, select, slot)
- **Framer Motion** — Animation library
- **Class Variance Authority** — Type-safe CSS class composition

### Backend
- **FastAPI 0.110+** — Modern async Python web framework
- **Uvicorn 0.29+** — ASGI server
- **SQLite 3** — Embedded relational database
- **Pandas 2.0+** — Data transformation & aggregation
- **OpenPyXL 3.1+** — Excel file generation & parsing
- **Tabulate 0.9+** — CLI table formatting

## Features

### Data Upload
- **Multi-period support** — Load Excel files with teaching data
- **Duplicate prevention** — Automatic conflict detection
- **Incremental loading** — Append new semesters without overwriting
- **Period management** — View loaded semesters, delete individual periods or entire database

### Query Interface
- **Multi-semester filtering** — Select 1+ academic periods
- **Professor search** — Autocomplete with partial name matching (280ms debounce)
- **Keyboard navigation** — Arrow keys, Enter, Escape in search
- **Live results** — Table displays teaching load by course and semester

### Export
- **Excel format** — Formatted with professor header, semester grouping, bold headers
- **CSV format** — Tab-separated, portable
- **Dynamic filtering** — Export based on current query parameters

## Project Structure

```
Projecto ISSE/
├── frontend/                    # React + TypeScript UI
│   ├── src/
│   │   ├── App.tsx             # Main layout, tab routing
│   │   ├── components/
│   │   │   ├── QuerySection.tsx    # Search & results view
│   │   │   ├── CertificateTable.tsx # Results table with export
│   │   │   ├── UploadSection.tsx    # File upload & DB management
│   │   │   ├── Toast.tsx           # Toast notifications
│   │   │   └── Header.tsx          # Page header
│   │   ├── lib/utils.ts        # CSS utilities (cn)
│   │   └── main.tsx            # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.js
│
├── backend/
│   ├── api.py                  # FastAPI endpoints & server
│   └── [proxy → http://localhost:8001]
│
├── etl.py                      # Excel → SQLite pipeline
├── query_certificate.py        # CLI query tool
├── requirements.txt            # Python dependencies
└── output/
    └── teaching.db            # SQLite database
```

## Installation

### Prerequisites
- Node.js 18+ (for frontend)
- Python 3.9+ (for backend)

### Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run ETL to initialize database (optional)
python etl.py
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev    # Start dev server on http://localhost:5173
```

## Running the Application

### 1. Start the Backend
```bash
# From project root
uvicorn backend.api:app --reload --port 8001
```
Backend listens on `http://localhost:8001`

### 2. Start the Frontend (in a new terminal)
```bash
cd frontend
npm run dev
```
Frontend runs on `http://localhost:5173` with proxy to backend

### 3. Open in Browser
```
http://localhost:5173
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ciclos` | List all loaded academic periods |
| GET | `/api/professors` | Autocomplete professor names (query: `q`, `ciclos`) |
| GET | `/api/certificates` | Query certificates (query: `profesor`, `ciclos`) |
| GET | `/api/stats` | Database summary stats |
| POST | `/api/upload` | Upload Excel file, run ETL |
| DELETE | `/api/db` | Wipe entire database |
| DELETE | `/api/ciclos/{ciclo_lectivo}` | Delete single period |
| GET | `/api/export` | Export results (query: `formato`, `profesor`, `ciclos`) |

## ETL Pipeline (etl.py)

Transforms Excel source (`PREGRADO_CONSOLIDADO_*.xlsx`) → SQLite database.

**Business Rules:**
1. Drop exact duplicate rows
2. Split dataset by `Ciclo Lectivo` (academic period)
3. `grupo_id` = "ID Sección Combinada" when non-empty, else "Nº Clase"
4. Parse time formats ("HH:MM:AM/PM") to decimal military hours
5. Calculate duration per class session (end – start, clamped ≥ 0)
6. Aggregate by (ciclo, profesor, grupo_id) → weekly hours
7. Multiply by 16 weeks → semester hours
8. Merge rows with identical (materia, nombre_curso, profesor)

**Output Schema:**
```sql
CREATE TABLE certificados (
  ciclo_lectivo TEXT,
  profesor TEXT,
  id_profesor TEXT,
  num_doc_docente TEXT,
  componente TEXT,
  materia TEXT,
  nombre_curso TEXT,
  horas_semestre REAL,
  departamento TEXT,
  fecha_inicio TEXT,
  fecha_fin TEXT,
  tipo_dedicacion TEXT,
  num_grupos INTEGER
);
```

## Database Management

### Reset Everything
In **Cargar Datos** tab, expand "Semestres en la base de datos" and click **"Eliminar base de datos"** → confirm.

### Delete One Period
Click the **×** on any semester chip → confirm to remove only that period's records.

### Upload New Data
Drag/drop or select Excel file → click **"Procesar y Cargar"** → see new semesters added.

## Development

### Lint Frontend
```bash
cd frontend
npm run lint
```

### Build Frontend (production)
```bash
cd frontend
npm run build
```

### CLI Tool (Python)
```bash
# List all professors
python query_certificate.py --list-profesores

# List all periods
python query_certificate.py --list-ciclos

# Query by professor + period
python query_certificate.py --profesor "Juan Perez" --ciclo 2024-1

# Export CSV
python query_certificate.py --profesor "Juan Perez" --export csv

# Export Excel
python query_certificate.py --ciclo 2024-1 --export excel
```

## Data Flow

```
Excel File
    ↓
[Upload UI] → /api/upload
    ↓
[Backend] Run etl.py (append mode)
    ↓
[SQLite] teaching.db updated
    ↓
[Frontend] /api/ciclos refreshes semester list
    ↓
[Query UI] Autocomplete & results enabled
    ↓
[Export] CSV/Excel via /api/export
```

## Key Features Explained

### Duplicate Prevention
- On upload: Pre-scan file for ciclos (`Ciclo Lectivo` column)
- If any ciclo already exists in DB → 409 conflict, list conflicting periods
- User can cancel and select different file

### Autocomplete
- Debounced 280ms while typing
- Scoped to selected semester(s) if filtering by ciclo
- Keyboard navigation: ↑/↓ to move, Enter to select, Esc to close

### Multi-Semester Selection
- Checkbox dropdown with "Select all" toggle
- Selected ciclos persist in search parameters
- Results show Semestre column only when 2+ periods selected

### Excel Export Format
- Professor header: name + document ID
- Table: SEMESTRE | COMPONENTE | ASIGNATURA | SESIONES | DEPARTAMENTO | FECHA INICIO | FECHA FIN
- Merged SEMESTRE cells per ciclo group
- Bold gray headers, monospace hours

## Troubleshooting

### Port 8001 already in use
```bash
# Kill process on port 8001
lsof -i :8001
kill -9 <PID>
```

### Frontend won't connect to backend
- Check backend is running: `http://localhost:8001/api/ciclos`
- Check `vite.config.ts` proxy target

### Excel import fails
- Ensure column names match exactly (case-sensitive)
- Required: "Ciclo Lectivo", "Hora Inicio", "Hora Final", "Nº Clase"
- File must be `.xlsx` or `.xls` format

### Database corrupted
- Delete `output/teaching.db` and re-upload files via UI
- Or use `/api/db` endpoint

## Authors
**Facultad de Ingeniería** — Sistema de Certificación Docente (2016–2026)

## License
[Add your license here]
