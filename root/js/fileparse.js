// General-purpose error-handling function.
// TODO make sure this gets used throughout, where appropriate.
function display_error(jqXHR, el) {
  var errmsg;
  if (jqXHR.responseText == "") {
    errmsg = "perhaps the server went down?"
  } else {
    var errobj;
    try {
      errobj = jQuery.parseJSON(jqXHR.responseText);
      errmsg = errobj.error;
    } catch (parse_err) {
      errmsg = "something went wrong on the server."
    }
  }
  var msghtml = $('<span>').attr('class', 'error').text("An error occurred: " + errmsg);
  $(el).empty().append(msghtml).show();
}

// Event to enable the upload button when a file has been selected
function file_selected(e) {
  if (e.files.length == 1) {
    $('#upload_button').button('enable');
    $('#new_file_name_container').html('<span id="new_file_name">' + e.files[0].name + '</span>');
  } else {
    $('#upload_button').button('disable');
    $('#new_file_name_container').html('(Use \'pick file\' to select a tradition file to upload.)');
  }
}

// Implement our own AJAX method that uses the features of XMLHttpRequest2
// but try to let it have a similar interface to jquery.post
// The data var needs to be a FormData() object.
// The callback will be given a single argument, which is the response data
// of the given type.

function post_xhr2(url, data, cb, type) {
  if (!type) {
    type = 'json';
  }
  var xhr = new XMLHttpRequest();
  // Set the expected response type
  if (type === 'data') {
    xhr.responseType = 'blob';
  } else if (type === 'xml') {
    xhr.responseType = 'document';
  }
  // Post the form
  // Gin up an AJAX settings object
  $.ajaxSetup({
    url: url,
    type: 'POST'
  });
  xhr.open('POST', url, true);
  // Handle the results
  xhr.onload = function(e) {
    // Get the response and parse it
    // Call the callback with the response, whatever it was
    var xhrs = e.target;
    if (xhrs.status > 199 && xhrs.status < 300) { // Success
      var resp;
      if (type === 'json') {
        resp = $.parseJSON(xhrs.responseText);
      } else if (type === 'xml') {
        resp = xhrs.responseXML;
      } else if (type === 'text') {
        resp = xhrs.responseText;
      } else {
        resp = xhrs.response;
      }
      cb(resp);
    } else {
      // Trigger the ajaxError...
      _trigger_ajaxerror(e);
    }
  };
  xhr.onerror = _trigger_ajaxerror;
  xhr.onabort = _trigger_ajaxerror;
  xhr.send(data);
}

function _trigger_ajaxerror(e) {
  var xhr = e.target;
  var thrown = xhr.statusText || 'Request error';
  jQuery.event.trigger('ajaxError', [xhr, $.ajaxSettings, thrown]);
}

function upload_new() {
  // Serialize the upload form, get the file and attach it to the request,
  // POST the lot and handle the response.
  var newfile = $('#new_file').get(0).files[0];
  var reader = new FileReader();
  reader.onload = function(evt) {
    var data = new FormData();
    $.each($('#new_tradition').serializeArray(), function(i, o) {
      data.append(o.name, o.value);
    });
    data.append('file', newfile);
    var upload_url = _get_url(['newtradition']);
    post_xhr2(upload_url, data, function(ret) {
      if (ret.id) {
        $('#upload-collation-dialog').dialog('close');
        refreshDirectory();
        loadTradition(ret.id, ret.name, 1);
      } else if (ret.error) {
        $('#upload_status').empty().append(
          $('<span>').attr('class', 'error').append(ret.error));
      }
    }, 'json');
  };
  reader.onerror = function(evt) {
    var err_resp = 'File read error';
    if (e.name == 'NotFoundError') {
      err_resp = 'File not found';
    } else if (e.name == 'NotReadableError') {
      err_resp == 'File unreadable - is it yours?';
    } else if (e.name == 'EncodingError') {
      err_resp == 'File cannot be encoded - is it too long?';
    } else if (e.name == 'SecurityError') {
      err_resp == 'File read security error';
    }
    // Fake a jqXHR object that we can pass to our generic error handler.
    var jqxhr = {
      responseText: '{error:"' + err_resp + '"}'
    };
    display_error(jqxhr, $('#upload_status'));
    $('#upload_button').button('disable');
  }

  reader.readAsBinaryString(newfile);
}

// Utility function to neatly construct an application URL
function _get_url(els) {
  return basepath + els.join('/');
}

// TODO Attach unified ajaxError handler to document
$(document).ready(function() {
  // See if we have the browser functionality we need
  // TODO Also think of a test for SVG readiness
  if (!!window.FileReader && !!window.File) {
    $('#compatibility_check').empty();
  }

  $('#upload-collation-dialog').dialog({
    autoOpen: false,
    height: 360,
    width: 480,
    modal: true,
    buttons: {
      upload: {
        text: 'Upload',
        id: 'upload_button',
        click: function() {
          $('#upload_status').empty();
          $('#upload_button').button("disable");
          upload_new();
        }
      },
      pick_file: {
        text: 'Pick File',
        id: 'pick_file_button',
        click: function() {
          $('#new_file').click();
        }
      },
      Cancel: function() {
        $('#upload-collation-dialog').dialog('close');
      }
    },
    open: function() {
      // Set the upload button to its correct state based on
      // whether a file is loaded
      file_selected($('#new_file').get(0));
      $('#upload_status').empty();
    }
  }).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
    // Reset button state
    file_selected($('#new_file').get(0));
    // Display error message if applicable
    if (ajaxSettings.url.indexOf('newtradition') > -1 &&
      ajaxSettings.type == 'POST') {
      display_error(jqXHR, $("#upload_status"));
    }
  });;

});
