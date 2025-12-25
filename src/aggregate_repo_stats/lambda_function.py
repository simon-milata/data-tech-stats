from .config import AWSConfig
from .utils import (
    create_s3_client, running_on_lambda, get_all_objects, get_object_keys, filter_object_keys, 
    get_object
)
from .repo_counts import aggregate_repo_counts, save_agg_repo_counts
from .primary_languages import aggregate_primary_languages, save_agg_primary_lang_counts
from .repo_list import get_repo_list, save_repo_list, get_repo_registry

running_on_lambda = running_on_lambda()

aws_config = AWSConfig()


REPO_REGISTRY_PATH = "reference_data/repo_registry.json"


def lambda_handler(event, context):
    s3_client = create_s3_client(aws_config.profile, aws_config.region)

    repo_registry = get_repo_registry(s3_client, aws_config.github_data_bucket, REPO_REGISTRY_PATH)
    repo_list = get_repo_list(repo_registry)
    save_repo_list(s3_client, aws_config, repo_list)

    objects = get_all_objects(s3_client, aws_config.github_data_bucket, aws_config.github_data_prefix)
    keys = get_object_keys(objects)

    intervals = ["weekly", "monthly"]
    for interval in intervals:
        repo_count_keys = filter_object_keys(keys, "repo_counts.json")
        repo_counts_data = aggregate_repo_counts(s3_client, repo_count_keys, interval, aws_config)
        save_agg_repo_counts(s3_client, aws_config, interval, repo_counts_data)

        repos_keys = filter_object_keys(keys, "repos.parquet")
        primary_langs_agg_data = aggregate_primary_languages(s3_client, repos_keys, interval, aws_config)
        save_agg_primary_lang_counts(s3_client, aws_config, interval, primary_langs_agg_data)


if __name__ == "__main__":
    lambda_handler(None, None)