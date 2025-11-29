from datetime import datetime

from repo_counts_api.utils import get_date_from_key, group_keys_by_week, pick_latest_key_per_week


def test_get_date_from_key():
    key = "prefix/2025/11/28/object.json"
    assert get_date_from_key(key) == datetime(2025, 11, 28).date()


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
    assert group_keys_by_week(keys) == result


def test_group_keys_by_week_single_digit_week():
    keys = ["prefix/2025/01/14/object.json", "prefix/2025/01/5/object.json"]

    result = {
        "2025-W03": ["prefix/2025/01/14/object.json"], 
        "2025-W01": ["prefix/2025/01/5/object.json"]
    }
    assert group_keys_by_week(keys) == result


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
    assert pick_latest_key_per_week(grouped_keys) == result