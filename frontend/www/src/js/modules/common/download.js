class Download {

  static set_downloads(dot) {
    d3.select('#download_dot').on('click', function (evt) {
      evt.preventDefault();
     download('stemma.dot', dot, 'text/plain');
    }); 
    d3.select('#download_svg').on('click', function (evt) {
      evt.preventDefault();
      download(
        'stemma.svg',
        d3.select('#graph-area div').html(),
        'image/svg+xml'
      );
    });
    d3.select('#download_png').on('click', function (evt) {
      evt.preventDefault();
      libraries.lib_SaveSvgAsPng.saveSvgAsPng(
        d3.select('#graph-area div').select('svg').node(),
        'stemma.png'
      );
    });
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