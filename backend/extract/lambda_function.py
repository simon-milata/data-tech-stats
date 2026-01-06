import logging
from datetime import datetime

from dts_utils.s3_utils import (
    running_on_lambda, setup_logging, create_s3_client, get_json_object, save_data_to_s3
)
from extract_core.utils import (
    get_search_queries, save_parquet_to_s3, transform_lang_data
)
from extract_core.extract import (
    get_all_repos_data, deduplicate_repo_data, get_languages_data
)
from extract_core.config import Settings
from extract_core.repo_registry import upsert_repo_registry


if not running_on_lambda():
    from dotenv import load_dotenv

    load_dotenv()

settings = Settings()
setup_logging(settings.logging_level)


def lambda_handler(event, context):
    logging.info("Starting extraction lambda.")
    run_datetime = datetime.now()

    s3_client = create_s3_client(profile=settings.profile, region=settings.region)
    search_queries_path = settings.get_search_queries_path()
    search_queries = get_search_queries(
        s3_client=s3_client, bucket=settings.bucket, path=search_queries_path
    )
    logging.info(f"Search queries: {search_queries}.")
    data, repo_counts = get_all_repos_data(topics=search_queries, settings=settings)
    language_data = get_languages_data(data, settings=settings)
    data = deduplicate_repo_data(data)

    language_data_long = transform_lang_data(language_data)

    repo_registry_path = settings.get_repo_registry_path()
    repo_registry_data = get_json_object(s3_client, settings.bucket, repo_registry_path)
    repo_registry_data = upsert_repo_registry(run_datetime, data, repo_registry_data)
    save_data_to_s3(s3_client, settings.bucket, repo_registry_path, repo_registry_data)

    repos_output_path = settings.get_repos_path(run_datetime)
    save_parquet_to_s3(s3_client=s3_client, data=data, bucket=settings.bucket, path=repos_output_path)

    languages_output_path = settings.get_languages_path(run_datetime)
    save_parquet_to_s3(s3_client=s3_client, data=language_data_long, bucket=settings.bucket, path=languages_output_path)

    counts_output_path = settings.get_repo_counts_path(run_datetime)
    save_data_to_s3(s3_client=s3_client, body=repo_counts, bucket=settings.bucket, path=counts_output_path)
    logging.info("Extraction lambda finished.")


if __name__ == "__main__":
    lambda_handler(None, None)