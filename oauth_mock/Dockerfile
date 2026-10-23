FROM python:3.14-slim-bookworm
WORKDIR /src/app
RUN pip install Flask
COPY app.py .
ENV FLASK_RUN_PORT=8002
EXPOSE 8002
CMD ["flask", "run", "--host=0.0.0.0"]
