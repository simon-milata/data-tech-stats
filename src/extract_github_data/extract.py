import os
import time
import random
import logging

import requests
from urllib import parse

from .utils import running_on_lambda

if not running_on_lambda():
    from dotenv import load_dotenv

    load_dotenv()
    

GITHUB_API_TOKEN = os.getenv("GITHUB_API_TOKEN")

GITHUB_SEARCH_API_URL = "https://api.github.com/search/"

headers = {
    "User-Agent": "data-tech-stats",
    "Accept": "application/json",
    "Authorization": f"Bearer {GITHUB_API_TOKEN}"
}

if not GITHUB_API_TOKEN:
    logging.warning("Github API token not found!")


def parse_repo_data(data: list[dict]) -> list[dict]:
    parsed_data = []
    for item in data:
        repo_license = item.get("license", {})
        parsed_data.append(
            {
                "id": item["id"],
                "name": item["name"],
                "languages_url": item["languages_url"],
                "size": item["size"],
                "stars": item["stargazers_count"],
                "watchers": item["watchers_count"],
                "main_language": item["language"],
                "forks": item["forks_count"],
                "license": repo_license.get("spdx_id", None) if repo_license else "",
                "open_issues": item["open_issues_count"],
                "topics": item["topics"]
            }
        )
    return parsed_data


def get_repos_from_page(topic: str, page: int, retries: int = 0, max_retries: int = 5) -> dict:
    params = f"repositories?q=topic:{topic}&page={page}&sort=stars"
    url = parse.urljoin(base=GITHUB_SEARCH_API_URL, url=params)
    logging.debug(f"Getting data from '{url}'.")
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        if retries < max_retries:
            logging.warning(f"Response code for '{url}': {response.status_code}! Error message: '{response.text}'. Retrying.")
            time.sleep(retries)
            return get_repos_from_page(topic=topic, page=page, retries=retries + 1)
        else:
            raise Exception("Max retries reached!")
        
    logging.debug(f"Succesfully fetched data from '{url}'.")
    return response.json()


def get_all_repos_data(topics: list[str]):
    repo_counts = {}
    parsed_data = []
    for topic in topics:
        for page in range(1, 1+1):
            repos_page_data = get_repos_from_page(topic, page)
            if topic not in repo_counts:
                repo_counts["topic"] = repos_page_data["total_count"]
            parsed_page_data = parse_repo_data(repos_page_data["items"])
            parsed_data.extend(parsed_page_data)
            
            time.sleep(random.uniform(2, 3))
    return parsed_data, repo_counts