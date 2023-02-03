/** @typedef {import('types/stemmaweb').BaseResponse} BaseResponse */

/**
 * Service class to interact with the Stemweb API through high-level functions.
 * The main purpose of this class is to encapsulate the logic needed for
 * communication with the REST API, such as where the REST API is deployed and
 * what endpoints are available.
 *
 * {@link https://github.com/DHUniWien/Stemweb|Stemweb Project}
 */
class StemwebService extends BaseService {
  /** @param {string} baseUrl The base URL of the Stemweb API. */
  constructor(baseUrl) {
    super(baseUrl);
  }
}
