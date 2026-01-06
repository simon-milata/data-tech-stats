from io import BytesIO
from datetime import datetime
import logging
import requests
import time

import pyarrow as pa
import pyarrow.parquet as pq

from dts_utils.s3_utils import get_json_object


def get_search_queries(s3_client, bucket: str, path: str) -> list[str]:
    """Fetches a list of topics to search in API."""
    return get_json_object(s3_client, bucket, path)


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

    logging.info(f"Uploading parquet data to {path}.")
    s3_client.upload_fileobj(Bucket=bucket, Key=path, Fileobj=buffer)
    logging.debug(f"Successfully uploaded parquet data to {path}.")


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


def transform_lang_data(language_data: dict) -> list[dict]:
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
