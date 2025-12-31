from typing import TypedDict, Dict

RepoId = int

class RepoComparisonHistoryRecord(TypedDict):
    date: str
    stars: int
    forks: int
    size: int
    open_issues: int
    

class RepoComparison(TypedDict):
    name: str
    history: list[RepoComparisonHistoryRecord]


RepoComparisonAggData = Dict[RepoId, RepoComparison]
