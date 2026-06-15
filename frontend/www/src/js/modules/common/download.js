class Download {

  static set_downloads( tradition, dot ) {
    const traditionFilename = `${libraries.lib_SanitizeFilename.sanitize( tradition.name )}`;
    const dropdownbtn_element = d3.select( '#stemma_image_downloadbtn' );
    if( dot ) {
      d3.select( '#download_dot' ).on( 'click', function (evt) {
        evt.preventDefault();
        Download.download( `${traditionFilename}.dot`, dot, 'text/plain');
      }); 
      d3.select( '#download_svg' ).on( 'click', function (evt) {
        evt.preventDefault();
        Download.download(
          `${traditionFilename}.svg`,
          d3.select('#graph-area div').html(),
          'image/svg+xml'
        );
      });
      d3.select( '#download_png' ).on( 'click', function (evt) {
        evt.preventDefault();
        libraries.lib_SaveSvgAsPng.saveSvgAsPng(
          d3.select('#graph-area div').select('svg').node(),
          `${traditionFilename}.png`
        );
      });
      dropdownbtn_element.classed( 'disabled', false );
    } else {
      dropdownbtn_element.classed( 'disabled', true );
    }
  }

  static download(filename, data, mime_type) {
    const blob = new Blob([data], { type: mime_type });
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(blob, filename);
    } else {
      const elem = document.createElement('a');
      elem.href = URL.createObjectURL(blob);
      elem.download = filename;
      document.body.appendChild(elem);
      elem.click();
      document.body.removeChild(elem);
    }
  }

}