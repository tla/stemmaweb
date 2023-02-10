/** @typedef {import('types/stemmaweb').BaseResponse} BaseResponse */

/**
 * Base service class to handle the common functionality of all services, such
 * as endpoint construction, error handling, URI encoding, etc.
 */
class BaseService {
  /**
   * Creates a new `BaseService` instance.
   *
   * @param {string} baseUrl - URL to the contacted API.
   */
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  /**
   * Constructs the full URL to be used for a request to the Stemmarest API
   * based on the supplied `pathSegment`.
   *
   * @param {string} pathSegment - The path segment to be appended to the base
   *   URL.
   * @returns {string} Full URL to be used for a request to the API, using URI
   *   encoding.
   */
  endpoint(pathSegment) {
    const rawEndpoint = `${this.baseUrl}${pathSegment}`;
    return encodeURI(rawEndpoint);
  }

  /**
   * Utility function to fetch a specific endpoint.
   *
   * @template T
   * @function
   * @param endpoint {string} The endpoint to fetch.
   * @param options {RequestInit | undefined} The options to pass to the fetch
   *   call.
   * @param params {Record<string, string>} Query parameters to pass to the
   *   endpoint.
   * @returns {Promise<BaseResponse<T>>} The response from the fetch call.
   */
  fetch(endpoint, options = { method: 'GET' }, params = {}) {
    return baseFetch(`${this.endpoint(endpoint)}`, options, params).catch(
      this.#handleFetchError
    );
  }

  /**
   * Generic way to handle errors from the fetch API.
   *
   * @param {any} errorReason - The reason for the error
   */
  #handleFetchError(errorReason) {
    console.error(
      "Error while interacting with the middleware's API:",
      errorReason
    );
  }
}
