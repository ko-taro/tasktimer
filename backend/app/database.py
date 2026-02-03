from __future__ import annotations

import os

import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "host=localhost port=5432 dbname=tasktimer user=tasktimer password=tasktimer",
)


def get_conn():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
