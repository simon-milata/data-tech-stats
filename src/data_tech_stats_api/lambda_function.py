import json
from typing import Literal, Annotated
from collections import defaultdict

from fastapi import FastAPI, APIRouter, Query
from mangum import Mangum

from .config import AWSConfig
from .utils import (
    create_s3_client, running_on_lambda, get_object, get_objects, get_object_keys,
    filter_object_keys, group_keys_by_period, pick_latest_key_per_period
)
from .repo_comparison import get_repo_comparison_dict, format_repo_comparison_response


running_on_lambda = running_on_lambda()

aws_config = AWSConfig()
app = FastAPI()
router = APIRouter(prefix="/data-tech-stats/api")

s3_client = create_s3_client(aws_config.profile, aws_config.region)

@router.get("/repo-counts")
def get_repo_counts(interval: Literal["weekly", "monthly"]):
    data_path = f"{aws_config.aggregated_data_path}/repo_counts/{interval}.json"
    obj = get_object(s3_client, aws_config.aggregated_bucket, data_path)
    content = json.load(obj["Body"])

    return content


@router.get("/primary-languages")
def get_primary_languages(interval: Literal["weekly", "monthly"]):
    data_path = f"{aws_config.aggregated_data_path}/primary_langs_counts/{interval}.json"
    obj = get_object(s3_client, aws_config.aggregated_bucket, data_path)
    content = json.load(obj["Body"])

    return content


@router.get("/repo-comparison")
def get_repo_comparison_data(repos: Annotated[list[str], Query()], interval: Literal["weekly", "monthly"]):
    objects = get_objects(s3_client, aws_config.github_data_bucket, aws_config.github_data_prefix)
    keys = get_object_keys(objects)
    repos_keys = filter_object_keys(keys, suffix="repos.parquet")

    period = interval.replace("ly", "")
    grouped_keys = group_keys_by_period(repos_keys, period)
    top_keys = pick_latest_key_per_period(grouped_keys)

    columns_to_keep = ["name", "stars", "watchers", "forks", "open_issues"]
    historical_data = get_repo_comparison_dict(top_keys, s3_client, aws_config, columns_to_keep, repos)
    content = format_repo_comparison_response(historical_data)

    return content


app.include_router(router)

if running_on_lambda: 
    handler = Mangum(app)