import json

from .config import AWSConfig
from .utils import (
    create_s3_client, running_on_lambda, get_all_objects, get_object_keys, filter_object_keys, 
    group_keys_by_week, pick_latest_key_per_week, get_object, save_aggregated_data
)

running_on_lambda = running_on_lambda()

aws_config = AWSConfig()

def lambda_handler(event, context):
    interval = event["interval"]
    data = []
        
    s3_client = create_s3_client(aws_config.profile, aws_config.region)
    objects = get_all_objects(s3_client, aws_config.github_data_bucket, aws_config.github_data_prefix)
    keys = get_object_keys(objects)
    repo_count_keys = filter_object_keys(keys, "repo_counts.json")

    if interval == "weekly":
        grouped_keys = group_keys_by_week(repo_count_keys)
        weekly_keys = pick_latest_key_per_week(grouped_keys)

        for key, value in weekly_keys.items():
            obj = get_object(s3_client, aws_config.github_data_bucket, value)
            content = json.load(obj["Body"])
            data.append({"date": key, "counts": content})

    output_path = f"{aws_config.data_output_path}/{interval}.json"
    save_aggregated_data(s3_client, aws_config.data_output_bucket, output_path, data)


if __name__ == "__main__":
    payload = {
        "interval": "weekly"
    }
    lambda_handler(payload, None)