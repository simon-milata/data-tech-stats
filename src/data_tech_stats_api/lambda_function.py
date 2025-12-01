import json
from typing import Literal

from fastapi import FastAPI
from mangum import Mangum

from .config import AWSConfig
from .utils import (
    create_s3_client, running_on_lambda, get_object
)

running_on_lambda = running_on_lambda()

aws_config = AWSConfig()
app = FastAPI()

@app.get("/data-tech-stats/api/repo-counts")
def get_repo_counts(interval: Literal["weekly", "monthly"]):
    s3_client = create_s3_client(aws_config.profile, aws_config.region)

    data_path = f"{aws_config.aggregated_data_path}/repo_counts/{interval}.json"
    obj = get_object(s3_client, aws_config.aggregated_bucket, data_path)
    content = json.load(obj["Body"])

    return content


@app.get("/data-tech-stats/api/primary-languages")
def get_repo_counts(interval: Literal["weekly", "monthly"]):
    s3_client = create_s3_client(aws_config.profile, aws_config.region)

    data_path = f"{aws_config.aggregated_data_path}/primary_langs_counts/{interval}.json"
    obj = get_object(s3_client, aws_config.aggregated_bucket, data_path)
    content = json.load(obj["Body"])

    return content


if running_on_lambda: 
    handler = Mangum(app)