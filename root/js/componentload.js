// Global state variables
var selectedTextID;
var selectedTextInfo;
var selectedTextEditable;
var selectedStemmaSequence = -1;
var sortableSectionList;
var sectionSortBackup;
var stemmata = [];

// Load the names of the appropriate traditions into the directory div.
function refreshDirectory() {
  var lmesg = $('#loading_message').clone();
  $('#directory').empty().append(lmesg.contents());
  $('#directory').load(_get_url(["directory"]),
    function(response, status, xhr) {
      if (status == "error") {
        var msg = "An error occurred: ";
        $("#directory").html(msg + xhr.status + " " + xhr.statusText);
      } else {
        // Call the click callback for the relevant text, if it is
        // in the page.
        if (textOnLoad != "") {
          $('#' + textOnLoad).click();
          textOnLoad = "";
        }
        // Initialize the tradition picklist in the collation upload dialog.
        $('#upload_for_tradition').empty();
        $(".canmod").each(function() {
          var tid = $(this).attr('id');
          var tname = $(this).text();
		  if (tid === selectedTextID) {
			  $('#upload_for_tradition').append($('<option>')
			  	.attr('value', tid).attr('selected', 'selected').text(tname));		  	
		  } else {
			  $('#upload_for_tradition').append($('<option>').attr('value', tid).text(tname));
		  }
        });
      }
    }
  );
}

// Load a tradition with its information and stemmata into the tradition
// view pane. Calls load_textinfo.
function loadTradition(textid, textname, editable) {
  selectedTextID = textid;
  selectedTextEditable = editable;
  // First insert the placeholder image and register an error handler
  $('#textinfo_load_status').empty();
  $('#stemma_graph').empty();
  $('#textinfo_waitbox').show();
  $('#textinfo_container').hide();

  // Then get and load the actual content.
  // TODO: scale #stemma_graph both horizontally and vertically
  // TODO: load svgs from SVG.Jquery (to make scaling react in Safari)
  $.getJSON(_get_url(["textinfo", textid]), function(textdata) {
    // Add the scalar data
    selectedTextInfo = textdata;
    load_textinfo();
    // Hide the functionality that is irrelevant
    if (editable) {
      // Show the buttons that do things
      $('.editcontrol').show();
      // ...but then hide the irrelevant ones again
      switch_stemweb_ui();
      // Modify labels where appropriate
      $('#relatebutton_label').text('View collation and edit relationships');
      // Update the default tradition for uploading sections
      $('#upload_for_tradition').val(textid)
    } else {
      $('.editcontrol').hide();
      $('#relatebutton_label').text('View collation and relationships');
    }
    // Add the stemma(ta)
    stemmata = textdata.stemmata;
    if (stemmata.length) {
      selectedStemmaSequence = 0;
    } else {
      selectedStemmaSequence = -1;
    }
    load_stemma(selectedStemmaSequence);
    // Set up the relationship mapper button
    $('#run_relater').attr('action', _get_url(["relation", textid]));
    // Set up the download button and dialog
    $('#dl_tradition').attr('href', _get_url(["download", textid]));
    $('#dl_tradition').attr('download', selectedTextInfo.name + '.xml');
    $('#download_tradition').attr('value', textid);
    // Set up everything that needs a section list
    load_sections(true);
  });
}

// Fill in the section list wherever it belongs, including (if requested)
// the sortable list.
function load_sections(load_sortable) {
  // Fill in the section list wherever it belongs
  $('#download_start').empty();
  $('#download_end').empty();
  if (load_sortable) {
    $('#section_list').empty();
  }
  $.each(selectedTextInfo.sections, function(i, s) {
    // Download dialog
    var displayname = (i + 1) + " - " + s.name;
    var startsect = $('<option>').attr('value', s.id).text(displayname);
    if (i == 0) {
      startsect.attr('selected', 'true');
    } else {
      startsect.removeAttr('selected');
    }
    $('#download_start').append(startsect);
    var endsect = startsect.clone();
    if (i == selectedTextInfo.sections.length - 1) {
      endsect.attr('selected', 'true');
    } else {
      endsect.removeAttr('selected');
    }
    $('#download_end').append(endsect);

    if (load_sortable) {
      var handle = $('<span class="sortable-handle ui-icon ui-icon-arrowthick-2-n-s"></span>');
      var label = $('<span class="sectionname">').text(s.name);
      var listel = $('<li>').append(handle).append(label).data('id', s.id);
      $('#section_list').append(listel);
    }
  });
}

