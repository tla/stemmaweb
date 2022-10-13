"""Constant values to be reused throughout the application."""
from pathlib import Path

STATIC_FOLDER = (Path(__file__).parent / "static").resolve()
TEMPLATE_FOLDER = (Path(__file__).parent / "templates").resolve()
