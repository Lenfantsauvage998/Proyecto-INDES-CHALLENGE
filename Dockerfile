FROM node:20-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY etl.py .
COPY Plantilla_Certificacion.docx .

# React build from first stage
COPY --from=frontend-build /frontend/dist ./frontend/dist/

RUN mkdir -p /data

EXPOSE 8001

CMD ["uvicorn", "backend.api:app", "--host", "0.0.0.0", "--port", "8001"]
