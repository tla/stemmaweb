import datetime
from collections import defaultdict
from typing import Protocol

import schedule
from loguru import logger

from .models import StemwebJobResult


class StemwebJobServiceBase(Protocol):
    """
    Service class base to manage the serving of Stemweb job results to users.
    Whenever the Stemweb API POSTs a job result to the middleware (this project)
    we associate the result with the user who submitted the job.
    This way, whenever a user is polling for a job result,
    we can return the results to them by their user id.
    """

    def add_job_result(self, user_id: str, job_result: StemwebJobResult):
        """
        Adds a job result to the job results dictionary.
        :param user_id: the user id to associate the job result with
        :param job_result: the job result to add
        """
        raise NotImplementedError

    def get_job_results(self, user_id: str) -> list[StemwebJobResult]:
        """
        Gets the job results for a user.
        :param user_id: the user id to get the job results for
        :return: the job results for the user
        """
        raise NotImplementedError


class StemwebJobService(StemwebJobServiceBase):
    """
    An in-memory dictionary-based implementation of `StemwebJobServiceBase`.
    Based on the size of the user base and the frequency of job submissions,
    this may need to be replaced with a database-based implementation for scalability.
    """

    __CLEAR_INTERVAL_MINUTES__ = 12 * 60

    def __init__(self):
        # Key: user id, Value: list of job results
        self.job_results: dict[str, list[StemwebJobResult]] = defaultdict(list)
        self.__init_clearing_scheduler()

    def add_job_result(self, user_id: str, job_result: StemwebJobResult):
        logger.debug(f"Adding job result for user {user_id}")
        self.job_results[user_id].append(job_result)

    def get_job_results(self, user_id: str) -> list[StemwebJobResult]:
        logger.debug(f"Getting job results for user {user_id}")
        return self.job_results[user_id]

    def __init_clearing_scheduler(self):
        """
        Initializes the clearing scheduler.
        """
        logger.debug(
            "Initializing clearing scheduler to clear job results. "
            f"Interval: {datetime.timedelta(minutes=self.__CLEAR_INTERVAL_MINUTES__)}"
        )
        schedule.every(self.__CLEAR_INTERVAL_MINUTES__).minutes.do(
            self.__clear_job_results
        )

    def __clear_job_results(self):
        """
        Clears the job results dictionary.
        """
        logger.info(
            f"Clearing job results. {len(self.job_results)} users are affected."
        )
        self.job_results = {}
