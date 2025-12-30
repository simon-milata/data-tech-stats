from pathlib import Path

from pydantic_settings import BaseSettings
from pydantic import Field


class AWSConfig(BaseSettings):
    profile: str = Field(default="default", validation_alias="AWS_PROFILE_NAME")
    region: str = Field(default="eu-central-1", validation_alias="AWS_REGION_NAME")
    github_data_bucket: str = Field(validation_alias="GITHUB_DATA_BUCKET")
    github_data_prefix: str = Field(validation_alias="GITHUB_DATA_PREFIX")
    aggregated_bucket: str = Field(validation_alias="AGGREGATED_DATA_OUTPUT_BUCKET")
    aggregated_data_path: str = Field(validation_alias="AGGREGATED_DATA_OUTPUT_PATH")
    logging_level: str = "INFO"

    model_config = {
        "env_file": str(Path(__file__).parent / ".env"),
        "env_file_encoding": "utf-8",
    }
