from urllib.parse import urlparse


def url_is_valid(url: str) -> bool:
    """
    Check if a URL is valid.

    :param url: The URL to check.
    :return: True if the URL is valid, False otherwise.
    """
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except ValueError:
        return False
