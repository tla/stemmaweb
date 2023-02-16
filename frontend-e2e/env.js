/**
 * Whenever running in CI, we are setting the environment variables.
 * In CI, we are using the container names as hostnames, when running locally,
 * we access the frontend through `localhost:8888`, our reverse proxy.
 * @type {string}
 */
const CY_STEMMAWEB_FRONTEND_URL =
  process.env.CY_STEMMAWEB_FRONTEND_URL || 'http://localhost:8888/stemmaweb';

/**
 * Whenever running in CI, we are setting the environment variables.
 * In CI, we are using the container names as hostnames, when running locally,
 * we access the middleware through `localhost:8888`, our reverse proxy.
 * @type {string}
 */
const CY_STEMMAWEB_MIDDLEWARE_URL =
  process.env.CY_STEMMAWEB_MIDDLEWARE_URL ||
  'http://localhost:8888/stemmaweb/requests';

module.exports = {
  CY_STEMMAWEB_FRONTEND_URL,
  CY_STEMMAWEB_MIDDLEWARE_URL
};
