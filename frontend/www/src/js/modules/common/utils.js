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
