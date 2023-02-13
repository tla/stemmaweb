def match_path(path: str, endpoints: list[str]) -> str | None:
    """
    Matches an actual string path to an endpoint template.
    Partial matches are also supported meaning
    that if the path is a prefix of an item of `endpoints`,
    the item is returned.

    For example, the path "/tradition/123" matches "/tradition/{tradId}".

    Note that the currently implemented matching logic is highly permissive,
    since we are checking prefix equality. That is, "/tradition/123/*" will
    match "/tradition/{tradId}" for an arbitrarily deep nesting level.

    :param path: The path to match.
    :param endpoints: The list of endpoint templates to match against.
    :return: The matching endpoint template or `None` if no match is found.
    """
    for endpoint in endpoints:
        first_segment = endpoint.split("/")[1]
        if path.startswith(f"/{first_segment}"):
            return endpoint
    return None
