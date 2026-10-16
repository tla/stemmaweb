FROM python:3.14-slim-bookworm
WORKDIR /src/app
RUN pip install Flask
COPY app.py .
ENV FLASK_RUN_PORT=8001
EXPOSE 8001
CMD ["flask", "run", "--host=0.0.0.0"]
