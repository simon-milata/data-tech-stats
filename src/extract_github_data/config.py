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
    aws_profile_name: str = "default"
    aws_region_name: str = "eu-central-1"
    logging_level: str = "INFO"
    
    model_config = {
        "env_file": str(Path(__file__).parent / ".env"),
        "env_file_encoding": "utf-8",
    }

settings = Settings()