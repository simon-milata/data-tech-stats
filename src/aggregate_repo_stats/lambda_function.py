import logging

from agg_core.config import Settings
from agg_core.utils import (
    setup_logging, create_s3_client, get_all_objects, get_object_keys, filter_object_keys,
    running_on_lambda
)
from agg_core.repo_counts import aggregate_repo_counts, save_agg_repo_counts
from agg_core.repo_list import get_repo_list, save_repo_list
from agg_core.process_repos import process_repos_data

if not running_on_lambda():
    from dotenv import load_dotenv
    load_dotenv()

settings = Settings()
setup_logging(settings.logging_level)


def lambda_handler(event, context):
    logging.info("Starting aggregation lambda.")
    s3_client = create_s3_client(settings.profile, settings.region)

    objects = get_all_objects(s3_client, settings.bucket, settings.github_data_prefix)
    keys = get_object_keys(objects)

    repo_list = get_repo_list(s3_client, settings.bucket, keys)
    save_repo_list(s3_client, settings, repo_list)

    intervals = ["weekly", "monthly"]
    for interval in intervals:
        logging.info(f"Processing interval '{interval}'.")
        repo_count_keys = filter_object_keys(keys, "repo_counts.json")
        repo_counts_data = aggregate_repo_counts(s3_client, repo_count_keys, interval, settings)
        save_agg_repo_counts(s3_client, settings, interval, repo_counts_data)

        process_repos_data(s3_client, settings, keys, interval)
    
    logging.info("Aggregation lambda finished.")


if __name__ == "__main__":
    lambda_handler(None, None)