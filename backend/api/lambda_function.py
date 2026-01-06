import logging
from typing import Literal

from fastapi import FastAPI, APIRouter, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from mangum import Mangum

from api_core.config import Settings
from api_core.utils import timer, get_seconds_until_midnight
from dts_utils.s3_utils import create_s3_client, running_on_lambda, get_json_object, setup_logging

is_lambda_env = running_on_lambda()

if not is_lambda_env:
    from dotenv import load_dotenv
    load_dotenv()

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
    logging.info(f"Fetching repo counts for interval '{interval}'.")
    data_path = settings.get_repo_counts_path(interval)
    content = get_json_object(s3_client, settings.bucket, data_path)

    max_age = get_seconds_until_midnight()
    response.headers["Cache-Control"] = f"public, max-age={max_age}"
    return content


@router.get("/primary-languages")
@timer
def get_primary_languages(interval: Literal["weekly", "monthly"], response: Response):
    logging.info(f"Fetching primary languages for interval '{interval}'.")
    data_path = settings.get_primary_languages_path(interval)
    content = get_json_object(s3_client, settings.bucket, data_path)

    max_age = get_seconds_until_midnight()
    response.headers["Cache-Control"] = f"public, max-age={max_age}"
    return content


@router.get("/repo-list")
@timer
def get_repo_list(response: Response):
    logging.info("Fetching repo list.")
    repo_list_path = settings.get_repo_list_path()
    content = get_json_object(s3_client, settings.bucket, repo_list_path)
    
    max_age = get_seconds_until_midnight()
    response.headers["Cache-Control"] = f"public, max-age={max_age}"
    return content


@router.get("/repo-comparison")
@timer
def get_repo_comparison_data(interval: Literal["weekly", "monthly"], response: Response):
    logging.info(f"Fetching repo comparison data for interval '{interval}'.")
    repo_comparison_path = settings.get_repo_comparison_path(interval)
    content = get_json_object(s3_client, settings.bucket, repo_comparison_path)

    max_age = get_seconds_until_midnight()
    response.headers["Cache-Control"] = f"public, max-age={max_age}"
    return content


app.include_router(router)

if is_lambda_env: 
    handler = Mangum(app)