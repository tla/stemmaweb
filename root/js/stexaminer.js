var colors = ['#ffeeaa', '#afc6e9', '#d5fff6', '#ffccaa', '#ffaaaa', '#e5ff80', '#e5d5ff', '#ffd5e5'];
var row_triggered = false;

function handle_row_click(row) {
  var ridx = row.parent().parent().index()
  var rs = readingstats[ridx];
  var imghtml = $('<img>').attr('src', baseurl + "../images/ajax-loader.gif").attr('alt', "Loading SVG...");
  $('#stemma_graph').empty();
  $('#stemma_graph').append(imghtml);
  if (rs.layerwits) {
    var stemma_form = {
      'dot': graphdot,
      'layerwits': rs.layerwits
    };
    $.ajax({
      type: "POST",
      url: baseurl + 'graphsvg',
      data: stemma_form,
      success: function(data) {
        var oSerializer = new XMLSerializer();
        var xmlString = oSerializer.serializeToString(data.documentElement);
        loadSVG(xmlString, function() {
          color_row(row);
          show_stats(rs);
        });
      },
      error: function(jqXHR, textStatus, errorThrown) {
        alert("Got an error");
      }
    });
  } else {
    loadSVG(original_svg, function() {
      color_row(row);
      show_stats(rs);
    });
  }
}

// Load the SVG we are given
function loadSVG(svgData, cb) {
  var svgElement = $('#stemma_graph');

  $(svgElement).svg('destroy');

  $(svgElement).svg({
    loadURL: svgData,
    onLoad: function() {
      var theSVG = svgElement.find('svg');
      var svgoffset = theSVG.offset();
      // Firefox needs a different offset, stupidly enough
      var browseroffset = 1;
      if (navigator.userAgent.indexOf('Firefox') > -1) {
        browseroffset = 3;
      }
      var topoffset = theSVG.position().top - svgElement.position().top - browseroffset;
      // If we are on Safari, we need to get rid of the 'pt' in the width/height
      // specifications
      theSVG.offset({
        top: svgoffset.top - topoffset,
        left: svgoffset.left
      });
      if (cb) {
        cb.call();
      }
      theSVG.attr('width', '100%');
    }
  });
}

function color_row(row) {
  row_triggered = true;
  $('ellipse').attr({
    stroke: 'white',
    fill: '#fff'
  });
  $('.node').children('polygon').attr({
    stroke: '#fff',
    fill: '#fff'
  });
  $('.node').children('text').attr({
    stroke: 'none',
    fill: '#000'
  });
  $('tr.active_variant_row').children('td').removeClass('cellb0 cellb1 cellb2 cellb3 cellb4 cellb5 cellb6 cellb7');
  row.parent().nextAll('.clickable').children('span').click();
  $('td.active_variant_cell').removeClass('active_variant_cell');
  row_triggered = false;
}

function color_nodes(column_index, arr_node_ids, arr_greynode_ids) {
  if (!row_triggered) {
    $('tr.active_variant_row').children('td').removeClass('cellb0 cellb1 cellb2 cellb3 cellb4 cellb5 cellb6 cellb7');
    $('td.active_variant_cell').removeClass('active_variant_cell');
    $('ellipse').attr({
      stroke: 'white',
      fill: '#fff'
    });
    $('.node').children('polygon').attr({
      stroke: '#fff',
      fill: '#fff'
    });
    $('.node').children('text').attr({
      stroke: 'none',
      fill: '#000'
    });
  };
  $('tr.active_variant_row').removeClass('active_variant_row')
  jQuery.each(arr_greynode_ids, function(index, value) {
    nodes = $('.node').children('title').filter(function(index) {
      return $(this).text() == value;
    })
    nodes.siblings('ellipse, polygon, text').each(function(index) {
      $(this).attr({
        stroke: '#ddd',
        fill: '#f8f8f8'
      });
    });
  });
  jQuery.each(arr_node_ids, function(index, value) {
    $('.node').children('title').filter(function(index) {
      return $(this).text() == value;
    }).siblings('ellipse').each(function(index) {
      $(this).attr({
        stroke: 'black',
        fill: colors[column_index - 1]
      });
    });
  });
}

function show_stats(rs) {
  // Update the title
  $('#stats_title').empty().text('Statistics for reading at ' + rs.id + ':');
  var rshtml = $('#stats_template').clone();
  if ("unsolved" in rs) {
    var nocalcmsg;
    if (rs.unsolved == 'IDP error') {
      nocalcmsg = $('<span>').attr('class', 'error').append(
        "(Could not reach calculation server - are you offline?)");
    } else {
      nocalcmsg = "(Not yet calculated for this location - please try later)";
    }
    rshtml.find('.solutionstatus').append(nocalcmsg);
  } else {
    $.each(rs.readings, function(idx, rdghash) {
      var rdgstats = $('#reading_template').clone();
      rdgstats.find('.readinglabel').append(rdghash.text);
      rdgstats.find('.reading_copied').append(rdghash.followed);
      rdgstats.find('.reading_changed').append(rdghash.not_followed);
      rdgstats.find('.reading_unclear').append(rdghash.follow_unknown);
      rdgstats.find('.readingroots').append(rdghash.independent_occurrence);
      if (rdghash.is_reverted) {
        rdgstats.find('.reversionroots').append(rdghash.reversions);
      } else {
        rdgstats.find('.readingreversions').empty();
      }
      var rdgsourcehtml = fill_parent_template(rdghash, 'source');
      var rdgreverthtml = fill_parent_template(rdghash, 'reversion');
      rdgstats.find('.reading_statistics').append(rdgsourcehtml);
      rdgstats.find('.reading_statistics').append(rdgreverthtml);
      // If neither, append a small spacer
      if (!rdgsourcehtml && !rdgreverthtml) {
        rdgstats.find('.reading_statistics').append('<br/>');
      }
      rshtml.append(rdgstats.contents());
    });
  }
  $('#stats_container').empty().append(rshtml.contents());

};

function fill_parent_template(rdghash, type) {
  var objname = type + '_parents';
  var template_id = '#reading_' + type + '_template';
  var list_class = '.reading_' + type + '_list';
  if (!$.isEmptyObject(rdghash[objname])) {
    var parentstats = $(template_id).clone();
    $.each(rdghash[objname], function(parentid, pdata) {
      var parentdesc = pdata.label;
      if (pdata.relation) {
        parentdesc += ' - variant type ' + pdata.relation.type;
        if (pdata.relation.annotation) {
          parentdesc += ' [ ' + pdata.relation.annotation + ' ]';
        }
      } else {
        parentdesc += ' - no syntactic relation';
      }
      var parentitem = $('<li>').append(parentdesc);
      parentstats.find(list_class).append(parentitem);
    });
    return (parentstats.contents());
  }
}

// Save the original unextended SVG for when we need it.
$(document).ready(function() {
  loadSVG(original_svg);

  $('#aboutlink').popupWindow({
    height: 500,
    width: 800,
    top: 50,
    left: 50,
    scrollbars: 1
  });
  $('#options').dialog({
    autoOpen: false,
    // height: 'auto',
    width: 300,
    modal: true,
    buttons: {
      Cancel: function() {
        $(this).dialog("close");
      },
      Reanalyze: function() {
        $('#use_variants_form').submit();
      },
    }
  });

});
