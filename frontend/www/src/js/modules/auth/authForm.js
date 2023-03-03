/**
 * @typedef {import('@types/stemmaweb').BaseResponse} BaseResponse
 *
 * @typedef {import('@types/stemmaweb').StemmawebUser} StemmawebUser
 */

/**
 * Object to interact with the Stemmarest Middleware's API through high-level
 * functions.
 *
 * @type {StemmarestService}
 */
const authFormService = stemmarestService;

/** Namespace for constants to be used to label actions for Google reCAPTCHA. */
class AuthActionName {
  static LOGIN_WITH_EMAIL = 'login_with_email';
  static REGISTER_WITH_EMAIL = 'register_with_email';
}

class SocialLoginOptions extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
      <a class="btn btn-link btn-floating mx-1"
         href="${authFormService.oAuthHrefGoogle}"
         target="_blank">
        <i>${google_icon}</i>
      </a>
      <a class="btn btn-link btn-floating mx-1"
         href="${authFormService.oAuthHrefGithub}"
         target="_blank">
        <i>${github_icon}</i>
      </a>
    `;
  }
}

customElements.define('social-login-options', SocialLoginOptions);

class LoginForm extends HTMLElement {
  static ID = 'login';
  static FIELD_IDS = {
    email: 'loginEmail',
    password: 'loginPassword'
  };

  constructor() {
    super();
    this.active = 'false';
  }

  static get observedAttributes() {
    return ['active'];
  }

  /** @returns {{ email: string; password: string }} */
  static get fieldValues() {
    return Object.entries(this.FIELD_IDS).reduce(
      (acc, [fieldName, fieldId]) => {
        acc[fieldName] = document.getElementById(fieldId).value;
        return acc;
      },
      {}
    );
  }

  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[property] = newValue;
  }

  static handleSubmit(event) {
    event.preventDefault();
    const form = this.querySelector( 'login-form form' );
    if ( !form.checkValidity() ) {
      form.classList.add('was-validated');
      return;
    }
    const values = LoginForm.fieldValues;
    executeWithCaptcha(AuthActionName.LOGIN_WITH_EMAIL, (token) => {
      authFormService
        .loginUser({
          recaptcha_token: token,
          id: values.email,
          passphrase: values.password
        })
        .then(LoginForm.#onResponse, LoginForm.#onError)
        .catch(console.error);
    });
  }

  /** @param response {BaseResponse<StemmawebUser>} response from the server */
  static #onResponse(response) {
    // Login credentials are correct
    if (response.success) {
      StemmawebAlert.show(
        `<strong>Success:</strong> You are logged in!`,
        'success'
      );
      /** @type {import('@types/stemmaweb').StemmawebUser} */
      const user = response.data;
      delete user.passphrase;
      AUTH_STORE.setUser(user);
      AuthModal.close();
    } else {
      // The server responded, but does not allow a login
      // Might be caused by invalid credentials or too low captcha score
      StemmawebAlert.show(
        `<strong>Error:</strong> Unable to login. Please try again.`,
        'danger'
      );
    }
  }

  static #onError() {
    // Error in communication with the server
    StemmawebAlert.show(
      `<strong>Error</strong> failed to get server response`,
      'danger'
    );
  }

  connectedCallback() {
    this.render();
    this.addEventListener('submit', LoginForm.handleSubmit);
  }

  render() {
    this.innerHTML = `
      <div class="tab-pane fade ${
        this.active === 'true' ? 'show active' : 'd-none'
      }"
           id="${LoginForm.ID}"
           role="tabpanel"
           aria-labelledby="tab-login">
        <form class="needs-validation" novalidate="">
          <div class="text-center mb-3">
            <p>Sign in with:</p>
            <social-login-options></social-login-options>
          </div>

          <p class="text-center">or:</p>

          <!-- Email input -->
          <div class="mb-4">
            <label for="${LoginForm.FIELD_IDS.email}" class="form-label">Email</label>
            <br/>
            <input id="${LoginForm.FIELD_IDS.email}"
                   type="email"
                   class="form-control has-validation"
                   required>
             <div class="invalid-feedback">Please provide an email address.</div>
          </div>

          <!-- Password input -->
          <div class="mb-4">
            <label for="${LoginForm.FIELD_IDS.password}" class="form-label">Password</label>
            <br/>
            <input id="${LoginForm.FIELD_IDS.password}"
                   type="password"
                   class="form-control has-validation"
                   required>
            <div class="invalid-feedback">Please provide a password.</div>
          </div>

          <!-- Submit button -->
          <button type="submit" class="btn btn-primary btn-block mb-4">Sign in</button>

          <!-- Register buttons -->
          <div class="text-center">
            <p>No account yet?
            <a href="#${RegisterForm.ID}" onclick="AuthForm.setMode('register')">Register</a>
            </p>
          </div>

        </form>
      </div>
    `;
  }
}

customElements.define('login-form', LoginForm);

class RegisterForm extends HTMLElement {
  static ID = 'register';

  static FIELD_IDS = {
    email: 'registerEmail',
    password: 'registerPassword',
    confirmPassword: 'registerConfirmPassword'
  };

  constructor() {
    super();
    this.active = 'false';
  }

  static get observedAttributes() {
    return ['active'];
  }

  /** @returns {{ email: string; password: string; confirmPassword: string }} */
  static get fieldValues() {
    return Object.entries(this.FIELD_IDS).reduce(
      (acc, [fieldName, fieldId]) => {
        acc[fieldName] = document.getElementById(fieldId).value;
        return acc;
      },
      {}
    );
  }

  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[property] = newValue;
  }

  static handleSubmit(event) {
    event.preventDefault();
    const form = this.querySelector( 'register-form form' );
    if ( !form.checkValidity() ) {
      form.classList.add('was-validated');
      return;
    }
    const values = RegisterForm.fieldValues;
    /**
     * @todo: make warning style in-form.
     */
    if (values.password !== values.confirmPassword) {
      StemmawebAlert.show(
        `<strong>Error:</strong> Passwords do not match.`,
        'warning'
      );
      return;
    }
    executeWithCaptcha(AuthActionName.REGISTER_WITH_EMAIL, (token) => {
      authFormService
        .registerUser({
          recaptcha_token: token,
          active: true,
          id: values.email,
          email: values.email,
          // TODO: Differentiate between roles
          role: 'user',
          passphrase: values.password
        })
        .then(RegisterForm.#onResponse, RegisterForm.#onError)
        .catch(console.error);
    });
  }

  /** @param response {BaseResponse<StemmawebUser>} response from the server */
  static #onResponse(response) {
    // Registration DTO was accepted by the server and the user was created
    if (response.success) {
      StemmawebAlert.show(
        `<strong>Success:</strong> You can log in now!`,
        'success'
      );
      AuthForm.setMode('login');
    } else {
      // The server responded, but does not allow a registration
      StemmawebAlert.show(
        `<strong>Error:</strong> Unable to register. Please try again.`,
        'danger'
      );
    }
  }

  static #onError(e) {
    console.error(e);
    // Error in communication with the server
    StemmawebAlert.show(
      `<strong>Error</strong> failed to get server response`,
      'danger'
    );
  }

  connectedCallback() {
    this.render();
    this.addEventListener('submit', RegisterForm.handleSubmit);
  }

  render() {
    this.innerHTML = `
      <div
          class="tab-pane fade ${
            this.active === 'true' ? 'show active' : 'd-none'
          }"
          id="${RegisterForm.ID}"
          role="tabpanel"
          aria-labelledby="tab-register">
          <form class="needs-validation" novalidate="">
            <div class="text-center mb-3">
              <p>Sign up with:</p>
              <social-login-options></social-login-options>
            </div>

            <p class="text-center">or:</p>

            <!-- Email input -->
            <div class="mb-4">
              <label for="${RegisterForm.FIELD_IDS.email}" class="form-label">Email</label>
              <br/>
              <input id="${RegisterForm.FIELD_IDS.email}"
                     type="email"
                     class="form-control has-validation"
                     required>
              <div class="invalid-feedback">Please provide an email address.</div>
            </div>

            <!-- Password input -->
            <div class="mb-4">
              <label for="${RegisterForm.FIELD_IDS.password}" class="form-label">Password</label>
              <br/>
              <input id="${RegisterForm.FIELD_IDS.password}"
                     type="password"
                     class="form-control has-validation"
                     required>
              <div class="invalid-feedback">Please provide a strong password.</div>
            </div>

            <!-- Confirm Password input -->
            <div class="mb-4">
              <label for="${
                RegisterForm.FIELD_IDS.confirmPassword
              }" class="form-label">Confirm password</label>
              <br/>
              <input id="${RegisterForm.FIELD_IDS.confirmPassword}"
                     type="password"
                     class="form-control has-validation"
                     required>
              <div class="invalid-feedback">Please retype password.</div>
            </div>

            <!-- Submit button -->
            <button type="submit" class="btn btn-primary btn-block mb-4">Sign Up</button>

            <!-- Register buttons -->
            <div class="text-center">
              <p>Have an account already?
                <a href="#${RegisterForm.ID}" onclick="AuthForm.setMode('login')">Login</a>
              </p>
            </div>
  
          </form>
        </div>
    `;
  }
}

customElements.define('register-form', RegisterForm);

class AuthForm extends HTMLElement {
  constructor() {
    super();
    this.mode = 'login';
  }

  static get observedAttributes() {
    return ['mode'];
  }

  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[property] = newValue;
    this.render();
  }

  inLoginMode() {
    return this.mode === 'login';
  }

  static setMode(mode) {
    document.querySelector('auth-form').setAttribute('mode', mode);
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
    <div class="tab-content">
      <login-form active=${this.inLoginMode() ? 'true' : 'false'}></login-form>
      <register-form active=${
        !this.inLoginMode() ? 'true' : 'false'
      }></register-form>
    </div>
    `;
  }
}

customElements.define('auth-form', AuthForm);

class AuthModal extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  static close() {
    document.querySelector('auth-modal .btn-close').click();
  }

  render() {
    this.innerHTML = `
    <div class="modal fade" id="authModal" tabindex="-1" aria-labelledby="authModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="authModalLabel">Sign in to Stemmaweb</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mt-4 container">
              <div class="row justify-content-center align-items-center">
                <div class="col-sm-12 col-md-8 col-lg-10">
                  <auth-form></auth-form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    `;
  }
}

customElements.define('auth-modal', AuthModal);
