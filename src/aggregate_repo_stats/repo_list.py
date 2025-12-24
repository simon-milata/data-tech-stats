import json

from .utils import get_object, save_data_to_s3


def get_repo_registry(s3_client, bucket, path):
    obj = get_object(s3_client, bucket, path)
    return json.load(obj["Body"])


def get_max_last_seen(repo_registry: dict[str, dict[str, str]]) -> str:
    """Get the highest last seen"""
    return max(item["last_seen"] for item in repo_registry.values())


def get_repo_list(repo_registry: dict[str, dict[str, str]]) -> list[tuple[str, str]]:
    """Builds a list of tuples of repo names and IDs where last seen is the highest last seen"""
    highest_last_seen = get_max_last_seen(repo_registry)

    repo_list = []
    for repo_id, repo_values in repo_registry.items():
        if repo_values["last_seen"] != highest_last_seen:
            continue
        repo_list.append({"id": repo_id, "name": repo_values["name"]})
    return repo_list


def save_repo_list(s3_client, aws_config, data):
    output_path = f"{aws_config.data_output_path}/repo_list/repo_list.json"
    save_data_to_s3(s3_client, aws_config.data_output_bucket, output_path, data)