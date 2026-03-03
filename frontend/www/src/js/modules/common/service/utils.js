/** @typedef {import('types/stemmaweb').BaseResponse} BaseResponse */

/**
 * @param baseUrl {string}
 * @param params {Record<string, string>}
 * @returns {string}
 */
function constructFetchUrl(baseUrl, params) {
  if (Object.keys(params).length === 0) {
    return baseUrl;
  }
  const queryString = Object.keys(params)
    .map(
      (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
    )
    .join('&');
  return `${baseUrl}?${queryString}`;
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
async function baseFetch(endpoint, options, params = {}) {
  try {
    const res = await fetch(constructFetchUrl(endpoint, params), options);
    const isJson = (res.headers.get('content-type') || '').includes(
      'application/json'
    );
    const isText = (res.headers.get('content-type') || '').includes(
      'text/plain'
    );
    if (res.ok) {
      if( isText ) {
        return {
          success: true,
          message: res.statusText,
          data: await res.text()
        };
      } else {
        return {
          success: true,
          message: res.statusText,
          ...(isJson ? { data: await res.json() } : {})
        };
      }
    } else {
      return {
        success: false,
        message: res.statusText,
        ...(isJson ? { data: await res.json() } : {})
      };
    }
  } catch (e) {
    console.error('Error while interacting with the middleware API:', e);
    return {
      success: false,
      message: e.message
    };
  }
}
