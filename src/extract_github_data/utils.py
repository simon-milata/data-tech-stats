import os
import json
from io import BytesIO
from datetime import datetime
import logging
import requests
import time

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
    """Fetches a list of topics to search in API."""
    body = s3_client.get_object(Bucket=bucket, Key=path)["Body"]
    return json.load(body)


def get_date_str(date_time: datetime) -> str:
    """Returns datetime as a Y/m/d string."""
    return date_time.strftime("%Y/%m/%d")


def save_parquet_to_s3(s3_client, data: list[dict], bucket: str, path: str):
    """Converts a list of dicts to a pyarrow table and saves it as a parquet file to S3."""
    logging.debug(f"Converting data to pyarrow table. Rows: {len(data)}.")
    table = pa.Table.from_pylist(data)

    buffer = BytesIO()
    logging.debug("Writing pyarrow table to buffer.")
    pq.write_table(table, buffer, compression="snappy")
    buffer.seek(0)

    logging.debug(f"Uploading parquet data to {path}.")
    s3_client.upload_fileobj(Bucket=bucket, Key=path, Fileobj=buffer)
    logging.info(f"Successfully uploaded parquet data to {path}.")


def save_json_to_s3(s3_client, data: list[dict], bucket: str, path: str):
    logging.debug(f"Uploading JSON data to {path}.")
    s3_client.put_object(Bucket=bucket, Key=path, Body=json.dumps(data))
    logging.info(f"Successfully uploaded JSON data to {path}.")


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


def make_get_request(url: str, headers: dict, retries: int = 0, max_retries: int = 5) -> requests.Response:
    """Makes a get request. Sleeps and retries if status code is not 200. Fails if max_retries = retries."""
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        if retries < max_retries:
            logging.warning(f"Response code for '{url}': {response.status_code}! Error message: '{response.text}'. Retrying.")
            time.sleep(retries)
            return make_get_request(url=url, headers=headers, retries=retries + 1)
        else:
            raise Exception(f"Max retries ({max_retries}) reached for '{url}'!")
    
    logging.debug(f"Successfully fetched data from '{url}'.")
    return response


def transform_lang_list_long(language_data: dict) -> list[dict]:
    """
    Transforms a row of language data into a long format. 
    Each language in the dict of languages for the repo becomes one row in the new list.
    """
    rows = []
    for lang, bytes_count in language_data["languages"].items():
        rows.append({
            "repo_id": language_data["repo_id"],
            "repo_name": language_data["repo_name"],
            "language": lang,
            "bytes": bytes_count
        })
    return rows


def transfrom_lang_data(language_data: dict) -> list[dict]:
    """Transforms language data rows into long format."""
    logging.debug("Transforming language data into long format.")
    language_data_long = []
    for row in language_data:
        language_data_long.extend(transform_lang_list_long(row))

    logging.debug("Successfully transformed language data into long format.")
    return language_data_long


def get_scaled_delay(per_page, max_delay=3.0, min_delay=0.0, max_per_page=100):
    """
    Retuns a delay based on results per page. Higher results per page => lower delay.
    """
    per_page = max(1, min(per_page, max_per_page))
    factor = 1 - (per_page / max_per_page)
    delay = min_delay + factor * (max_delay - min_delay)
    return delay
    

def get_s3_object(s3_client, bucket, path):
    try:
        s3_object = s3_client.get_object(
            Bucket=bucket,
            Key=path
        )
        return json.load(s3_object["Body"])
    except s3_client.exceptions.NoSuchKey:
        return {}
