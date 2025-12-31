import json

from .utils import (
    group_keys_by_interval, pick_latest_key_per_period, get_object, save_data_to_s3
)


def aggregate_repo_counts(s3_client, repo_count_keys, interval, settings):
    data = []

    grouped_keys = group_keys_by_interval(repo_count_keys, interval)
    top_keys = pick_latest_key_per_period(grouped_keys)

    for key, value in top_keys.items():
        obj = get_object(s3_client, settings.bucket, value)
        content = json.load(obj["Body"])
        data.append({"date": key, "counts": content})

    return data


def save_agg_repo_counts(s3_client, settings, interval, data):
    output_path = settings.get_repo_counts_path(interval)
    save_data_to_s3(s3_client, settings.bucket, output_path, data)