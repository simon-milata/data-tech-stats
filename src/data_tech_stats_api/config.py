from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    bucket: str

    aggregated_data_prefix: str = "aggregated_data"
    profile: str = "default"
    region: str = "eu-central-1"
    logging_level: str = "INFO"

    model_config = {
        "env_file": str(Path(__file__).parent / ".env"),
        "env_file_encoding": "utf-8",
    }

    def get_repo_list_path(self):
        return f"{self.aggregated_data_prefix}/repo_list/repo_list.json"

    def get_repo_comparison_path(self, interval):
        return f"{self.aggregated_data_prefix}/repo_comparison/{interval}.json"

    def get_primary_languages_path(self, interval):
        return f"{self.aggregated_data_prefix}/primary_langs_counts/{interval}.json"
    
    def get_repo_counts_path(self, interval):
        return f"{self.aggregated_data_prefix}/repo_counts/{interval}.json"