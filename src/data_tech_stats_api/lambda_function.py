import json
from typing import Literal

from fastapi import FastAPI, APIRouter, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from mangum import Mangum

from .config import Settings
from .utils import (
    create_s3_client, running_on_lambda, get_object, setup_logging, timer, get_seconds_until_midnight
)

running_on_lambda = running_on_lambda()

settings = Settings()
setup_logging(settings.logging_level)
app = FastAPI()
router = APIRouter(prefix=settings.api_prefix)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=10000)

s3_client = create_s3_client(settings.profile, settings.region)


@router.get("/repo-counts")
@timer
def get_repo_counts(interval: Literal["weekly", "monthly"], response: Response):
    data_path = settings.get_repo_counts_path(interval)
    obj = get_object(s3_client, settings.bucket, data_path)
    content = json.load(obj["Body"])

    max_age = get_seconds_until_midnight()
    response.headers["Cache-Control"] = f"public, max-age={max_age}"
    return content


@router.get("/primary-languages")
@timer
def get_primary_languages(interval: Literal["weekly", "monthly"], response: Response):
    data_path = settings.get_primary_languages_path(interval)
    obj = get_object(s3_client, settings.bucket, data_path)
    content = json.load(obj["Body"])

    max_age = get_seconds_until_midnight()
    response.headers["Cache-Control"] = f"public, max-age={max_age}"
    return content


@router.get("/repo-list")
@timer
def get_repo_list(response: Response):
    repo_list_path = settings.get_repo_list_path()
    repo_list_obj = get_object(s3_client, settings.bucket, repo_list_path)
    
    max_age = get_seconds_until_midnight()
    response.headers["Cache-Control"] = f"public, max-age={max_age}"
    return json.load(repo_list_obj["Body"])


@router.get("/repo-comparison")
@timer
def get_repo_comparison_data(interval: Literal["weekly", "monthly"], response: Response):
    repo_comparison_path = settings.get_repo_comparison_path(interval)
    repo_comparison_obj = get_object(s3_client, settings.bucket, repo_comparison_path)

    max_age = get_seconds_until_midnight()
    response.headers["Cache-Control"] = f"public, max-age={max_age}"
    return json.load(repo_comparison_obj["Body"])


app.include_router(router)

if running_on_lambda: 
    handler = Mangum(app)