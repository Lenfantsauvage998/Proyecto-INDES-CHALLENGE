<div align="center">

# 📋 Sistema de Certificación Docente

**Facultad de Ingeniería · Universidad de La Sabana**

Consulta, exporta y certifica la carga docente de los profesores — desde cualquier dispositivo, sin instalaciones.

[![Live](https://img.shields.io/badge/🌐_Live-proyecto--indes--challenge.onrender.com-4F46E5?style=for-the-badge)](https://proyecto-indes-challenge.onrender.com)

![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=black)

</div>

---

## ¿Qué es esto?

Una plataforma web que permite consultar el historial completo de carga docente de los profesores de la Facultad de Ingeniería (2016–2026), exportar certificados en Excel o CSV, y visualizar paso a paso cómo se calculan las horas.

> **Nota:** La primera carga puede tardar ~30 segundos si el servidor estuvo inactivo.

---

## ✨ Funcionalidades

| Función | Descripción |
|---------|-------------|
| 🔍 **Búsqueda inteligente** | Busca profesores por nombre parcial, sin importar mayúsculas ni acentos |
| 📊 **Vista de certificados** | Tabla completa con materias, horas y departamentos por período |
| 📅 **Filtro por ciclo** | Selecciona uno, varios o todos los períodos académicos disponibles |
| 📁 **Exportación** | Descarga el certificado en `.xlsx` o `.csv` con un clic |
| 🔎 **Modo auditoría** | Visualiza los 8 pasos del cálculo de horas (pestaña ¿Cómo?) |
| 📤 **Carga de datos** | Sube un archivo Excel del consolidado pregrado para actualizar la base de datos |

---

## 🚀 Cómo usar la plataforma

### 1 · Consultar certificados

```
1. Abre la pestaña  →  Consultar
2. Selecciona los períodos académicos en el desplegable de la izquierda
3. Escribe el nombre del profesor  (parcial está bien — "Mojica", "García"...)
4. Haz clic en  Buscar
5. Revisa la tabla  ·  haz clic en  Exportar  para descargar
```

**💡 Tip:** Usa "Seleccionar todo" para buscar en todos los períodos a la vez.

---

### 2 · Cargar datos nuevos

```
1. Abre la pestaña  →  Cargar Datos
2. Arrastra o selecciona el archivo Excel del consolidado pregrado
3. El sistema procesa en segundo plano y notifica cuando termina
4. Si el período ya existe, te avisa antes de sobrescribir
```

---

### 3 · Auditar un cálculo

La pestaña **¿Cómo?** muestra los 8 pasos del pipeline de transformación:

| Paso | Descripción |
|------|-------------|
| 1 | Datos crudos del Excel |
| 2 | Eliminación de duplicados exactos |
| 3 | Aislamiento por semestre |
| 4 | Asignación de `grupo_id` |
| 5 | Dedup de secciones combinadas |
| 6 | Parseo de horas + duración |
| 7 | Agregación × 16 semanas |
| 8 | Fusión de cursos duplicados |

---

## 🏗️ Arquitectura

```
Usuario (navegador)
       │
       ▼
  Render.com
  ┌─────────────────────────────────────────┐
  │  React SPA  (Vite + TypeScript)         │
  │      Consultar · Cargar · ¿Cómo?        │
  │                  │                      │
  │            FastAPI (Python)             │
  │  /api/stats · /professors · /export     │
  └─────────────────────────────────────────┘
               │
               ▼
       Neon PostgreSQL
       ├── certificados   (6,724 registros · 555 profesores · 20 ciclos)
       └── raw_rows       (filas pre-transformación para auditoría)

  UptimeRobot  →  ping /api/stats cada 5 min  →  servidor siempre activo
```

---

## 📦 Stack técnico

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | Python 3.11 + FastAPI + uvicorn |
| Base de datos | Neon PostgreSQL (free tier · 10 GB) |
| ETL | pandas + python-calamine |
| Deploy | Render.com (Docker, free tier) |
| Keep-alive | UptimeRobot (ping cada 5 min) |

---

## 📁 Estructura del proyecto

```
Projecto ISSE/
├── backend/
│   └── api.py              # FastAPI — todos los endpoints REST
├── frontend/
│   └── src/
│       ├── components/     # Componentes React
│       ├── pages/          # Consultar, Cargar, Cómo
│       └── lib/            # Utilidades y tipos
├── etl.py                  # Pipeline Excel → PostgreSQL
├── requirements.txt        # Dependencias Python
├── Dockerfile              # Build multi-stage (Node 20 + Python 3.11)
└── render.yaml             # Config de despliegue en Render
```

---

## 🔑 Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string de Neon PostgreSQL |
| `PORT` | Puerto de la aplicación (default: `8001`) |

---

## 🗄️ Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/stats` | Totales: registros, profesores, ciclos |
| `GET` | `/api/ciclos` | Lista de períodos académicos disponibles |
| `GET` | `/api/professors?q=nombre` | Búsqueda de profesores |
| `GET` | `/api/certificates?profesor=...&ciclos=...` | Carga docente de un profesor |
| `GET` | `/api/export?profesor=...&format=excel` | Exporta certificado en Excel o CSV |
| `POST` | `/api/upload` | Sube y procesa un archivo Excel (ETL) |
| `DELETE` | `/api/ciclo/{id}` | Elimina todos los registros de un período |
| `DELETE` | `/api/db` | Vacía la base de datos completa |

---

<div align="center">
  <sub>Facultad de Ingeniería · Universidad de La Sabana · 2016–2026</sub>
</div>
