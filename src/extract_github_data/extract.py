import os
import time
import random
import logging

from urllib import parse

from .utils import running_on_lambda, make_get_request

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


def get_repos_from_page(topic: str, page: int) -> dict:
    params = f"repositories?q=topic:{topic}&page={page}&sort=stars"
    url = parse.urljoin(base=GITHUB_SEARCH_API_URL, url=params)
    logging.debug(f"Getting data from '{url}'.")
    
    response = make_get_request(url=url, headers=headers)
        
    return response.json()


def get_languages(languages_url: str) -> dict[str, int]:
    logging.debug(f"Fetching languages from '{languages_url}'.")
    response = make_get_request(url=languages_url, headers=headers)

    return response.json()


def get_all_repos_data(topics: list[str]) -> tuple[list[dict], dict, list[dict]]:
    language_data = []
    repo_counts = {}
    parsed_data = []
    for topic in topics:
        for page in range(1, 1+1):
            repos_page_data = get_repos_from_page(topic, page)
            if topic not in repo_counts:
                repo_counts["topic"] = repos_page_data["total_count"]

            parsed_page_data = parse_repo_data(repos_page_data["items"])
            parsed_data.extend(parsed_page_data)

            if not page == 1:
                # Only add a delay when not getting languages
                time.sleep(random.uniform(1, 3))
                continue

            # Only get language data from the first page to avoid many API calls
            for repo in parsed_page_data:
                repo_languages = get_languages(repo["languages_url"])
                language_data.append({
                    "repo_id": repo["id"], 
                    "repo_name": repo["name"], 
                    "languages": repo_languages
                })
            
    return parsed_data, repo_counts, language_data