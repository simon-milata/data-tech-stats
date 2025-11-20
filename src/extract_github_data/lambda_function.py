import os
import logging
from datetime import datetime

from .utils import (
    running_on_lambda, create_s3_client, get_search_queries, save_parquet_to_s3,
    get_date_str, setup_logging, save_json_to_s3, transform_lang_list_long
)
from .extract import get_all_repos_data


if not running_on_lambda():
    from dotenv import load_dotenv

    load_dotenv()


LOGGING_LEVEL = os.getenv("LOGGING_LEVEL", "INFO")
AWS_PROFILE_NAME = os.getenv("AWS_PROFILE_NAME")
AWS_REGION_NAME = os.getenv("AWS_REGION_NAME")
SEARCH_QUERIES_BUCKET = os.getenv("SEARCH_QUERIES_BUCKET")
SEARCH_QUERIES_PATH = os.getenv("SEARCH_QUERIES_PATH")
DATA_OUTPUT_BUCKET = os.getenv("DATA_OUTPUT_BUCKET")
DATA_OUTPUT_PATH = os.getenv("DATA_OUTPUT_PATH")

setup_logging(LOGGING_LEVEL)


def lambda_handler(event, context):
    s3_client = create_s3_client(profile=AWS_PROFILE_NAME, region=AWS_REGION_NAME)
    search_queries = get_search_queries(
        s3_client=s3_client, bucket=SEARCH_QUERIES_BUCKET, path=SEARCH_QUERIES_PATH
    )
    logging.info(f"Search queries: {search_queries}")
    data, repo_counts, language_data = get_all_repos_data(topics=search_queries)

    language_data_long = []
    for row in language_data:
        language_data_long.extend(transform_lang_list_long(row))

    repos_output_path = f"{DATA_OUTPUT_PATH}/{get_date_str(datetime.now())}/repos.parquet"
    save_parquet_to_s3(s3_client=s3_client, data=data, bucket=DATA_OUTPUT_BUCKET, path=repos_output_path)

    languages_output_path = f"{DATA_OUTPUT_PATH}/{get_date_str(datetime.now())}/languages.parquet"
    save_parquet_to_s3(s3_client=s3_client, data=language_data_long, bucket=DATA_OUTPUT_BUCKET, path=languages_output_path)

    counts_output_path = f"{DATA_OUTPUT_PATH}/{get_date_str(datetime.now())}/repo_counts.json"
    save_json_to_s3(s3_client=s3_client, data=repo_counts, bucket=DATA_OUTPUT_BUCKET, path=counts_output_path)


if __name__ == "__main__":
    lambda_handler(None, None)