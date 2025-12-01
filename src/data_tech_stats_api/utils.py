import os
from datetime import datetime, date
from collections import defaultdict

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


def get_all_objects(s3_client, bucket: str, prefix: str):
    objects = s3_client.list_objects_v2(
        Bucket=bucket,
        Prefix=prefix
    )["Contents"][1:]
    return objects


def get_object_keys(objects: list[dict]) -> list:
    return [obj["Key"] for obj in objects]


def filter_object_keys(keys: list[str], suffix: str) -> list[str]:
    return [key for key in keys if key.endswith(suffix)]


def get_object(s3_client, bucket: str, key: str):
    obj = s3_client.get_object(
        Bucket=bucket,
        Key=key
    )
    return obj


def get_date_from_key(key: str) -> date:
    year, month, day = key.split("/")[1:-1:]
    return datetime(int(year), int(month), int(day)).date()
