from .config import AWSConfig
from .utils import (
    create_s3_client, running_on_lambda, get_all_objects, get_object_keys, filter_object_keys, 
)
from .repo_counts import aggregate_repo_counts, save_agg_repo_counts

running_on_lambda = running_on_lambda()

aws_config = AWSConfig()

def lambda_handler(event, context):
    interval = event["interval"]
    period = interval.replace("ly", "")

    s3_client = create_s3_client(aws_config.profile, aws_config.region)
    objects = get_all_objects(s3_client, aws_config.github_data_bucket, aws_config.github_data_prefix)
    keys = get_object_keys(objects)

    repo_count_keys = filter_object_keys(keys, "repo_counts.json")
    repo_counts_data = aggregate_repo_counts(s3_client, repo_count_keys, period, aws_config)
    save_agg_repo_counts(s3_client, aws_config, interval, repo_counts_data)


if __name__ == "__main__":
    payload = {
        "interval": "monthly"
    }
    lambda_handler(payload, None)