import pandas as pd

from aggregate_repo_stats.primary_languages import get_primary_lang_counts


def test_get_primary_lang_counts():
    data = [
        {"name": "repo-1", "main_language": "Python"},
        {"name": "repo-2", "main_language": "C++"},
        {"name": "repo-3", "main_language": "Python"}
    ]
    df = pd.DataFrame(data)
    result = {
        "Python": 2,
        "C++": 1
    }
    assert get_primary_lang_counts(df) == result
