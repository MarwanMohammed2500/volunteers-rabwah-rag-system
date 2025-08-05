FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir streamlit

COPY .. .

CMD ["streamlit", "run", "admin_ui.py", "--server.port=8501", "--server.baseUrlPath=/admin"]