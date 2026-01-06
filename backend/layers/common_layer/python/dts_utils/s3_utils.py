import os
import logging
import json
import boto3


def running_on_lambda() -> bool:
    return "AWS_LAMBDA_FUNCTION_NAME" in os.environ


def create_boto3_session(profile: str = "default", region: str = None):
    if running_on_lambda():
        return boto3.Session(region_name=region)
    return boto3.Session(profile_name=profile, region_name=region)


def create_s3_client(profile: str = "default", region: str = None):
    session = create_boto3_session(profile=profile, region=region)
    return session.client("s3")


def setup_logging(logging_level) -> None:
    """Sets up the logging level and format for the logger."""
    if running_on_lambda():
        logging.getLogger().setLevel(logging_level)
    else:
        logging.basicConfig(
            level=logging_level, datefmt="%H:%M:%S",
            format="%(asctime)s - %(levelname)s - %(message)s"
        )

    for logger_name in ["requests", "boto3", "urllib3", "botocore", "s3transfer"]:
        logging.getLogger(logger_name).setLevel(logging.WARNING)


def get_all_objects(s3_client, bucket: str, prefix: str):
    logging.debug(f"Listing objects with prefix '{prefix}'.")
    objects = s3_client.list_objects_v2(
        Bucket=bucket,
        Prefix=prefix
    )["Contents"][1:]
    return objects


def get_object(s3_client, bucket: str, key: str):
    obj = s3_client.get_object(
        Bucket=bucket,
        Key=key
    )
    return obj


def get_json_object(s3_client, bucket: str, key: str):
    obj = get_object(s3_client, bucket, key)
    return json.load(obj["Body"])


def save_data_to_s3(s3_client, bucket: str, path: str, body: dict[str, str]):
    logging.info(f"Saving data to '{path}'.")
    s3_client.put_object(
        Bucket=bucket,
        Key=path,
        Body=json.dumps(body)
    )
    logging.debug(f"Successfully saved data to '{path}'.")
