import pandas as pd

from data_tech_stats_api.repo_comparison import create_metrics_dict, format_repo_comparison_response


def test_create_metrics_dict():
    df = pd.DataFrame({
        "name": ["repo-1", "repo-2"],
        "stars": [100, 200],
        "watchers": [10, 20],
        "forks": [5, 8],
        "open_issues": [1, 0]
    })

    result = create_metrics_dict(df)

    assert result["repo-1"] == {"stars": 100, "watchers": 10, "forks": 5, "open_issues": 1}
    assert result["repo-2"] == {"stars": 200, "watchers": 20, "forks": 8, "open_issues": 0}


def test_format_repo_comparison_response():
    historical_data = {
        "2023-02": {"repo-1": {"stars": 20}},
        "2023-01": {"repo-1": {"stars": 10}}
    }

    result = format_repo_comparison_response(historical_data)

    assert len(result) == 2
    assert result[0]["date"] == "2023-01"
    assert result[0]["repos"] == {"repo-1": {"stars": 10}}
    assert result[1]["date"] == "2023-02"
    assert result[1]["repos"] == {"repo-1": {"stars": 20}}