from .config import AWSConfig
from .utils import (
    create_s3_client, running_on_lambda, get_all_objects, get_object_keys, filter_object_keys, 
    group_keys_by_interval, pick_latest_key_per_period, get_date_from_key, get_object, parse_parquet,
    save_data_to_s3
)
from .repo_counts import aggregate_repo_counts, save_agg_repo_counts
from .primary_languages import get_primary_lang_counts, save_agg_primary_lang_counts
from .repo_list import get_repo_list, save_repo_list
from .repo_comparison import get_repo_comparison_data
from .types import RepoComparisonAggData

running_on_lambda = running_on_lambda()

aws_config = AWSConfig()


def lambda_handler(event, context):
    s3_client = create_s3_client(aws_config.profile, aws_config.region)

    objects = get_all_objects(s3_client, aws_config.github_data_bucket, aws_config.github_data_prefix)
    keys = get_object_keys(objects)

    repo_list = get_repo_list(s3_client, aws_config.github_data_bucket, keys)
    save_repo_list(s3_client, aws_config, repo_list)

    intervals = ["weekly", "monthly"]
    for interval in intervals:
        repo_count_keys = filter_object_keys(keys, "repo_counts.json")
        repo_counts_data = aggregate_repo_counts(s3_client, repo_count_keys, interval, aws_config)
        save_agg_repo_counts(s3_client, aws_config, interval, repo_counts_data)

        repos_keys = filter_object_keys(keys, "repos.parquet")
        grouped_repos_keys = group_keys_by_interval(repos_keys, interval)
        top_repos_keys = pick_latest_key_per_period(grouped_repos_keys)


        primary_langs_agg_data = []
        repo_comparison_agg_data: RepoComparisonAggData = {}
        for key, value in top_repos_keys.items():
            date = key

            obj = get_object(s3_client, aws_config.github_data_bucket, value)
            repos_df = parse_parquet(obj)

            get_repo_comparison_data(repo_comparison_agg_data, repos_df, date)

            primary_langs_agg_data.append({"date": date, "counts": get_primary_lang_counts(repos_df)})

        
        save_agg_primary_lang_counts(s3_client, aws_config, interval, primary_langs_agg_data)

        repo_comparison_path = f"aggregated_data/repo_comparison/{interval}.json"
        save_data_to_s3(s3_client, aws_config.github_data_bucket, repo_comparison_path, repo_comparison_agg_data)


if __name__ == "__main__":
    lambda_handler(None, None)