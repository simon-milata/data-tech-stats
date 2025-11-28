import json

from fastapi import FastAPI
from mangum import Mangum

from .config import AWSConfig
from .utils import (
    create_s3_client, running_on_lambda, get_all_objects, get_object_keys,
    filter_object_keys, get_object, get_date_from_key
)

running_on_lambda = running_on_lambda()

aws_config = AWSConfig()
app = FastAPI()

@app.get("/data-tech-stats/api/repo-counts")
def get_repo_counts():
    data = []

    s3_client = create_s3_client(aws_config.profile, aws_config.region)
    objects = get_all_objects(s3_client, aws_config.github_data_bucket, aws_config.github_data_prefix)
    keys = get_object_keys(objects)
    repo_count_keys = filter_object_keys(keys, "repo_counts.json")
    

    for key in repo_count_keys:
        obj = get_object(s3_client, aws_config.github_data_bucket, key)
        content = json.load(obj["Body"])
        date = get_date_from_key(key)
        content["date"] = date
        data.append(content)

    return data


if running_on_lambda: 
    handler = Mangum(app)