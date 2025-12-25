import pandas as pd

from .utils import (
    group_keys_by_interval, pick_latest_key_per_period, get_object, parse_parquet, save_data_to_s3
)


def get_primary_lang_counts(df: pd.DataFrame) -> dict[str, int]:
    counts_dict = df["main_language"].value_counts().to_dict()
    return counts_dict


def aggregate_primary_languages(s3_client, keys, interval, aws_config):
    grouped_keys = group_keys_by_interval(keys, interval)
    top_keys = pick_latest_key_per_period(grouped_keys)

    data = []

    for key, value in top_keys.items():
        obj = get_object(s3_client, aws_config.github_data_bucket, value)
        df = parse_parquet(obj)
        content = get_primary_lang_counts(df)
        data.append({"date": key, "counts": content})

    return data


def save_agg_primary_lang_counts(s3_client, aws_config, interval, data):
    output_path = f"{aws_config.data_output_path}/primary_langs_counts/{interval}.json"
    save_data_to_s3(s3_client, aws_config.data_output_bucket, output_path, data)
