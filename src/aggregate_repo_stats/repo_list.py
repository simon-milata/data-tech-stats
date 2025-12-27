import json

import pandas as pd

from .utils import get_latest_date_key, get_object, parse_parquet, save_data_to_s3


COLUMNS_TO_KEEP = ["id", "name", "stars"]

def get_repo_list(s3_client, bucket, keys: list[str]) -> list[dict[str, str | int]]:
    """Builds a list of tuples of repo names and IDs where last seen is the highest last seen"""
    latest_repos_key = get_latest_date_key(keys, "repos.parquet")
    repo_obj = get_object(s3_client, bucket, latest_repos_key)
    data = parse_parquet(repo_obj)

    df = pd.DataFrame(data)
    df = df[COLUMNS_TO_KEEP]
    
    return df.to_dict(orient="records")


def save_repo_list(s3_client, aws_config, data):
    output_path = f"{aws_config.data_output_path}/repo_list/repo_list.json"
    save_data_to_s3(s3_client, aws_config.data_output_bucket, output_path, data)