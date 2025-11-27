from fastapi import FastAPI
from mangum import Mangum

from .config import AWSConfig
from .utils import create_s3_client, running_on_lambda

running_on_lambda = running_on_lambda()

config = AWSConfig()
app = FastAPI()

@app.get("/data-tech-stats/api/repo-counts")
def get_repo_counts():
    s3_client = create_s3_client(config.profile, config.region)
    

if running_on_lambda: 
    handler = Mangum(app)