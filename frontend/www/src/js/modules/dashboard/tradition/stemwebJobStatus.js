
class StemwebJobStatus extends HTMLElement {
    constructor() {
        super();
    }
  
    connectedCallback() {
        this.render();
    }
    
    render() {
        const jobStatus = 'Hello World!'
        this.innerHTML = `
        <div class="position-sticky pt-3">
        <h6
            class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted"
        >
            <span>Job status</span>
            <!--maybe-goes-here-a-button/-->
        </h6>
        <div class="table-responsive px-3 py-3">
            <table class="table table-striped table-sm">
            <tbody id="job_status">
            ${jobStatus}
            </tbody>
            </table>
        </div>

        </div>
        `;
    }
  }
  
  customElements.define('stemweb-job-status', StemwebJobStatus);
