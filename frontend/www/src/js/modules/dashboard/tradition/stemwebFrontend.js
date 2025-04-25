/** @typedef {import('@types/stemmaweb').BaseResponse} BaseResponse */

// This class does not extend HTMLElement because the added html element causes the buttons in
// in stemmaButtons.js not to line up neatly. So it's just a class that is associated with
// the button through the constructor.
class StemwebFrontend {

  #algorithmSelect;
  #stemwebAlgorithmInfos;

  toStemwebAlgorithmInfo( algorithmFromResponse ){
      const algorithmInfo = { 
        name: algorithmFromResponse.fields.name,
        desc: algorithmFromResponse.fields.desc,
        order: algorithmFromResponse.pk
      };
      var metaItems = algorithmFromResponse.fields.args.filter( arg => { return arg.fields.external==true } )
      metaItems = metaItems.map( arg => { 
          return {
            label: arg.fields.name,
            value: '',
            inputOptions: { control: 'text', size: 10, required: true, dataType: arg.fields.value }
          } 
        } 
      );
      algorithmInfo.metaItems = metaItems
      return algorithmInfo
  }

  constructor() {
    stemwebService.listAvailableAlgorithms().then( ( responseResult ) => {
      if( typeof responseResult.success == 'undefined' ) {
        this.#stemwebAlgorithmInfos = responseResult.map( this.toStemwebAlgorithmInfo );
        this.#stemwebAlgorithmInfos.sort( (a,b) => a.order - b.order );
        //// As long as there aren't any real arguments (only RHM has one)
        //// it is probably useful to have this test additions here to gauge behavior.
        // this.#stemwebAlgorithmInfos[1].metaItems.push( {
        //   label: 'test1',
        //   value: 'test value 1',
        //   inputOptions: { control: 'text', size: 10, required: true, dataType: 'string' }
        // });
        // this.#stemwebAlgorithmInfos[1].metaItems.push( {
        //   label: 'test2',
        //   value: 'test value 2',
        //   inputOptions: { control: 'text', size: 10, required: true, dataType: 'string' }
        // });
        const algorithmSelectOptions = this.#stemwebAlgorithmInfos.map( algorithmInfo => { return { value: algorithmInfo.order, display: algorithmInfo.name } } );
        const algorithmSelectControl = {
          label: 'Algorithm to run',
          value: 'algorithmChosen',
          inputOptions: { 
            control: 'dropdown', 
            selectOptions: algorithmSelectOptions,
            selected: algorithmSelectOptions[0].value
          }
        } 
        this.#algorithmSelect = formControlFactory.renderFormControl( algorithmSelectControl );
      } else {
        // If there is a succes property it is always false, which means something went wrong.
        // TODO: What should this mean? Hide button? Report "Not available" in dialog?
        console.error( `Failed to fetch StemWeb algorithms: ${responseResult.message}.` );
      }
    } );
  }

  get algorithmSelect() {
    return this.#algorithmSelect;
  }

  get stemwebAlgorithmInfos() {
    return this.#stemwebAlgorithmInfos;
  }

  mapToHTMLTable( arr ) {
    var rows = Array();
    var cells; 
    while( ( cells = arr.splice( 0, 3 ) ).length > 0 ){
      cells = cells.map( (control) => { return `<td>${control}</td>` } );
      cells = `<tr>${cells.join('')}</tr>`;
      rows.push( cells );
    } 
    if( rows.length > 0 ) {
      const variantControlsLabel = `<label for="variant-types-controls" id="variant-types-controls-label" class="form-label">
          Include variants of type:
        </label>\n`
      return `${variantControlsLabel}<table class="variant-types-controls">${rows.join('\n')}</table>`;
    } else {
      return '';
    }
  }

