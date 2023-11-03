FROM python:3.10
WORKDIR /src/app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app.py .
ENV FLASK_RUN_PORT 8000
EXPOSE 8000
CMD ["flask", "run", "--debug", "--host=0.0.0.0"]
