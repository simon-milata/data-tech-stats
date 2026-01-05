from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    github_api_token: str
    bucket: str

    github_data_prefix: str = "github_data"
    reference_data_prefix: str = "reference_data"
    config_files_prefix: str = "config_files"
    results_per_page: int = 100
    pages_per_topic: int = 10
    languages_per_topic: int = 50
    profile: str = "default"
    region: str = "eu-central-1"
    logging_level: str = "INFO"
    
    
    def get_search_queries_path(self) -> str:
        return f"{self.config_files_prefix}/search_queries.json"

    def get_repo_registry_path(self) -> str:
        return f"{self.reference_data_prefix}/repo_registry.json"

    def get_repos_path(self, run_datetime) -> str:
        return f"{self.github_data_prefix.rstrip('/')}/{run_datetime.strftime('%Y/%m/%d')}/repos.parquet"

    def get_languages_path(self, run_datetime) -> str:
        return f"{self.github_data_prefix.rstrip('/')}/{run_datetime.strftime('%Y/%m/%d')}/languages.parquet"

    def get_repo_counts_path(self, run_datetime) -> str:
        return f"{self.github_data_prefix.rstrip('/')}/{run_datetime.strftime('%Y/%m/%d')}/repo_counts.json"
