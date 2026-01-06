from datetime import datetime
from extract.extract_core.repo_registry import upsert_repo_registry


def test_upsert_repo_registry_new_repo():
    run_date = datetime(2024, 1, 1)
    expected_date_str = "2024-01-01"
    repos = [{"id": 1, "name": "new-repo"}]
    registry = {}

    updated_registry = upsert_repo_registry(run_date, repos, registry)

    assert "1" in updated_registry
    assert updated_registry["1"] == {
        "name": "new-repo",
        "first_seen": expected_date_str,
        "last_seen": expected_date_str
    }


def test_upsert_repo_registry_existing_repo():
    run_date = datetime(2024, 2, 1)
    expected_date_str = "2024-02-01"
    repos = [{"id": 1, "name": "existing-repo"}]
    registry = {
        "1": {
            "name": "existing-repo",
            "first_seen": "2024-01-01",
            "last_seen": "2024-01-01"
        }
    }

    updated_registry = upsert_repo_registry(run_date, repos, registry)

    assert updated_registry["1"]["first_seen"] == "2024-01-01"
    assert updated_registry["1"]["last_seen"] == expected_date_str


def test_upsert_repo_registry_mixed():
    run_date = datetime(2024, 3, 1)
    expected_date_str = "2024-03-01"
    repos = [
        {"id": 1, "name": "existing-repo"},
        {"id": 2, "name": "new-repo"}
    ]
    registry = {
        "1": {
            "name": "existing-repo",
            "first_seen": "2024-01-01",
            "last_seen": "2024-01-01"
        }
    }

    updated_registry = upsert_repo_registry(run_date, repos, registry)


    assert updated_registry["1"]["last_seen"] == expected_date_str
    assert "2" in updated_registry
    assert updated_registry["2"]["first_seen"] == expected_date_str
    assert updated_registry["2"]["last_seen"] == expected_date_str