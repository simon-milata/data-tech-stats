import pandas as pd

from agg_core.utils import (
    save_data_to_s3
)


def get_primary_lang_counts(df: pd.DataFrame) -> dict[str, int]:
    counts_dict = df["main_language"].value_counts().to_dict()
    return counts_dict


def save_agg_primary_lang_counts(s3_client, settings, interval, data):
    output_path = settings.get_primary_langs_path(interval)
    save_data_to_s3(s3_client, settings.bucket, output_path, data)
