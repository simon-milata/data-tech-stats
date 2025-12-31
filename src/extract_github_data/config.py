from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    github_api_token: str
    search_queries_bucket: str
    search_queries_path: str
    data_output_bucket: str
    data_output_path: str
    
    results_per_page: int = 100
    pages_per_topic: int = 10
    languages_per_topic: int = 50
    aws_profile_name: str = "default"
    aws_region_name: str = "eu-central-1"
    logging_level: str = "INFO"
    
    model_config = {
        "env_file": str(Path(__file__).parent / ".env"),
        "env_file_encoding": "utf-8",
    }

    def get_repo_registry_path(self) -> str:
        return "reference_data/repo_registry.json"

    def get_repos_path(self, run_datetime) -> str:
        return f"{self.data_output_path.rstrip("/")}/{run_datetime.strftime("%Y/%m/%d")}/repos.parquet"

    def get_languages_path(self, run_datetime) -> str:
        return f"{self.data_output_path.rstrip("/")}/{run_datetime.strftime("%Y/%m/%d")}/languages.parquet"

    def get_repo_counts_path(self, run_datetime) -> str:
        return f"{self.data_output_path.rstrip("/")}/{run_datetime.strftime("%Y/%m/%d")}/repo_counts.json"

settings = Settings()