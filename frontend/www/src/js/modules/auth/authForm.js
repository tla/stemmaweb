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
      <button type="button" class="btn btn-link btn-floating mx-1">
        <i>${google_icon}</i>
      </button>
      <button type="button" class="btn btn-link btn-floating mx-1">
        <i>${github_icon}</i>
      </button>
    `;
  }
}

customElements.define('social-login-options', SocialLoginOptions);

class LoginForm extends HTMLElement {
  static ID = 'login';

  constructor() {
    super();
    this.active = 'false';
  }

  static get observedAttributes() {
    return ['active'];
  }

  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[property] = newValue;
  }

  static handleSubmit(event) {
    event.preventDefault();
    executeWithCaptcha(AuthActionName.LOGIN_WITH_EMAIL, (token) => {
      authFormService
        .loginUser({
          recaptcha_token: token,
          id: 'test@lol.com',
          passphrase: 'test'
        })
        .then(console.log);
    });
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
        <form>
          <div class="text-center mb-3">
            <p>Sign in with:</p>
            <social-login-options></social-login-options>
          </div>

          <p class="text-center">or:</p>

          <!-- Email input -->
          <div class="form-floating mb-4">
            <input id="loginEmail" type="email" class="form-control" placeholder="Email" required>
            <label for="loginEmail">Email</label>
          </div>

          <!-- Password input -->
          <div class="form-floating mb-4">
            <input id="loginPassword" type="password" class="form-control" placeholder="Password" required>
            <label for="loginPassword">Password</label>
          </div>

          <!-- Submit button -->
          <button type="submit" class="btn btn-primary btn-block mb-4">Sign in</button>

          <!-- Register buttons -->
          <div class="text-center">
            <p>No account yet?
            <a href="#${RegisterForm.ID}"
               onclick="AuthForm.setMode('register')">Register
            </a>
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
  constructor() {
    super();
    this.active = 'false';
  }

  static get observedAttributes() {
    return ['active'];
  }

  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[property] = newValue;
  }

  static handleSubmit(event) {
    event.preventDefault();
    executeWithCaptcha(AuthActionName.REGISTER_WITH_EMAIL, (token) => {
      authFormService
        .registerUser({
          recaptcha_token: token,
          active: true,
          email: 'testlol.com',
          id: 'test@lol.com',
          role: 'user',
          passphrase: 'test'
        })
        .then(console.log);
    });
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
          aria-labelledby="tab-register"
        >
          <form>
            <div class="text-center mb-3">
              <p>Sign up with:</p>
              <social-login-options></social-login-options>
            </div>

            <p class="text-center">or:</p>

            <!-- Email input -->
            <div class="form-floating mb-4">
              <input id="registerEmail" type="email" class="form-control" placeholder="Email" required>
              <label for="registerEmail">Email</label>
            </div>

            <!-- Password input -->
            <div class="form-floating mb-4">
              <input id="registerPassword" type="password" class="form-control" placeholder="Password" required>
              <label for="registerPassword">Password</label>
            </div>

            <!-- Repeat Password input -->
            <div class="form-floating mb-4">
              <input id="registerRepeatPassword" type="password" class="form-control" placeholder="Repeat password" required>
              <label for="registerRepeatPassword">Repeat password</label>
            </div>

            <!-- Submit button -->
            <button type="submit" class="btn btn-primary btn-block mb-4">Sign Up</button>
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

  setMode(mode) {
    this.mode = mode;
  }

  static setMode(mode) {
    document.querySelector('auth-form').setAttribute('mode', mode);
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
    <!-- Pills navs -->
    <ul class="nav nav-pills nav-justified mb-3" id="ex1" role="tablist">
      <li class="nav-item" role="presentation">
        <a
          class="nav-link ${this.inLoginMode() ? 'active' : ''}"
          id="tab-login"
          data-mdb-toggle="pill"
          role="tab"
          aria-controls="${LoginForm.ID}"
          aria-selected="${this.inLoginMode()}"
          onclick="AuthForm.setMode('login')"
          >Login</a
        >
      </li>
      <li class="nav-item" role="presentation">
        <a
          class="nav-link ${!this.inLoginMode() ? 'active' : ''}"
          id="tab-register"
          data-mdb-toggle="pill"
          role="tab"
          aria-controls="${RegisterForm.ID}"
          aria-selected="${!this.inLoginMode()}"
          onclick="AuthForm.setMode('register')"
          >Register</a
        >
      </li>
    </ul>
    <!-- Pills navs -->

    <!-- Pills content -->
    <div class="tab-content">
      <login-form active=${this.inLoginMode() ? 'true' : 'false'}></login-form>
      <register-form active=${
        !this.inLoginMode() ? 'true' : 'false'
      }></register-form>
    </div>
    <!-- Pills content -->
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

  render() {
    this.innerHTML = `
    <div class="modal fade" id="authModal" tabindex="-1" aria-labelledby="authModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-fullscreen">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="authModalLabel">Login</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mt-4 container">
              <div class="row justify-content-center align-items-center">
                <div class="col-sm-12 col-md-8 col-lg-6">
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
