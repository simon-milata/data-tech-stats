import pandas as pd

from .utils import get_object, parse_parquet


def create_metrics_dict(df: pd.DataFrame) -> dict[str, dict[str, int]]:
    """Creates a dictionary of metrics for each repository."""
    period_entry = {}

    for _, row in df.iterrows():
        repo_name = row["name"]
        metrics = {
            "stars": row["stars"],
            "watchers": row["watchers"],
            "forks": row["forks"],
            "open_issues": row["open_issues"]
        }
        period_entry[repo_name] = metrics
    return period_entry


def get_repo_comparison_dict(
        top_keys: dict[str, str], s3_client, aws_config, columns_to_keep: list[str], repos: list[str]
    ) -> dict[str, dict[str, int]]:
    """
    Fetches data from S3, keeps repos from repos list, and creates metrics dict with all repo metrics 
    for each period.
    """
    historical_data = {}

    for period_label, s3_key in top_keys.items():
        obj = get_object(s3_client, aws_config.github_data_bucket, s3_key)
        df = parse_parquet(obj)

        df = df[columns_to_keep].copy()
        df = df[df["name"].isin(repos)]

        period_entry = create_metrics_dict(df)
    
        historical_data[period_label] = period_entry

    return historical_data


def format_repo_comparison_response(historical_data):
    """Formats the historical data for the API response."""
    result = [
        {
            "date": date,
            "repos": repos_dict
        }
        for date, repos_dict in sorted(historical_data.items())
    ]
    return result