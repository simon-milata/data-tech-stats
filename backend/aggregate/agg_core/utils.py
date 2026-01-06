from datetime import datetime, date
from collections import defaultdict
import logging
from typing import Literal
from io import BytesIO

import pandas as pd


def get_object_keys(objects: list[dict]) -> list:
    return [obj["Key"] for obj in objects]


def filter_object_keys(keys: list[str], suffix: str) -> list[str]:
    return [key for key in keys if key.endswith(suffix)]


def get_date_from_key(key: str) -> date:
    year, month, day = key.split("/")[1:-1:]
    return datetime(int(year), int(month), int(day)).date()


def get_iso_year_week(date: date) -> str:
    """Formats a date into iso {year}-{week} (2025-W48)."""
    iso_year, iso_week, _ = date.isocalendar()
    year_period = f"{iso_year}-W{iso_week:02}"
    return year_period


def group_keys_by_interval(keys: list[str], interval: Literal["weekly", "monthly"]) -> dict[str, list[str]]:
    """Groups S3 keys by period (month / week)"""
    grouped_dates = defaultdict(list)
    for key in keys:
        date = get_date_from_key(key)
        if interval == "weekly":
            year_period = get_iso_year_week(date)
        elif interval == "monthly":
            year_period = f"{date.year}-{date.month:02}"
        grouped_dates[year_period].append(key)
    return grouped_dates


def pick_latest_key_per_period(grouped_keys: dict[str, list[str]]) -> dict[str, str]:
    """Picks keys with the latest date for each group"""
    latest_key_per_period = {}
    for key, value in grouped_keys.items():
        latest_key = max(value, key=get_date_from_key)
        latest_key_per_period[key] = latest_key
    return latest_key_per_period


def parse_parquet(obj) -> pd.DataFrame:
    """Reads parquet S3 object and returns table as pandas DataFrame"""
    logging.debug("Parsing parquet object.")
    body = obj["Body"].read()
    return pd.read_parquet(BytesIO(body))


def get_latest_date_key(keys: list[str], suffix: str) -> str:
    """Finds the key with the latest date for the suffix"""
    latest = None
    latest_key = None

    for key in keys:
        if not key.endswith(suffix):
            continue

        parts = key.split("/")
        y, m, d = map(int, parts[1:4])
        current = date(y, m, d)

        if latest is None or current > latest:
            latest = current
            latest_key = key

    return latest_key
