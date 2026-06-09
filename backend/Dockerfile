FROM python:3.12-slim
WORKDIR /code
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY alembic.ini ./alembic.ini
COPY migrations ./migrations
COPY pytest.ini ./pytest.ini

# Root bo'lmagan foydalanuvchi (xavfsizlik) + doimiy uploads papkasi
RUN useradd -m -u 1000 appuser \
    && mkdir -p /data/uploads/images \
    && chown -R appuser:appuser /data /code
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
