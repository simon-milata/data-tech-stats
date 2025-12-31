from .utils import (
    filter_object_keys, group_keys_by_interval, pick_latest_key_per_period,
    get_object, parse_parquet
)
from .primary_languages import get_primary_lang_counts, save_agg_primary_lang_counts
from .repo_comparison import get_repo_comparison_data, save_agg_repo_comparison_data
from .types import RepoComparisonAggData


def process_repos_data(s3_client, aws_config, keys, interval):
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
    save_agg_repo_comparison_data(s3_client, aws_config, interval, repo_comparison_agg_data)
