import os
import json
from io import BytesIO
from datetime import datetime
import logging

import boto3
import pyarrow as pa
import pyarrow.parquet as pq


def running_on_lambda() -> bool:
    return "AWS_LAMBDA_FUNCTION_NAME" in os.environ


def create_boto3_session(profile: str = "default", region: str = None):
    if running_on_lambda():
        return boto3.Session(region_name=region)
    return boto3.Session(profile_name=profile, region_name=region)


def create_s3_client(profile: str = "default", region: str = None):
    session = create_boto3_session(profile=profile, region=region)
    return session.client("s3")


def get_search_queries(s3_client, bucket: str, path: str) -> list[str]:
    body = s3_client.get_object(Bucket=bucket, Key=path)["Body"]
    return json.load(body)


def get_date_str(date_time: datetime) -> str:
    return date_time.strftime("%Y/%m/%d")


def save_parquet_to_s3(s3_client, data: list[dict], bucket: str, path: str):
    table = pa.Table.from_pylist(data)

    buffer = BytesIO()
    pq.write_table(table, buffer, compression="snappy")
    buffer.seek(0)

    logging.debug(f"Uploading paruqet data to {path}.")
    s3_client.upload_fileobj(Bucket=bucket, Key=path, Fileobj=buffer)


def save_json_to_s3(s3_client, data: list[dict], bucket: str, path: str):
    logging.debug(f"Uploading JSON data to {path}.")
    s3_client.put_object(Bucket=bucket, Key=path, Body=json.dumps(data))


def setup_logging(logging_level) -> None:
    if running_on_lambda():
        logging.getLogger().setLevel(logging.INFO)
    else:
        logging.basicConfig(level=logging_level)
    logging.getLogger("requests").setLevel(logging.WARNING)
    logging.getLogger("boto3").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("s3transfer").setLevel(logging.WARNING)