// Load the metadata about a tradition into the appropriate div.
function load_textinfo() {
  $('#textinfo_waitbox').hide();
  $('#textinfo_load_status').empty();
  $('#textinfo_container').show();
  // The tradition name should appear here and should be identical in the
  // corresponding directory span. In case the name was just changed...
  $('.texttitle').empty().append(selectedTextInfo.name);
  $('#' + selectedTextID).empty().append(selectedTextInfo.name);
  // Witnesses
  $('#witness_num').empty().append(selectedTextInfo.witnesses.length);
  $('#witness_list').empty().append(selectedTextInfo.witnesses.join(', '));
  // Who the owner is
  $('#owner_id').empty().append('no one');
  if (selectedTextInfo.owner) {
    var owneremail = selectedTextInfo.owner;
    var chop = owneremail.indexOf('@');
    if (chop > -1) {
      owneremail = owneremail.substr(0, chop + 1) + '...';
    }
    $('#owner_id').empty().append(owneremail);
  }
  // Whether or not it is public
  $('#not_public').empty();
  if (!selectedTextInfo['is_public']) {
    $('#not_public').append('NOT ');
  }
  // What language setting it has, if any
  $('#marked_language').empty().append('no language set');
  if (selectedTextInfo.language && selectedTextInfo.language != 'Default') {
    $('#marked_language').empty().append(selectedTextInfo.language);
  }
  // What its database ID is
  $('#id_display').empty().append(selectedTextID)
}

// Enable / disable the appropriate buttons for paging through the stemma.
function show_stemmapager() {
  $('.pager_left_button').unbind('click').addClass('greyed_out');
  $('.pager_right_button').unbind('click').addClass('greyed_out');
  var hasStemma = false;
  if (selectedStemmaSequence > 0) {
    $('.pager_left_button').click(function() {
      load_stemma(selectedStemmaSequence - 1, selectedTextEditable);
    }).removeClass('greyed_out');
    hasStemma = true;
  }
  if (selectedStemmaSequence + 1 < stemmata.length) {
    $('.pager_right_button').click(function() {
      load_stemma(selectedStemmaSequence + 1, selectedTextEditable);
    }).removeClass('greyed_out');
    hasStemma = true;
  }
  $('#stemma_pager_buttons').children().toggle(hasStemma);
}

// Load a given stemma SVG into the stemmagraph box.
function load_stemma(idx) {
  // Load the stemma at idx
  selectedStemmaSequence = idx;
  show_stemmapager(selectedTextEditable);
  $('#stemma_edit_button').hide();
  $('#stexaminer_button').hide();
  $('#stemma_identifier').empty();
  // Add the relevant Stemweb functionality
  if (selectedTextEditable) {
    switch_stemweb_ui();
  }
  if (idx > -1) {
    // Load the stemma and its properties
    var stemmadata = stemmata[idx];
    if (selectedTextEditable) {
      $('#stemma_edit_button').show();
    }
    if (stemmadata.directed) {
      // Stexaminer submit action
      var stexpath = _get_url(["stexaminer", selectedTextID, idx]);
      $('#run_stexaminer').attr('action', stexpath);
      $('#stexaminer_button').show();
    }
    loadSVG(stemmadata.svg);
    $('#stemma_identifier').text(stemmadata.name);
    setTimeout('start_element_height = $("#stemma_graph .node")[0].getBBox().height;', 500);
  }
}

function switch_stemweb_ui() {
  if (!selectedTextInfo || !selectedTextInfo.stemweb_jobid) {
    // We want to run Stemweb.
    $('#run_stemweb_button').show();
    $('#query_stemweb_button').hide();
    if (!$('#stemweb-ui-dialog').dialog('isOpen')) {
      $('#call_stemweb').show()
      $('#stemweb_run_button').show();
    }
  } else {
    $('#query_stemweb_button').show();
    $('#run_stemweb_button').hide();
    $('#call_stemweb').hide();
    $('#stemweb_run_button').hide();
  }
}

function query_stemweb_progress() {
  var requrl = _get_url(["stemweb", "query", selectedTextInfo.stemweb_jobid]);
  $('#stemweb-ui-dialog').dialog('open');
  $('#stemweb_run_status').empty().append(
    _make_message('notification', 'Querying Stemweb for calculation progress...'));
  $.getJSON(requrl, function(data) {
    process_stemweb_result(data);
  });
}

