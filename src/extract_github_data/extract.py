import os
import time
import logging

from urllib import parse

from .utils import running_on_lambda, make_get_request, get_scaled_delay

if not running_on_lambda():
    from dotenv import load_dotenv

    load_dotenv()
    

GITHUB_API_TOKEN = os.getenv("GITHUB_API_TOKEN")
RESULTS_PER_PAGE = int(os.getenv("RESULTS_PER_PAGE", 100))
PAGES_PER_TOPIC = int(os.getenv("PAGES_PER_TOPIC", 10))

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
    params = f"repositories?q=topic:{topic}&page={page}&sort=stars&per_page={RESULTS_PER_PAGE}"
    url = parse.urljoin(base=GITHUB_SEARCH_API_URL, url=params)
    logging.debug(f"Getting data from '{url}'.")
    
    response = make_get_request(url=url, headers=headers)
        
    return response.json()


def get_languages(languages_url: str) -> dict[str, int]:
    logging.debug(f"Fetching languages from '{languages_url}'.")
    response = make_get_request(url=languages_url, headers=headers)

    return response.json()


def fetch_repos_per_topic(topic: str) -> tuple[list[dict], int]:
    """Fetches total repo counts and repo data for all pages for a topic"""
    topic_repo_data = []
    for page in range(1, PAGES_PER_TOPIC+1):
        repos_page_data = get_repos_from_page(topic, page)

        parsed_page_data = parse_repo_data(repos_page_data["items"])
        topic_repo_data.extend(parsed_page_data)

        if page == 1:
            repo_counts = repos_page_data["total_count"]

        if page != PAGES_PER_TOPIC: # Don't sleep after last page
            time.sleep(get_scaled_delay(RESULTS_PER_PAGE))
        
    logging.info(f"Scraped repo data from {PAGES_PER_TOPIC} pages for topic '{topic}'.")
    return topic_repo_data, repo_counts


def fetch_language_data(repo_data: list[dict]) -> list[dict]:
    """Fetches language data for each repo on the first page of repos for each topic"""
    language_data = []
    for repo in repo_data:
        repo_languages = get_languages(repo["languages_url"])
        language_data.append({
            "repo_id": repo["id"], 
            "repo_name": repo["name"], 
            "languages": repo_languages
        })
    return language_data


def get_all_repos_data(topics: list[str]) -> tuple[list[dict], dict, list[dict]]:
    language_data = []
    repo_counts = {}
    repos_data = []
    for topic in topics:
        topic_repo_data, topic_repo_counts = fetch_repos_per_topic(topic)
        repos_data.extend(topic_repo_data)
        repo_counts[topic] = topic_repo_counts
        # Only get language data from the first page to reduce API calls
        page_language_data = fetch_language_data(topic_repo_data[:RESULTS_PER_PAGE])
        language_data.extend(page_language_data)
            
    return repos_data, repo_counts, language_data