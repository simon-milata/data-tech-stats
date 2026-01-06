from datetime import datetime

from aggregate.agg_core.utils import (
    get_date_from_key, group_keys_by_interval, pick_latest_key_per_period,
    get_latest_date_key, get_iso_year_week
)

def test_get_date_from_key():
    key = "prefix/2025/11/28/object.json"
    assert get_date_from_key(key) == datetime(2025, 11, 28).date()


def test_get_iso_year_week():
    # Standard date
    assert get_iso_year_week(datetime(2025, 11, 28).date()) == "2025-W48"

    # Edge case: Date in calendar year X but ISO year X+1
    # Dec 30, 2025 is in the first week of ISO year 2026 because Jan 1, 2026 is a Thursday
    assert get_iso_year_week(datetime(2025, 12, 30).date()) == "2026-W01"

    # Edge case: Date in calendar year X but ISO year X-1
    # Jan 1, 2021 was a Friday. The first Thursday of 2021 was Jan 7.
    # Thus, Jan 1-3, 2021 belong to the last week of ISO year 2020 (Week 53).
    assert get_iso_year_week(datetime(2021, 1, 1).date()) == "2020-W53"

    # Padding check
    assert get_iso_year_week(datetime(2025, 1, 6).date()) == "2025-W02"


def test_group_keys_by_week():
    keys = [
        "prefix/2025/11/28/object.json", "prefix/2025/11/24/object.json", 
        "prefix/2025/11/20/object.json", "prefix/2025/11/12/object.json"
    ]

    result = {
        "2025-W48": ["prefix/2025/11/28/object.json", "prefix/2025/11/24/object.json"], 
        "2025-W47": ["prefix/2025/11/20/object.json"], 
        "2025-W46": ["prefix/2025/11/12/object.json"]
    }
    assert group_keys_by_interval(keys, "weekly") == result


def test_group_keys_by_week_single_digit_week():
    keys = ["prefix/2025/01/14/object.json", "prefix/2025/01/5/object.json"]

    result = {
        "2025-W03": ["prefix/2025/01/14/object.json"], 
        "2025-W01": ["prefix/2025/01/5/object.json"]
    }
    assert group_keys_by_interval(keys, "weekly") == result


def test_pick_latest_key_per_week():
    grouped_keys = {
        "2025-W52": ["prefix/2025/12/28/object.json", "prefix/2025/12/24/object.json"], 
        "2025-W47": ["prefix/2025/11/20/object.json"], 
        "2025-W41": ["prefix/2025/10/8/object.json", "prefix/2025/10/12/object.json", "prefix/2025/10/7/object.json"]
    }

    result = {
        "2025-W52": "prefix/2025/12/28/object.json", 
        "2025-W47": "prefix/2025/11/20/object.json", 
        "2025-W41": "prefix/2025/10/12/object.json"
    }
    assert pick_latest_key_per_period(grouped_keys) == result


def test_group_keys_by_month_same_year_month():
    keys = ["prefix/2025/01/14/object.json", "prefix/2025/01/5/object.json"]

    result = {
        "2025-01": ["prefix/2025/01/14/object.json", "prefix/2025/01/5/object.json"]
    }
    assert group_keys_by_interval(keys, "monthly") == result


def test_group_keys_by_month_same_year_different_month():
    keys = [
        "prefix/2025/11/28/object.json", "prefix/2025/9/24/object.json", 
        "prefix/2025/10/20/object.json", "prefix/2025/10/12/object.json"
    ]

    result = {
        "2025-11": ["prefix/2025/11/28/object.json"], 
        "2025-09": ["prefix/2025/9/24/object.json"], 
        "2025-10": ["prefix/2025/10/20/object.json", "prefix/2025/10/12/object.json"]
    }
    assert group_keys_by_interval(keys, "monthly") == result


def test_group_keys_by_month_different_year_different_month():
    keys = [
        "prefix/2023/11/28/object.json", "prefix/2024/9/24/object.json", 
        "prefix/2024/10/20/object.json", "prefix/2025/10/12/object.json"
    ]

    result = {
        "2023-11": ["prefix/2023/11/28/object.json"], 
        "2024-09": ["prefix/2024/9/24/object.json"], 
        "2024-10": ["prefix/2024/10/20/object.json"], 
        "2025-10": ["prefix/2025/10/12/object.json"]
    }
    assert group_keys_by_interval(keys, "monthly") == result


def test_pick_latest_key_per_month():
    grouped_keys = {
        "2025-01": ["prefix/2025/01/14/object.json", "prefix/2025/01/5/object.json"]
    }

    result = {
        "2025-01": "prefix/2025/01/14/object.json"
    }
    assert pick_latest_key_per_period(grouped_keys) == result


def test_get_latest_date_key():
    keys = [
        "prefix/2025/01/01/data.json",
        "prefix/2025/01/02/data.json",
        "prefix/2025/01/03/other.json"
    ]
    assert get_latest_date_key(keys, "data.json") == "prefix/2025/01/02/data.json"


def test_get_latest_date_key_mixed_dates():
    keys = [
        "prefix/2023/12/31/data.json",
        "prefix/2024/01/01/data.json",
        "prefix/2022/01/01/data.json"
    ]
    assert get_latest_date_key(keys, "data.json") == "prefix/2024/01/01/data.json"