  setRelationTypesControls() {
    stemmarestService.listRelationTypes( TRADITION_STORE.state.selectedTradition.id )
      .then( (resp) => { 
        if( resp.success ) {
          const metaItems = resp.data.map( variantTypeItem => { return {
              label: variantTypeItem.name,
              value: variantTypeItem.name,
              inputOptions: { 
                control: 'checkbox', 
                checked: true,
                label: variantTypeItem.name
              }
          } });
          const controls = metaItems.map( 
            metaItem => { return formControlFactory.renderFormControl( metaItem ) }
          );
          var controlsHTML = stemwebFrontend.mapToHTMLTable( controls );
          document.querySelector( '#algorithm-variants-panel' ).innerHTML = controlsHTML; 
        } else {
          StemmawebAlert.show(`Error: ${res.message}`, 'danger');
        }
    });
  }

  setDescriptionAndControls( evt ) {
    const algorithmInfo = stemwebFrontend.stemwebAlgorithmInfos.filter( info => info.order==evt.target.value )[0]
    const argControls = algorithmInfo.metaItems.map( formControlFactory.renderFormControl ).join( '\n' );
    document.querySelector( '#algorithm-info' ).innerHTML = algorithmInfo.desc; 
    const argsElement = document.querySelector( '#algorithm-args' )
    argsElement.innerHTML = argControls; 
    fadeIn( argsElement );
  }

  showDialog() {
    const info_html = `
        <p>
          <img id="logo_hiit" src="images/logo_hiit.jpg"></image>
          <img id="logo_eadh" src="images/logo_eadh-150.png"></image>
        </p>
        <p>Stemweb is a webservice provided by the Helsinki Institute for Information Technology HIIT. 
        The integration into Stemmaweb was generously supported by a small project grant from the 
        European Association for Digital Humanities.</p>`
    const modal_body = `
    ${info_html}
    <form
        id="run-stemweb-form"
        class="needs-validation"
        novalidate=""
    >
      <span data-bs-toggle="collapse" data-bs-target="#algorithm-info-panel">
        ${feather.icons['info'].toSvg()}
      </span>
      ${stemwebFrontend.algorithmSelect}
      <div class="collapse" id="algorithm-info-panel">
        <div id="algorithm-info">${stemwebFrontend.stemwebAlgorithmInfos[0].desc}</div>
      </div>
      <div id="algorithm-args-panel">
        <div id="algorithm-args">${stemwebFrontend.stemwebAlgorithmInfos[0].metaItems.map( formControlFactory.renderFormControl ).join( '\n' )}</div>
      </div>
      <div id="algorithm-variants-panel">
      </div>
    </form>
    `;
    StemmawebDialog.show(
      'Generate a Stemweb tree',
      modal_body,
      {    
        onOk: () => { stemwebFrontend.processForm() }
      },
      {
        okLabel: 'Run',
        okType: 'primary',
        closeLabel: 'Cancel',
        closeType: 'secondary'
      }
    );
    document.querySelector( 'select#algorithm-to-run_input' ).addEventListener( 'change', stemwebFrontend.setDescriptionAndControls );
    stemwebFrontend.setRelationTypesControls();
  }

  processForm() {
    const tradId = TRADITION_STORE.state.selectedTradition.id;
    const userId = AUTH_STORE.state.user ? AUTH_STORE.state.user.id : null;
    const algorithmId =  $('algorithm-to-run_input').value;
    const algorithmArgs = Array.from( $('#algorithm-args input') ).map(
      (input_element) => [ input_element.name, input_element.value ] 
    );
    const variants = Array.from( $('#algorithm-variants-panel input') ).map(
      (checkbox_element) => [ checkbox_element.name, checkbox_element.checked ] 
    );
    const parameters = algorithmArgs.concat( variants );
    return stemwebService
      .runAlgorithm( userId, algorithmId, tradId, null, parameters )
      .then( stemwebFrontend.handleRunAlgorithmResponse );
  }

  handleRunAlgorithmResponse( resp ) {
    if (resp.success) {
      StemmawebAlert.show('Job added.', 'success');
      // // @todo: Should the next line be wrapped in a try..catch?
      // TRADITION_STORE.updateTradition(resp.data);
      return Promise.resolve({
        success: true,
        message: 'Job added.'
      });
    } else {
      StemmawebAlert.show(`Error: ${resp.message}`, 'danger');
      return Promise.resolve({
        success: false,
        message: resp.message
      });
    }
  }

}

stemwebFrontend = new StemwebFrontend();
