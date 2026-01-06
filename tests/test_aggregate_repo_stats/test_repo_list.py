import pandas as pd

from aggregate.agg_core.repo_list import get_repo_list_dict


def test_get_repo_list_dict():
    data = {
        "id": ["1", "2"],
        "name": ["repo-1", "repo-2"],
        "stars": [100, 200],
        "other": ["ignore", "ignore"]
    }
    df = pd.DataFrame(data)
    columns_to_keep = ["id", "name", "stars"]
    expected = [
        {"id": "1", "name": "repo-1", "stars": 100},
        {"id": "2", "name": "repo-2", "stars": 200}
    ]
    assert get_repo_list_dict(df, columns_to_keep) == expected
