import pandas as pd
from aggregate_repo_stats.agg_core.repo_comparison import append_to_repo_history, get_repo_comparison_data


def test_append_to_repo_history_new_repo():
    agg_data = {}
    repo_id = 1
    repo_name = "test-repo"
    record = {
        "date": "2023-01-01",
        "stars": 100,
        "forks": 10,
        "size": 500,
        "open_issues": 5
    }
    
    append_to_repo_history(agg_data, repo_id, repo_name, record)
    
    assert repo_id in agg_data
    assert agg_data[repo_id]["name"] == repo_name
    assert agg_data[repo_id]["history"] == [record]


def test_append_to_repo_history_existing_repo():
    repo_id = 1
    agg_data = {
        repo_id: {"name": "test-repo", "history": [{"date": "2023-01-01"}]}
    }
    record = {"date": "2023-01-02", "stars": 110, "forks": 12, "size": 510, "open_issues": 4}
    
    append_to_repo_history(agg_data, repo_id, "test-repo", record)
    
    assert len(agg_data[repo_id]["history"]) == 2
    assert agg_data[repo_id]["history"][-1] == record


def test_get_repo_comparison_data():
    agg_data = {}
    df = pd.DataFrame({
        "id": [1, 2],
        "name": ["repo1", "repo2"],
        "stars": [10, 20],
        "forks": [1, 2],
        "size": [100, 200],
        "open_issues": [0, 1]
    })
    date = "2023-01-01"
    
    get_repo_comparison_data(agg_data, df, date)
    
    assert len(agg_data) == 2
    assert agg_data[1]["name"] == "repo1"
    assert agg_data[1]["history"][0]["stars"] == 10
    assert agg_data[2]["name"] == "repo2"
    assert agg_data[2]["history"][0]["stars"] == 20


def test_get_repo_comparison_data_multiple_days():
    agg_data = {}
    
    # Day 1
    df1 = pd.DataFrame({
        "id": [1],
        "name": ["repo1"],
        "stars": [10],
        "forks": [1],
        "size": [100],
        "open_issues": [0]
    })
    get_repo_comparison_data(agg_data, df1, "2023-01-01")
    
    # Day 2
    df2 = pd.DataFrame({
        "id": [1],
        "name": ["repo1"],
        "stars": [15],
        "forks": [2],
        "size": [105],
        "open_issues": [1]
    })
    get_repo_comparison_data(agg_data, df2, "2023-01-02")
    
    expected_data = {
        1: {
            "name": "repo1",
            "history": [
                {
                    "date": "2023-01-01",
                    "stars": 10,
                    "forks": 1,
                    "size": 100,
                    "open_issues": 0
                },
                {
                    "date": "2023-01-02",
                    "stars": 15,
                    "forks": 2,
                    "size": 105,
                    "open_issues": 1
                }
            ]
        }
    }
    
    assert agg_data == expected_data