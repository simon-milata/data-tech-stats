import os
import logging

from dotenv import load_dotenv

from utils import running_on_lambda, create_s3_client, get_search_queries


logging.basicConfig(level="INFO", format="%(levelname)s - %(name)s - %(message)s")

if not running_on_lambda():
    load_dotenv()


AWS_PROFILE_NAME = os.getenv("AWS_PROFILE_NAME")
AWS_REGION_NAME = os.getenv("AWS_REGION_NAME")
SEARCH_QUERIES_BUCKET = os.getenv("SEARCH_QUERIES_BUCKET")
SEARCH_QUERIES_PATH = os.getenv("SEARCH_QUERIES_PATH")


def lambda_handler(event, context):
    s3_client = create_s3_client(profile=AWS_PROFILE_NAME, region=AWS_REGION_NAME)
    search_queries = get_search_queries(
        s3_client=s3_client, bucket=SEARCH_QUERIES_BUCKET, path=SEARCH_QUERIES_PATH
    )
    logging.info(f"Search queries: {search_queries}")


if __name__ == "__main__":
    lambda_handler(None, None)