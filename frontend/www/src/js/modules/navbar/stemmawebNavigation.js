class StemmawebNavigation extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
    <header
      class="navbar navbar-dark sticky-top bg-dark flex-md-nowrap p-0 shadow"
    >
      <a class="navbar-brand col-md-4 col-lg-2 me-0 px-3" href="#"
        >Stemmaweb
        <span class="brand-dark"
          >— a collection of tools for the analysis of collated texts</span
        ></a
      >
      <button
        class="navbar-toggler position-absolute d-md-none collapsed"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#sidebarMenu"
        aria-controls="sidebarMenu"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <!-- disabled search bar. Looks cool, but we have no use for it at this moment. -->
      <!--input class="form-control form-control-dark w-100" type="text" placeholder="Search" aria-label="Search"-->
      <div class="d-flex flex-row-reverse">
        <div class="navbar-nav">
          <div class="nav-item text-nowrap">
            <a class="nav-link px-3" href="#">About</a>
          </div>
        </div>
        <div class="navbar-nav">
          <div class="nav-item text-nowrap">
            <a class="nav-link px-3" href="#">Sign out</a>
          </div>
        </div>
        <div class="navbar-nav">
          <div class="nav-item text-nowrap">
            <a class="nav-link px-3" href="#">Hello User</a>
          </div>
        </div>
      </div>
    </header>
    `;
  }
}
customElements.define('stemmaweb-navigation', StemmawebNavigation);