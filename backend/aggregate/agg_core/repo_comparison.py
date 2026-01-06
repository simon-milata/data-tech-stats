import pandas as pd

from agg_core.utils import save_data_to_s3
from agg_core.types import RepoComparisonAggData, RepoComparisonHistoryRecord, RepoId


def append_to_repo_history(repo_comparison_agg_data: RepoComparisonAggData, repo_id: RepoId, repo_name: str, record: RepoComparisonHistoryRecord):
    if repo_id not in repo_comparison_agg_data:
        repo_comparison_agg_data[repo_id] = {
            "name": repo_name,
            "history": []
        }
    repo_comparison_agg_data[repo_id]["history"].append(record)


def get_repo_comparison_data(repo_comparison_agg_data: RepoComparisonAggData, df: pd.DataFrame, date):
    for row in df.itertuples():
        repo_id = row.id
        repo_name = row.name
        record: RepoComparisonHistoryRecord = {
            "date": date,
            "stars": row.stars,
            "forks": row.forks,
            "size": row.size,
            "open_issues": row.open_issues
        }
        append_to_repo_history(repo_comparison_agg_data, repo_id, repo_name, record)


def save_agg_repo_comparison_data(s3_client, settings, interval, data):
    output_path = settings.get_repo_comparison_path(interval)
    save_data_to_s3(s3_client, settings.bucket, output_path, data)
