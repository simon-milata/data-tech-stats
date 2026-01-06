from datetime import datetime, timedelta, timezone
import time
import logging
import functools


def timer(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            duration = time.perf_counter() - start
            logging.debug(f"'{func.__name__}' took {duration:.2f}s.")
    return wrapper


def get_seconds_until_midnight():
    now = datetime.now(timezone.utc)
    # UTC+1
    tz = timezone(timedelta(hours=1))
    now_tz = now.astimezone(tz)
    midnight = (now_tz + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return int((midnight - now_tz).total_seconds())