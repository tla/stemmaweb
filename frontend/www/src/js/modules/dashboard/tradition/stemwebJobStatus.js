
class StemwebJobStatus extends HTMLElement {

    constructor() {
        super();
        // Whenever a new tradition / related stemma is selected, update the table
        STEMMA_STORE.subscribe(({ tradition, selectedStemma }) => {
            this.renderJobStatus( tradition.stemweb_jobid );
        });
      }
      
    connectedCallback() {
        // this.render();
    }
    
    renderJobStatus( job_id ) {
        stemwebService.getRunResult( job_id )
            .then( this.handleJobStatusResponse )
            .then( (resp_data) => { this.render( resp_data ) } );
    }

    handleJobStatusResponse( resp ) {
        if ( resp.success ) {
            return new Promise( ( resolve, reject ) => {
                resolve( resp.data );
            });
        } else {
            StemmawebAlert.show(`Error: ${resp.message}`, 'danger');
            return new Promise( ( resolve, reject ) => {
                resolve( undefined );
            });
        }
    }



    statusTexts = {
        0: `Done`,
        1: `${job_running_indicator} Running`
    }

    mapStatus( status ) {
        return this.statusTexts[ status ] || `${job_error_indicator} Error`
    }

    jobStatusLabels = {
        job_id: 'Job',
        status: 'Status',
        result: 'Result'
    };

    metadataFromJobStatus( resp_data ) {
        const labels = this.jobStatusLabels;
        return [
          {
            label: labels.job_id,
            value: resp_data.jobid
          },
          {
            label: labels.status,
            value: this.mapStatus( resp_data.status )
          },
          { label: labels.result,
            value: resp_data.result
          }
        ]
    }


    renderJobStatusItem(item) {
        return `
            <tr>
              <td class="tradition-property-label-cell">${item.label}</td>
              <td class="tradition-property-value-cell">${item.value}</td>
            </tr>
          `;
    }
    
    render( resp_data ) {
        if ( resp_data.jobid ) {
            const statusItems = this.metadataFromJobStatus( resp_data );
            this.innerHTML = `
            <div class="position-sticky pt-2">
            <h6
                class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-2 text-muted"
            >
                <span>Job status</span>
                <!--maybe-goes-here-a-button/-->
            </h6>
            <div class="table-responsive px-3 py-1">
                <table class="table table-striped table-sm">
                <tbody id="job_status">
                ${statusItems.map( this.renderJobStatusItem).join('\n') }
                </tbody>
                </table>
            </div>

            </div>
            `;
        } else {
            this.innerHTML= '';
        }
    }
  }
  
  customElements.define('stemweb-job-status', StemwebJobStatus);
