/**
 * Object to interact with the Stemmarest Middleware's API through high-level
 * functions.
 *
 * @type {StemmarestService}
 */
const stemmarestService = new StemmarestService(STEMMAWEB_MIDDLEWARE_URL);

/**
 * Object to interact with the Stemweb Middleware's API through high-level
 * functions.
 *
 * @type {StemwebService}
 */
const stemwebService = new StemwebService(
  `${STEMMAWEB_MIDDLEWARE_URL}/stemweb`
);
