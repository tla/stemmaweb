from typing import IO

from werkzeug.datastructures import FileStorage, ImmutableMultiDict


def files_to_bytes(files: ImmutableMultiDict[str, FileStorage]) -> dict[str, IO[bytes]]:
    """
    Convert a dictionary of `werkzeug.datastructures.FileStorage`
    objects to a dictionary of bytes.

    :param files: A dictionary of `werkzeug.datastructures.FileStorage` objects.
    :return: A dictionary of bytes.
    """
    return {key: value.stream for key, value in files.items()}
