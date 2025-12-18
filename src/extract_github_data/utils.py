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
    logging.info(f"Converting data to pyarrow table. Rows: {len(data)}.")
    table = pa.Table.from_pylist(data)

    buffer = BytesIO()
    logging.info("Writing pyarrow table to buffer.")
    pq.write_table(table, buffer, compression="snappy")
    buffer.seek(0)

    logging.info(f"Uploading paruqet data to {path}.")
    s3_client.upload_fileobj(Bucket=bucket, Key=path, Fileobj=buffer)
    logging.info(f"Succesfully uploaded paruqet data to {path}.")


def save_json_to_s3(s3_client, data: list[dict], bucket: str, path: str):
    logging.info(f"Uploading JSON data to {path}.")
    s3_client.put_object(Bucket=bucket, Key=path, Body=json.dumps(data))
    logging.info(f"Succesfully uploaded JSON data to {path}.")


def setup_logging(logging_level) -> None:
    """Setups up the logging level and format for the logger running."""
    if running_on_lambda():
        logging.getLogger().setLevel(logging_level)
    else:
        logging.basicConfig(
            level=logging_level, datefmt="%H:%M:%S",
            format="%(asctime)s - %(levelname)s - %(message)s"
        )
    logging.getLogger("requests").setLevel(logging.WARNING)
    logging.getLogger("boto3").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("s3transfer").setLevel(logging.WARNING)


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
    
    logging.debug(f"Succesfully fetched data from '{url}'.")
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
    logging.info("Transforming language data into long format.")
    language_data_long = []
    for row in language_data:
        language_data_long.extend(transform_lang_list_long(row))

    logging.info("Succesfully transformed language data into long format.")
    return language_data_long


def get_scaled_delay(per_page, max_delay=3.0, min_delay=0.0, max_per_page=100):
    """
    Retuns a delay based on results per page. Higher results per page => lower delay.
    """
    per_page = max(1, min(per_page, max_per_page))
    factor = 1 - (per_page / max_per_page)
    delay = min_delay + factor * (max_delay - min_delay)
    return delay


def build_output_path(data_output_prefix: str, run_datetime: datetime, file_name: str) -> str:
    prefix = data_output_prefix.rstrip("/")
    return f"{prefix}/{get_date_str(run_datetime)}/{file_name}"