from pathlib import Path

from pydantic_settings import BaseSettings
from pydantic import Field


class AWSConfig(BaseSettings):
    profile: str = Field(default="default", validation_alias="AWS_PROFILE_NAME")
    region: str = Field(default="eu-central-1", validation_alias="AWS_REGION_NAME")
    github_data_bucket: str = Field(validation_alias="GITHUB_DATA_BUCKET")
    github_data_prefix: str = Field(validation_alias="GITHUB_DATA_PREFIX")
    data_output_bucket: str = Field(validation_alias="AGGREGATED_DATA_OUTPUT_BUCKET")
    data_output_path: str = Field(default="aggregated_data", validation_alias="AGGREGATED_DATA_OUTPUT_PATH")

    model_config = {
        "env_file": str(Path(__file__).parent / ".env"),
        "env_file_encoding": "utf-8",
    }

    def get_repo_counts_path(self, interval: str) -> str:
        return f"{self.data_output_path}/repo_counts/{interval}.json"

    def get_primary_langs_path(self, interval: str) -> str:
        return f"{self.data_output_path}/primary_langs_counts/{interval}.json"

    def get_repo_comparison_path(self, interval: str) -> str:
        return f"{self.data_output_path}/repo_comparison/{interval}.json"

    def get_repo_list_path(self) -> str:
        return f"{self.data_output_path}/repo_list/repo_list.json"