function process_stemweb_result(data) {
  // Look for a status message, either success, running, or notfound.
  if (data.status === 'success') {
    // Add the new stemmata to the textinfo and tell the user.
    selectedTextInfo.stemweb_jobid = 0;
    if (data.stemmata.length > 0) {
      stemmata = stemmata.concat(data.stemmata);
      if (selectedStemmaSequence == -1) {
        // We have a stemma for the first time; load the first one.
        load_stemma(0, true);
      } else {
        // Move to the index of the first added stemma.
        var newIdx = stemmata.length - data.stemmata.length;
        load_stemma(newIdx, true);
      }
      // Hide the call dialog no matter how we got here
      $('#call_stemweb').hide()
      $('#stemweb_run_button').hide();
      $('#stemweb_run_status').empty().append(
        _make_message('notification', 'You have one or more new stemmata!'));
    } else {
      $('#stemweb_run_status').empty().append(
        _make_message('warning', 'Stemweb run finished with no stemmata...huh?!'));
    }
  } else if (data.status === 'running') {
    // Just tell the user.
    $('#stemweb_run_status').empty().append(
      _make_message('warning', 'Your Stemweb query is still running!'));
  } else if (data.status === 'notfound') {
    // Ask the user to refresh, for now.
    $('#stemweb_run_status').empty().append(
      _make_message('warning', 'Your Stemweb query probably finished and reported back. Please reload to check.'));
  } else if (data.status === 'failed') {
    selectedTextInfo.stemweb_jobid = 0;
    failureMsg = 'Your stemweb query failed';
    if (data.message) {
      failureMsg = failureMsg + ' with the following message: ' + data.message
    } else {
      failureMsg = failureMsg + ' without telling us why.'
    }
    $('#stemweb_run_status').empty().append(
      _make_message('error', failureMsg));
  }
}

function _make_message(type, msg) {
  theMessage = $('<span>').attr('class', type);
  theMessage.append(msg);
  return theMessage;
}

// Load the SVG we are given
function loadSVG(svgData) {
  var svgElement = $('#stemma_graph');

  $(svgElement).svg('destroy');

  $(svgElement).svg({
    loadURL: svgData,
    onLoad: function() {
      var theSVG = svgElement.find('svg');
      var svgoffset = theSVG.offset();
      var browseroffset = 1;
      // Firefox needs a different offset, stupidly enough
      if (navigator.userAgent.indexOf('Firefox') > -1) {
        browseroffset = 3; // works for tall images
        // ...but if the SVG is wider than it is tall, Firefox treats
        // the top as being the top of the graph, loaded into the middle
        // of the canvas, but then the margin at the top of the canvas
        // extends upward. So we have to find the actual top of the canvas
        // and correct for *that* instead.
        var vbdim = svgElement.svg().svg('get').root().viewBox.baseVal;
        if (vbdim.height < vbdim.width) {
          var vbscale = svgElement.width() / vbdim.width;
          var vbrealheight = vbdim.height * vbscale;
          browseroffset = 3 + (svgElement.height() - vbrealheight) / 2;
        }
      }
      var topoffset = theSVG.position().top - svgElement.position().top - browseroffset;
      theSVG.offset({
        top: svgoffset.top - topoffset,
        left: svgoffset.left
      });
      set_stemma_interactive(theSVG);
    }
  });
}

function set_stemma_interactive(svg_element) {
  if (selectedTextEditable) {
    // unbind is needed as this set_stemma_interactive is called each time
    // the stemma is re-rooted, and each time jquery adds an
    // onclick handler to the root_tree_dialog_button_ok
    // that all re-root the stemma, that all add an onclick, etc..
    $("#root_tree_dialog_button_ok").unbind();
    $("#root_tree_dialog_button_ok").click(function() {
      $("#stemma_load_status").empty();
      var stemmaid = selectedTextInfo.stemmata[selectedStemmaSequence].name;
      var requrl = _get_url(["stemma", "reroot", selectedTextID, stemmaid]);
      var targetnode = $('#root_tree_dialog').data('selectedNode');
      $.post(requrl, {
        root: targetnode
      }, function(data) {
        // Reload the new stemma
        stemmata[selectedStemmaSequence] = data;
        load_stemma(selectedStemmaSequence);
        // Put away the dialog
        $('#root_tree_dialog').data('selectedNode', null).hide();
      });
    }).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
      if (ajaxSettings.url.indexOf('stemmaroot') > -1 &&
        ajaxSettings.type == 'POST') {
        display_error(jqXHR, $("#stemma_load_status"));
      }
    });
    // TODO Clear error at some appropriate point
    $.each($('ellipse', svg_element), function(index) {
      var ellipse = $(this);
      var g = ellipse.parent('g');
      g.click(function(evt) {
        if (typeof root_tree_dialog_timeout !== 'undefined') {
          clearTimeout(root_tree_dialog_timeout)
        };
        g.unbind('mouseleave');
        var dialog = $('#root_tree_dialog');
        // Note which node triggered the dialog
        dialog.data('selectedNode', g.attr('id'));
        // Position the dialog
        dialog.hide();
        dialog.css('top', evt.pageY + 3);
        dialog.css('left', evt.pageX + 3);
        dialog.show();
        root_tree_dialog_timeout = setTimeout(function() {
          $('#root_tree_dialog').data('selectedNode', null).hide();
          ellipse.removeClass('stemma_node_highlight');
          g.mouseleave(function() {
            ellipse.removeClass('stemma_node_highlight')
          });
        }, 3000);
      });
      g.mouseenter(function() {
        $('ellipse.stemma_node_highlight').removeClass('stemma_node_highlight');
        ellipse.addClass('stemma_node_highlight')
      });
      g.mouseleave(function() {
        ellipse.removeClass('stemma_node_highlight')
      });
    });
  }
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

