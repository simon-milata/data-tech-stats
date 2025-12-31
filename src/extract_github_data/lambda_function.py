import logging
from datetime import datetime

from .utils import (
    running_on_lambda, create_s3_client, get_search_queries, save_parquet_to_s3,
    setup_logging, save_json_to_s3, transfrom_lang_data, get_s3_object
)
from .extract import (
    get_all_repos_data, deduplicate_repo_data, get_languages_data
)
from .config import settings
from .repo_registry import upsert_repo_registry


if not running_on_lambda():
    from dotenv import load_dotenv

    load_dotenv()


setup_logging(settings.logging_level)


def lambda_handler(event, context):
    run_datetime = datetime.now()

    s3_client = create_s3_client(profile=settings.aws_profile_name, region=settings.aws_region_name)
    search_queries = get_search_queries(
        s3_client=s3_client, bucket=settings.search_queries_bucket, path=settings.search_queries_path
    )
    logging.info(f"Search queries: {search_queries}")
    data, repo_counts = get_all_repos_data(topics=search_queries)
    language_data = get_languages_data(data)
    data = deduplicate_repo_data(data)

    language_data_long = transfrom_lang_data(language_data)


    repo_registry_path = settings.get_repo_registry_path()
    repo_registery_data = get_s3_object(s3_client, settings.data_output_bucket, repo_registry_path)
    repo_registery_data = upsert_repo_registry(run_datetime, data, repo_registery_data)
    save_json_to_s3(s3_client, repo_registery_data, settings.data_output_bucket, repo_registry_path)

    repos_output_path = settings.get_repos_path(run_datetime)
    save_parquet_to_s3(s3_client=s3_client, data=data, bucket=settings.data_output_bucket, path=repos_output_path)

    languages_output_path = settings.get_languages_path(run_datetime)
    save_parquet_to_s3(s3_client=s3_client, data=language_data_long, bucket=settings.data_output_bucket, path=languages_output_path)

    counts_output_path = settings.get_repo_counts_path(run_datetime)
    save_json_to_s3(s3_client=s3_client, data=repo_counts, bucket=settings.data_output_bucket, path=counts_output_path)


if __name__ == "__main__":
    lambda_handler(None, None)