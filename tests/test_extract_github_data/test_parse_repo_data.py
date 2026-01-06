from extract.extract_core.extract import parse_repo_data, keep_n_repos_per_topic


def test_parse_repo_data_basic():
    input_data = [
        {
            "id": 1,
            "name": "test-repo",
            "languages_url": "http://api/languages",
            "size": 123,
            "stargazers_count": 10,
            "watchers_count": 5,
            "language": "Python",
            "forks_count": 2,
            "license": {"spdx_id": "MIT"},
            "open_issues_count": 1,
            "topics": ["etl", "data"]
        }
    ]

    parsed = parse_repo_data(input_data, "")

    assert len(parsed) == 1
    repo = parsed[0]
    assert repo["id"] == 1
    assert repo["name"] == "test-repo"
    assert repo["license"] == "MIT"
    assert repo["topics"] == ["etl", "data"]


def test_parse_repo_data_missing_license():
    input_data = [
        {
            "id": 2,
            "name": "repo-no-license",
            "languages_url": "http://api/languages",
            "size": 10,
            "stargazers_count": 0,
            "watchers_count": 0,
            "language": "Go",
            "forks_count": 0,
            "license": None,
            "open_issues_count": 0,
            "topics": []
        }
    ]

    parsed = parse_repo_data(input_data, "")
    assert parsed[0]["license"] == ""


def test_keep_n_repos_per_topic():
    input_data = [
        {"id": 1, "topic_queried": "topic_1"},
        {"id": 2, "topic_queried": "topic_1"},
        {"id": 3, "topic_queried": "topic_1"},
        {"id": 4, "topic_queried": "topic_1"},
        {"id": 5, "topic_queried": "topic_2"},
        {"id": 6, "topic_queried": "topic_2"}
    ]
    
    result = keep_n_repos_per_topic(input_data, n=3)
    
    assert len(result) == 5
    
    topic_1_repos = [r for r in result if r["topic_queried"] == "topic_1"]
    topic_2_repos = [r for r in result if r["topic_queried"] == "topic_2"]
    
    assert len(topic_1_repos) == 3
    assert len(topic_2_repos) == 2
    assert [r["id"] for r in topic_1_repos] == [1, 2, 3]
    assert [r["id"] for r in topic_2_repos] == [5, 6]