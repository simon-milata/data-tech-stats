import json

from .utils import (
    group_keys_by_period, pick_latest_key_per_period, get_object, save_data_to_s3
)


def aggregate_repo_counts(s3_client, repo_count_keys, period, aws_config):
    data = []

    grouped_keys = group_keys_by_period(repo_count_keys, period)
    top_keys = pick_latest_key_per_period(grouped_keys)

    for key, value in top_keys.items():
        obj = get_object(s3_client, aws_config.github_data_bucket, value)
        content = json.load(obj["Body"])
        data.append({"date": key, "counts": content})

    return data


def save_agg_repo_counts(s3_client, aws_config, interval, data):
    output_path = f"{aws_config.data_output_path}/{interval}.json"
    save_data_to_s3(s3_client, aws_config.data_output_bucket, output_path, data)