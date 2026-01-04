from .config import Settings
from .utils import (
    create_s3_client, get_all_objects, get_object_keys, filter_object_keys
)
from .repo_counts import aggregate_repo_counts, save_agg_repo_counts
from .repo_list import get_repo_list, save_repo_list
from .process_repos import process_repos_data

settings = Settings()


def lambda_handler(event, context):
    s3_client = create_s3_client(settings.profile, settings.region)

    objects = get_all_objects(s3_client, settings.bucket, settings.github_data_prefix)
    keys = get_object_keys(objects)

    repo_list = get_repo_list(s3_client, settings.bucket, keys)
    save_repo_list(s3_client, settings, repo_list)

    intervals = ["weekly", "monthly"]
    for interval in intervals:
        repo_count_keys = filter_object_keys(keys, "repo_counts.json")
        repo_counts_data = aggregate_repo_counts(s3_client, repo_count_keys, interval, settings)
        save_agg_repo_counts(s3_client, settings, interval, repo_counts_data)

        process_repos_data(s3_client, settings, keys, interval)


if __name__ == "__main__":
    lambda_handler(None, None)