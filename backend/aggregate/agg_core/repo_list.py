import logging
import pandas as pd

from agg_core.utils import get_latest_date_key, get_object, parse_parquet, save_data_to_s3


COLUMNS_TO_KEEP = ["id", "name", "stars"]


def get_repo_list_dict(df: pd.DataFrame, columns: list[str]) -> list[dict[str, str | int]]:
    df = df[columns]
    repo_list = df.to_dict(orient="records")
    return repo_list


def get_repo_list(s3_client, bucket, keys: list[str]) -> list[dict[str, str | int]]:
    """Builds a list of tuples of repo names and IDs where last seen is the highest last seen"""
    logging.info("Generating repo list.")
    latest_repos_key = get_latest_date_key(keys, "repos.parquet")
    repo_obj = get_object(s3_client, bucket, latest_repos_key)
    df = parse_parquet(repo_obj)
    
    repo_list = get_repo_list_dict(df, COLUMNS_TO_KEEP)
    
    return repo_list


def save_repo_list(s3_client, settings, data):
    output_path = settings.get_repo_list_path()
    save_data_to_s3(s3_client, settings.bucket, output_path, data)