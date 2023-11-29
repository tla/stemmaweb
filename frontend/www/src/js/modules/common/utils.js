/**
 * Creates a `script` tag dynamically with the site key sourced from `env.js`.
 * This tag gets added to the document's `head` element automatically.
 */
function injectCaptchaScript() {
  const script = document.createElement('script');
  script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
  document.head.appendChild(script);
}

/**
 * Executes an arbitrary callback function with reCAPTCHA guard. The response
 * token gets injected into the callback function as the first argument. The
 * executed action's name needs to be supplied as the `action` argument of this
 * function.
 *
 * @param action {string} The name of the action to be executed.
 * @param callback {(token: string) => void} The callback function to be
 *   executed.
 */
function executeWithCaptcha(action, callback) {
  grecaptcha.ready(() => {
    grecaptcha.execute(RECAPTCHA_SITE_KEY, { action }).then((token) => {
      callback(token);
    });
  });
}

/**
 * Gets a CSS style sheet by its name.
 *
 * @param {string} name The name of the style sheet.
 * @returns {CSSStyleSheet | null} The style sheet or null if it doesn't exist.
 */
function getStyleSheet(name) {
  for (const sheet of document.styleSheets) {
    if (sheet.href && sheet.href.split('.css')[0].endsWith(name)) {
      return sheet;
    }
  }
  return null;
}

/**
 * JQuery-like function to access the DOM.
 *
 * @param query {string} The query to be executed.
 * @param all {boolean} Whether to return all elements or just the first one.
 * @returns {NodeListOf<any> | HTMLElement} The result of the query.
 */
function $(query, all = false) {
  const first_char_is_non_alpha = new RegExp('^[^A-z]');
  if (first_char_is_non_alpha.test(query)) {
    if (all) {
      return document.querySelectorAll(query);
    } else {
      return document.querySelectorAll(query);
    }
  } else {
    return document.getElementById(query);
  }
}

/**
 * Compares the properties of two objects and returns true if they are deeply
 * equal, false otherwise.
 *
 * @param {any} a - The first object to be compared.
 * @param {any} b - The second object to be compared.
 * @returns {boolean} - A boolean value indicating whether the objects are
 *   equal.
 */
function objectsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}


/**
 * Compares two strings alphbetically .
 *
 * @param {any} a - The first string to be compared.
 * @param {any} b - The second string to be compared.
 * @returns {boolean} - An integer indicating whether a comes before (-1), is equal to (0), or should follow (1) b. 
 */
function compareAlphabetic( a, b ) {
  const nameA = a.name.toUpperCase(); // ignore upper and lowercase
  const nameB = b.name.toUpperCase(); // ignore upper and lowercase
  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }
  // names must be equal
  return 0;
}