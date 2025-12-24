from aggregate_repo_stats.repo_list import get_repo_list


def test_get_repo_list_mixed_dates():
    repo_registry = {
        "1": {"name": "repo-1", "last_seen": "2023-01-01"},
        "2": {"name": "repo-2", "last_seen": "2023-01-02"},
        "3": {"name": "repo-3", "last_seen": "2023-01-02"},
        "4": {"name": "repo-4", "last_seen": "2022-12-31"},
    }
    expected = [{"id": "2", "name": "repo-2"}, {"id": "3", "name": "repo-3"}]
    assert get_repo_list(repo_registry) == expected


def test_get_repo_list_single_entry():
    repo_registry = {
        "1": {"name": "repo-1", "last_seen": "2023-01-01"},
    }
    expected = [{"id": "1", "name": "repo-1"}]
    assert get_repo_list(repo_registry) == expected


def test_get_repo_list_all_same_date():
    repo_registry = {
        "1": {"name": "repo-1", "last_seen": "2023-01-01"},
        "2": {"name": "repo-2", "last_seen": "2023-01-01"},
    }
    expected = [{"id": "1", "name": "repo-1"}, {"id": "2", "name": "repo-2"}]
    assert get_repo_list(repo_registry) == expected


def test_get_repo_list_same_repo_names():
    repo_registry = {
        "1": {"name": "repo-1", "last_seen": "2023-01-01"},
        "2": {"name": "repo-1", "last_seen": "2023-01-01"},
    }
    expected = [{"id": "1", "name": "repo-1"}, {"id": "2", "name": "repo-1"}]
    assert get_repo_list(repo_registry) == expected