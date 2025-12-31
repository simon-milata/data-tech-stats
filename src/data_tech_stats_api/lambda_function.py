import json
from typing import Literal, Annotated
from collections import defaultdict

from fastapi import FastAPI, APIRouter, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from .config import Settings
from .utils import (
    create_s3_client, running_on_lambda, get_object, setup_logging, timer
)

running_on_lambda = running_on_lambda()

settings = Settings()
setup_logging(settings.logging_level)
app = FastAPI()
router = APIRouter(prefix="/data-tech-stats/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

s3_client = create_s3_client(settings.profile, settings.region)

@router.get("/repo-counts")
@timer
def get_repo_counts(interval: Literal["weekly", "monthly"], response: Response):
    data_path = settings.get_repo_counts_path(interval)
    obj = get_object(s3_client, settings.bucket, data_path)
    content = json.load(obj["Body"])

    response.headers["Cache-Control"] = "public, max-age=3600"
    return content


@router.get("/primary-languages")
@timer
def get_primary_languages(interval: Literal["weekly", "monthly"], response: Response):
    data_path = settings.get_primary_languages_path(interval)
    obj = get_object(s3_client, settings.bucket, data_path)
    content = json.load(obj["Body"])

    response.headers["Cache-Control"] = "public, max-age=3600"
    return content


@router.get("/repo-list")
@timer
def get_repo_list(response: Response):
    repo_list_path = settings.get_repo_list_path()
    repo_list_obj = get_object(s3_client, settings.bucket, repo_list_path)
    
    response.headers["Cache-Control"] = "public, max-age=3600"
    return json.load(repo_list_obj["Body"])


@router.get("/repo-comparison")
@timer
def get_repo_comparison_data(interval: Literal["weekly", "monthly"], response: Response):
    repo_comparison_path = settings.get_repo_comparison_path(interval)
    repo_comparison_obj = get_object(s3_client, settings.bucket, repo_comparison_path)

    response.headers["Cache-Control"] = "public, max-age=3600"
    return json.load(repo_comparison_obj["Body"])


app.include_router(router)

if running_on_lambda: 
    handler = Mangum(app)