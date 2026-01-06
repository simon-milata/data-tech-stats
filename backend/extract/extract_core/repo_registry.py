import logging
from datetime import datetime


def upsert_repo_registry(run_date: datetime, repos, repo_registry_data: dict[str, dict[str, str]]) -> dict[str, dict[str, str]]:
    logging.info(f"Upserting repo registry with {len(repos)} repositories.")
    repo_registry_data = repo_registry_data.copy()
    run_date_str = run_date.strftime("%Y-%m-%d")

    for repo in repos:
        repo_id = str(repo["id"])
        if repo_id in repo_registry_data:
            repo_registry_data[repo_id]["last_seen"] = run_date_str
        else:
            repo_registry_data[repo_id] = {
                "name": repo["name"],
                "first_seen": run_date_str,
                "last_seen": run_date_str
            }
    return repo_registry_data