function upload_collation(upload_url) {
  // Serialize the upload form, get the file and attach it to the request,
  // POST the lot and handle the response.
  var newfile = $('#new_file').get(0).files[0];
  var reader = new FileReader();
  reader.onload = function(evt) {
    var data = new FormData();
    $.each($('#new_tradition').serializeArray(), function(i, o) {
      if (o.name != 'uploadtype') {
        data.append(o.name, o.value.trim());
      }
    });
    data.append('file', newfile);

    var error_msg = ""
    var ok4upload = false;
    if (data.get('name') != '') {
      ok4upload = true;
      console.log("Ok for upload. The title inserted in the form is '" + data.get('name') + "'.");
    }
    else if (data.get('filetype') != 'graphml') {
      error_msg = "Error: Non-graphml imports need a title from the input field. Insert the name of the text/tradition in the form, please. (Your selected file type is '" + data.get('filetype') + "').";
      console.log(error_msg);
      $('#upload_status').empty().append(
        $('<span>').attr('class', 'error').append(error_msg));
    } else {
      // console.log("Title input field is empty. Is there a title in the graphml file?");
      var graphml_title = "";
      var xmlDoc = $.parseXML( evt.target.result );
      var name_id = $(xmlDoc).find('key[attr\\.name=name]').attr('id');
      graphml_title = $(xmlDoc).find('data[key=' + name_id + ']').first().text().trim();
      // TODO: what is the second data field with the same name_id for? Cases where to use that one?

      if (graphml_title.length > 0) {
        ok4upload = true;
        console.log("Ok for upload. Your title in the file is '" + graphml_title + "'.");
      } else {
        error_msg = "Error: title neither in input field nor inside the file."
        console.log(error_msg);
        $('#upload_status').empty().append(
          $('<span>').attr('class', 'error').append(error_msg));
      }
    }

    if (ok4upload) {
      post_xhr2(upload_url, data, function(ret) {
        if (ret.tradId) {
          $('#upload-collation-dialog').dialog('close');
          // Reload the directory with the new text selected.
          textOnLoad = ret.tradId;
          refreshDirectory();
        } else if (ret.parentId) {
          $('#upload-collation-dialog').dialog('close');
          // Load the tradition to which we just uploaded.
          var ourTradId = $('#upload_for_tradition').val();
          var ourTradName = $('#upload_for_tradition :checked').text();
          loadTradition(ourTradId, ourTradName, 1);
        } else if (ret.error) {
          $('#upload_status').empty().append(
            $('<span>').attr('class', 'error').append(ret.error));
        }
      }, 'json');
    }
  };
  reader.onerror = function(evt) {
    var err_resp = 'File read error';
    if (evt.name == 'NotFoundError') {
      err_resp = 'File not found';
    } else if (evt.name == 'NotReadableError') {
      err_resp == 'File unreadable - is it yours?';
    } else if (evt.name == 'EncodingError') {
      err_resp == 'File cannot be encoded - is it too long?';
    } else if (evt.name == 'SecurityError') {
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

// General-purpose error-handling function.
$(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
  var error;
  var errordiv;
  // Is it an authorization error?
  if (ajaxSettings.type == 'POST' && jqXHR.status == 403 &&
    jqXHR.responseText.indexOf('do not have permission to modify') > -1) {
    error = 'You are not authorized to modify this tradition. (Try logging in again?)';
  } else if (jqXHR.responseText === "") {
    error = 'perhaps the server went down?';
  } else {
    try {
      var errobj = jQuery.parseJSON(jqXHR.responseText);
      error = errobj.error;
    } catch (e) {
      error = jqXHR.statusText;
    }
  }

  // To which box does it belong?
  if ($('#textinfo-edit-dialog').dialog('isOpen')) {
    // the tradition metadata box
    error += '<br>The tradition cannot be updated.</p>';
    errordiv = '#edit_textinfo_status';
  } else if ($('#stemma-edit-dialog').dialog('isOpen')) {
    // the delete box
    error += '<br>The stemma cannot be saved.</p>';
    errordiv = '#edit_stemma_status';
  } else if ($('#stemweb-ui-dialog').dialog('isOpen')) {
    errordiv = '#stemweb_run_status';
  } else if ($('#download-dialog').dialog('isOpen')) {
    // reading box
    error += '<br>The tradition cannot be downloaded.</p>';
    errordiv = '#download_status';
  } else if ($('#upload-collation-dialog').dialog('isOpen')) {
    errordiv = '#upload_status';
    error += '<br>The collation cannot be uploaded.</p>';
    file_selected($('#new_file').get(0));
  } else if ($('#section-edit-dialog').dialog('isOpen')) {
    errordiv = '#section_edit_status';
    if (ajaxSettings.url.indexOf('orderafter') > -1) {
      error = '<br>The section cannot be reordered.</p>';
      // Reset the sort order if something went wrong there.
      sortableSectionList.sort(sectionSortBackup);
    } else {
      error += '<br>The section cannot be modified.</p>';
    }
  } else if (ajaxSettings.url.indexOf('textinfo') > -1 && ajaxSettings.type == 'GET') {
    $('#textinfo_waitbox').hide();
    $('#textinfo_container').show();
    errordiv = "#textinfo_load_status";
  } else if (ajaxSettings.url.indexOf('stemma/reroot') > -1 && ajaxSettings.type == 'POST') {
    errordiv = "#stemma_load_status";
  }

  // Populate the box with the error message
  $(errordiv).append('<p class="error">Error: ' + error);
  $(errordiv).parents('.ui-dialog').find('.ui-button').button("enable");

  // ...then initialization.
}).ready(function() {
  // See if we have the browser functionality we need
  // TODO Also think of a test for SVG readiness
  if (!!window.FileReader && !!window.File) {
    $('#compatibility_check').empty();
  }

  // hide dialog not yet in use
  $('#root_tree_dialog').hide();

  // call out to load the directory div
  $('#textinfo_container').hide();
  $('#textinfo_waitbox').hide();

  // Set up the textinfo edit dialog
  $('#textinfo-edit-dialog').dialog({
    autoOpen: false,
    height: 220,
    width: 350,
    modal: true,
    buttons: {
      'Delete tradition': function(evt) {
        $("#edit_textinfo_status").empty();
        var mybuttons = $(evt.target).closest('button').parent().find('button');
        var requrl = _get_url(["delete", selectedTextID]);
        mybuttons.button('disable');
        var really = confirm("Tradition deletion cannot be undone. Are you sure?")
        if (really) {
          $.post(requrl, function(data) {
            // TODO clear the text info pane
            $('#textinfo_container').hide();
            refreshDirectory();
            mybuttons.button("enable");
            $('#textinfo-edit-dialog').dialog('close');
          });
        } else {
          mybuttons.button("enable");
        }
      },
      Save: function(evt) {
        $("#edit_textinfo_status").empty();
        var mybuttons = $(evt.target).closest('button').parent().find('button');
        mybuttons.button('disable');
        var requrl = _get_url(["textinfo", selectedTextID]);
        var reqparam = $('#edit_textinfo').serialize();
        $.post(requrl, reqparam, function(data) {
          // Reload the selected text fields
          selectedTextInfo = data;
          load_textinfo();
          // Reenable the button and close the form
          mybuttons.button("enable");
          $('#textinfo-edit-dialog').dialog('close');
        }, 'json');
      },
      Cancel: function() {
        $('#textinfo-edit-dialog').dialog('close');
      }
    },
    open: function() {
      $("#edit_textinfo_status").empty();
      // Populate the form fields with the current values
      // edit_(name, language, public, owner)
      $.each(['name', 'language', 'owner', 'direction'], function(idx, k) {
        var fname = '#edit_' + k;
        // Special case: language Default is basically language null
        if (k == 'language' && selectedTextInfo[k] == 'Default') {
          $(fname).val("");
        } else {
          $(fname).val(selectedTextInfo[k]);
        }
      });
      if (selectedTextInfo['is_public']) {
        $('#edit_public').attr('checked', 'true');
      } else {
        $('#edit_public').removeAttr('checked');
      }
    },
  });


  // Set up the stemma editor dialog
  $('#stemma-edit-dialog').dialog({
    autoOpen: false,
    height: 700,
    width: 600,
    modal: true,
    buttons: {
      Save: function(evt) {
        $("#edit_stemma_status").empty();
        var mybuttons = $(evt.target).closest('button').parent().find('button');
        mybuttons.button('disable');
        var stemmaseq = $('#stemmaseq').val();
        var stemmaid = stemmaseq === 'n' ? '__NEW__' :
          selectedTextInfo.stemmata[stemmaseq].name;
        var requrl = _get_url(["stemma", selectedTextID, stemmaid]);
        var reqparam = {
          'dot': $('#dot_field').val()
        };
        // We need to stash the literal SVG string in stemmata
        // somehow. Send an accept header to the server side so it
        // knows whether to send application/json or application/xml.
        $.post(requrl, reqparam, function(data) {
          // We received a stemma SVG string in return.
          // Stash the answer in the appropriate spot in our stemma array
          if (stemmaid === '__NEW__') {
            stemmata.push(data);
            selectedStemmaSequence = stemmata.length - 1;
          } else {
            stemmata[stemmaseq].svg = data.svg;
          }
          // Update the current stemma sequence number if this is a new stemma
          // Display the new stemma
          load_stemma(selectedStemmaSequence, true);
          // Reenable the button and close the form
          mybuttons.button("enable");
          $('#stemma-edit-dialog').dialog('close');
        }, 'json');
      },
      Cancel: function() {
        $('#stemma-edit-dialog').dialog('close');
      }
    },
    open: function(evt) {
      $("#edit_stemma_status").empty();
      var stemmaseq = $('#stemmaseq').val();
      if (stemmaseq == 'n') {
        // If we are creating a new stemma, populate the textarea with a
        // bare digraph.
        $(evt.target).dialog('option', 'title', 'Add a new stemma')
        $('#dot_field').val("digraph \"NAME STEMMA HERE\" {\n\n}");
      } else {
        // If we are editing a stemma, grab its stemmadot and populate the
        // textarea with that.
        $(evt.target).dialog('option', 'title', 'Edit selected stemma')
        $('#dot_field').val('Loading, please wait...');
        // Get the stemma identifier
        var stemmaid = selectedTextInfo.stemmata[stemmaseq].name;
        var doturl = _get_url(["stemma", "dot", selectedTextID, stemmaid]);
        $.getJSON(doturl, function(data) {
          // Re-insert the line breaks
          var dotstring = data.dot.replace(/\|n/gm, "\n");
          $('#dot_field').val(dotstring);
        });
      }
    },
  });

  $('#stemweb-ui-dialog').dialog({
    autoOpen: false,
    height: 'auto',
    width: 520,
    modal: true,
    buttons: {
      Run: {
        id: 'stemweb_run_button',
        text: 'Run',
        click: function(evt) {
          $("#stemweb_run_status").empty();
          var mybuttons = $(evt.target).closest('button').parent().find('button');
          mybuttons.button('disable');
          var requrl = _get_url(["stemweb", "request"]);
          var reqparam = $('#call_stemweb').serialize();
          // TODO We need to stash the literal SVG string in stemmata
          // somehow. Implement accept header on server side to decide
          // whether to send application/json or application/xml?
          $.getJSON(requrl, reqparam, function(data) {
            mybuttons.button("enable");
            if ('jobid' in data) {
              // There is a pending job.
              selectedTextInfo.stemweb_jobid = data.jobid;
              $('#stemweb_run_status').empty().append(
                _make_message('notification', "Your request has been submitted to Stemweb.\nThe resulting tree will appear in due course."));
              // Reload the current stemma to rejigger the buttons
              switch_stemweb_ui();
            } else {
              // We appear to have an answer; process it.
              process_stemweb_result(data);
            }
          }, 'json');
        },
      },
      Close: {
        id: 'stemweb_close_button',
        text: 'Close',
        click: function() {
          $('#stemweb-ui-dialog').dialog('close');
          switch_stemweb_ui();
        },
      },
    },
    create: function(evt) {
      // Call out to Stemweb to get the algorithm options, with which we
      // populate the form.
      var algorithmTypes = {};
      var algorithmArgs = {};
      var requrl = _get_url(["stemweb", "available"]);
      $.getJSON(requrl, function(data) {
        $.each(data, function(i, o) {
          if (o.model === 'algorithms.algorithm') {
            // it's an algorithm.
            algorithmTypes[o.pk] = o.fields;
          } else if (o.model == 'algorithms.algorithmarg' && o.fields.external) {
            // it's an option for an algorithm that we should display.
            algorithmArgs[o.pk] = o.fields;
          }
        });
        // TODO if it is an empty object, disable Stemweb entirely.
        if (!jQuery.isEmptyObject(algorithmTypes)) {
          $.each(algorithmTypes, function(pk, fields) {
            var algopt = $('<option>').attr('value', pk).append(fields.name);
            $('#stemweb_algorithm').append(algopt);
          });
          // Set up the relevant options for whichever algorithm is chosen.
          // "key" -> form name, option ID "stemweb_$key_opt"
          // "name" -> form label
          $('#stemweb_algorithm_help').click(function() {
            $('#stemweb_algorithm_desc_text').toggle('blind');
          });
          $('#stemweb_algorithm').change(function() {
            var pk = $(this).val();
            // Display a link to the popup description, and fill in
            // the description itself, if we have one.
            if ('desc' in algorithmTypes[pk]) {
              $('#stemweb_algorithm_desc_text').empty().append(algorithmTypes[pk].desc);
              $('#stemweb_algorithm_desc').show();
            } else {
              $('#stemweb_algorithm_desc').hide();
            }
            $('#stemweb_runtime_options').empty();
            $.each(algorithmTypes[pk].args, function(i, apk) {
              var argInfo = algorithmArgs[apk];
              if (argInfo) {
                // Make the element ID
                var optId = 'stemweb_' + argInfo.key + '_opt';
                // Make the label
                var optLabel = $('<label>').attr('for', optId)
                  .append(argInfo.name + ": ");
                var optCtrl;
                var argType = argInfo.value;
                if (argType === 'positive_integer') {
                  // Make it an input field of smallish size.
                  optCtrl = $('<input>').attr('size', 4);
                } else if (argType === 'boolean') {
                  // Make it a checkbox.
                  optCtrl = $('<checkbox>');
                }
                // Add the name and element ID
                optCtrl.attr('name', argInfo.key).attr('id', optId);
                // Append the label and the option itself to the form.
                $('#stemweb_runtime_options').append(optLabel)
                  .append(optCtrl).append($('<br>'));
              }
            });
          });
          $('#stemweb_algorithm').change();
        }
      });
      // Prime the initial options
    },
    open: function(evt) {
      $('#stemweb_run_status').empty();
      $('#stemweb_tradition').attr('value', selectedTextID);
      if (selectedTextInfo.stemweb_jobid == 0) {
        $('#stemweb_merge_reltypes').empty();
        $.each(selectedTextInfo.reltypes, function(i, r) {
          var relation_opt = $('<option>').attr('value', r).append(r);
          $('#stemweb_merge_reltypes').append(relation_opt);
        });
        $('#stemweb_merge_reltypes').multiselect({
          header: false,
          selectedList: 3
        });
      }
    },
  });

  // Set up the download dialog
  $('#download-dialog').dialog({
    autoOpen: false,
    height: 150,
    width: 500,
    modal: true,
    buttons: {
      Download: function(evt) {
        var dlurl = _get_url(["download"]);
        dlurl += '?' + $('#download_form').serialize();
        window.location = dlurl;
      },
      Done: function() {
        $('#download-dialog').dialog('close');
      }
    },
  });

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
          var url;
          if ($('#new_tradition :radio:checked').val() === 'tradition') {
            url = _get_url(['newtradition']);
          } else {
            var textid = $('#upload_for_tradition').val()
            url = _get_url(['newsection', textid]);
          }
          upload_collation(url);
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
    create: function() {
      // Set the radio button form modification logic
      $('#upload_tradition_radio').click(function() {
        $('.new_section').hide();
        $('.new_tradition').show();
        $('#upload_name_field').text('Name of this text / tradition: ');
      });
      $('#upload_section_radio').click(function() {
        $('.new_tradition').hide();
        $('.new_section').show();
        $('#upload_name_field').text('Name of this section: ');
      });
      // Default is new tradition
      $('#upload_tradition_radio').click();
    },
    open: function() {
      // Set the upload button to its correct state based on
      // whether a file is loaded
      file_selected($('#new_file').get(0));
      $('#upload_status').empty();
    }
  });

  $('#section-edit-dialog').dialog({
    autoOpen: false,
    modal: true,
    width: 600,
    height: 400,
    buttons: {
      delete: {
        text: 'Delete section',
        id: 'section_delete_button',
        click: function() {
          $('#section_delete_button').button("disable");
          var sectionID = $('#section_id').val();
          var url = _get_url(['delete', selectedTextID, sectionID]);
          $.post(url, function() {
            // Remove the affected list element
            $('#section_list li.selected').remove();
            // TEST Do we need to re-initialise the sortable?
            // Remove the affected section data
            var toRemove = -1;
            $.each(selectedTextInfo.sections, function(i) {
              if (this.id === sectionID) {
                toRemove = i;
              }
            })
            selectedTextInfo.sections.splice(toRemove, 1);
          });
        }
      },
      save: {
        text: 'Save section info',
        id: 'section_save_button',
        click: function() {
          $('#section_save_button').button("disable");
          var sectionID = $('#section_id').val();
          var url = _get_url(['sectioninfo', selectedTextID, sectionID]);
          var reqparam = $('#section-edit').serialize();
          $.post(url, reqparam, function(data) {
            // Turn the button back on
            $('#section_save_button').button("enable");
            // Update our copy of the data
            var toUpdate = -1;
            $.each(selectedTextInfo.sections, function(i) {
              if (this.id === sectionID) {
                toUpdate = i;
              }
            })
            selectedTextInfo.sections[toUpdate] = data;
            // Refresh the text download picklists
            load_sections();
            // Refresh the section list itself
            $('#section_list li.selected .sectionname').text(data.name);
          })
        }
      },
      close: {
        text: 'Close',
        click: function() {
          $('#section-edit-dialog').dialog('close');
        }
      },
    },
    open: function() {
      // Clear any prior error messages
      $('#section_edit_status').empty();
      // Set up the magic section list sorter, non-jQuery style
      var sectionlist = document.getElementById('section_list');
      sortableSectionList = Sortable.create(sectionlist, {
        handle: '.sortable-handle',
        onUpdate: function(evt, ui) {
          // Get the section that is moving
          var sectid = selectedTextInfo.sections[evt.oldIndex].id;
          // If the element has moved up, then the prior element is
          // one less than its new index. If the element has moved
          // down, its prior will have formerly lived at newIndex
          // and is about to be shifted up. We thus need to look for
          // the data structure at newIndex.
          var indexOfPrior = evt.newIndex;
          if (evt.oldIndex > evt.newIndex) { // it moved up
            indexOfPrior -= 1;
          }
          var newprior = "none";
          if (evt.newIndex > 0) {
            newprior = selectedTextInfo.sections[indexOfPrior].id;
          }
          var sorturl = _get_url(
            ['orderafter', selectedTextID, sectid, newprior]);
          $.post(sorturl, function() {
            // Alter our sections list
            var movedSection = selectedTextInfo.sections.splice(evt.oldIndex, 1);
            selectedTextInfo.sections.splice(evt.newIndex, 0, movedSection[0]);
            // Save the new sort order as current
            sectionSortBackup = sortableSectionList.toArray();
          })
        }
      });
      // Save the current sort order in case of trouble
      sectionSortBackup = sortableSectionList.toArray();

      // Set up the click-to-choose functionality for the section metadata
      $('#section_list li').click(function() {
        $('#section_list li').removeClass('selected');
        $(this).addClass('selected');
        $('#section_delete_button').button("enable");
        $('#section_save_button').button("enable");
        var ourid = $(this).data('id');
        $.each(selectedTextInfo.sections, function() {
          if (this.id === ourid) {
            $('#section_id').val(this.id);
            $('#section_name').val(this.name);
            $('#section_language').val(this.language);
            return true;
          }
        });
      });
    },
    close: function() {
      sortableSectionList.destroy();
    },
  });

  $('#stemma_graph').mousedown(function(evt) {
    evt.stopPropagation();
    $('#stemma_graph').data('mousedown_xy', [evt.clientX, evt.clientY]);
    $('body').mousemove(function(evt) {
      mouse_scale = 1; // for now, was:  mouse_scale = svg_root_element.getScreenCTM().a;
      dx = (evt.clientX - $('#stemma_graph').data('mousedown_xy')[0]) / mouse_scale;
      dy = (evt.clientY - $('#stemma_graph').data('mousedown_xy')[1]) / mouse_scale;
      $('#stemma_graph').data('mousedown_xy', [evt.clientX, evt.clientY]);
      var svg_root = $('#stemma_graph svg').svg().svg('get').root();
      var g = $('g.graph', svg_root).get(0);
      current_translate = g.getAttribute('transform').split(/translate\(/)[1].split(')', 1)[0].split(' ');
      new_transform = g.getAttribute('transform').replace(/translate\([^\)]*\)/, 'translate(' + (parseFloat(current_translate[0]) + dx) + ' ' + (parseFloat(current_translate[1]) + dy) + ')');
      g.setAttribute('transform', new_transform);
      evt.returnValue = false;
      evt.preventDefault();
      return false;
    });
    $('body').mouseup(function(evt) {
      $('body').unbind('mousemove');
      $('body').unbind('mouseup');
    });
  });

  $('#stemma_graph').mousewheel(function(event, delta) {
    event.returnValue = false;
    event.preventDefault();
    if (!delta || delta == null || delta == 0) delta = event.originalEvent.wheelDelta;
    if (!delta || delta == null || delta == 0) delta = -1 * event.originalEvent.detail;
    if (delta < -9) {
      delta = -9
    };
    var z = 1 + delta / 10;
    z = delta > 0 ? 1 : -1;
    var svg_root = $('#stemma_graph svg').svg().svg('get').root();
    var g = $('g.graph', svg_root).get(0);
    if (g && ((z < 1 && (g.getScreenCTM().a * start_element_height) > 4.0) || (z >= 1 && (g.getScreenCTM().a * start_element_height) < 1000))) {
      var scaleLevel = z / 10;
      current_scale = parseFloat(g.getAttribute('transform').split(/scale\(/)[1].split(')', 1)[0].split(' ')[0]);
      new_transform = g.getAttribute('transform').replace(/scale\([^\)]*\)/, 'scale(' + (current_scale + scaleLevel) + ')');
      g.setAttribute('transform', new_transform);
    }
  });
  // Once all the page elements are set up...
  refreshDirectory();
});
