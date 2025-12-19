from extract_github_data.utils import transform_lang_list_long


def test_transform_lang_list_long_multiple_languages():
    input_data = {
        "repo_id": 1,
        "repo_name": "repo-1",
        "languages": {
            "Python": 1500,
            "JavaScript": 500
        }
    }

    result = transform_lang_list_long(input_data)

    assert result == [
        {
            "repo_id": 1,
            "repo_name": "repo-1",
            "language": "Python",
            "bytes": 1500
        },
        {
            "repo_id": 1,
            "repo_name": "repo-1",
            "language": "JavaScript",
            "bytes": 500
        }
    ]


def test_transform_lang_list_long_single_language():
    input_data = {
        "repo_id": 2,
        "repo_name": "repo-1",
        "languages": {
            "Go": 2048
        }
    }

    result = transform_lang_list_long(input_data)

    assert result == [
        {
            "repo_id": 2,
            "repo_name": "repo-1",
            "language": "Go",
            "bytes": 2048
        }
    ]
