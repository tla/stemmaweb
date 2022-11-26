function injectCaptchaScript() {
  const script = document.createElement('script');
  script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
  document.head.appendChild(script);
}

function executeWithCaptcha(action, callback) {
  grecaptcha.ready(() => {
    grecaptcha.execute(RECAPTCHA_SITE_KEY, { action }).then((token) => {
      callback(token);
    });
  });
}
