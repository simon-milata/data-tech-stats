from extract_github_data.extract import parse_repo_data


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

    parsed = parse_repo_data(input_data)

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

    parsed = parse_repo_data(input_data)
    assert parsed[0]["license"] == ""
