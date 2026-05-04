FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY etl.py .
COPY output/teaching.db ./seed/teaching.db

COPY frontend/dist ./frontend/dist/

RUN mkdir -p /data

EXPOSE 8001

CMD ["uvicorn", "backend.api:app", "--host", "0.0.0.0", "--port", "8001"]
