from urllib.parse import urlparse


def hostname_from_url(url: str) -> str:
    """
    Extract the hostname from a URL.
    :param url: The URL to extract the hostname from.
    :return: The hostname.
    """
    hostname = urlparse(url).hostname
    if hostname is None:
        raise ValueError(f"Failed to extract hostname from URL: {url}")
    return hostname
