var MARGIN = 30;
var svg_root = null;
var svg_root_element = null;
var start_element_height = 0;
var reltypes = {};
var readingdata = {};
var rid2node = {};
var readings_selected = [];

jQuery.removeFromArray = function(value, arr) {
  return jQuery.grep(arr, function(elem, index) {
    return elem !== value;
  });
};

function arrayUnique(array) {
  var a = array.concat();
  for (var i = 0; i < a.length; ++i) {
    for (var j = i + 1; j < a.length; ++j) {
      if (a[i] === a[j])
        a.splice(j--, 1);
    }
  }
  return a;
};

function getTextURL(which) {
  return basepath + textid + '/' + sectid + '/' + which;
}

function getReadingURL(reading_id) {
  return basepath + textid + '/' + sectid + '/reading/' + reading_id;
}

// Make an XML ID into a valid selector
function jq(myid) {
  return '#' + myid.replace(/(:|\.)/g, '\\$1');
}

// Our controller often returns a map of SVG node ID -> reading data,
// including database ID. This is a set of helper functions to keep
// the list of keys in readingdata in sync with the DB -> SVG ID map.
function update_readingdata(rdata) {
  $.each(rdata, function(k, v) {
    readingdata[k] = v;
    rid2node[v['id']] = k;
  });
}

function update_reading(rdata) {
  var rid = rdata['id'];
  var nid = rid2node[rid];
  if ('svg_id' in rdata) {
    // Account for a possible change in SVG ID
    if (nid) {
      delete rid2node[rid];
      delete readingdata[nid];
    }
    nid = delete rdata['svg_id'];
  }
  readingdata[nid] = rdata;
  rid2node[rid] = nid;
  return nid;
}

function delete_reading(nodeid) {
  if (nodeid in readingdata) {
    var rid = readingdata[nodeid]['id'];
    delete rid2node[rid];
    delete readingdata[nodeid];
  } else if (nodeid in rid2node) {
    var nid = delete rid2node[nodeid];
    delete readingdata[nid];
  } else {
    alert("Node or reading ID " + nodeid + " not found");
  }
}

// Actions for opening the reading panel
function node_dblclick_listener(evt) {
  // Open the reading dialogue for the given node.
  // First get the reading info
  var svg_id = $(this).attr('id');
  var reading_info = readingdata[svg_id];
  // and then populate the dialog box with it.
  // Set the easy properties first
  var opt = {
    title: 'Reading information for "' + reading_info['text'] + '"'
  };
  $('#reading_id').val(reading_info['id']);
  toggle_checkbox($('#reading_is_lemma'), reading_info['is_lemma']);
  toggle_checkbox($('#reading_is_nonsense'), reading_info['is_nonsense']);
  toggle_checkbox($('#reading_grammar_invalid'), reading_info['grammar_invalid']);

  // Now set the text properties
  setup_readingbox('normal_form', reading_info);
  setup_readingbox('text', reading_info);
  setup_readingbox('display', reading_info);

  // and then open the dialog.
  $('#reading-form').dialog(opt).dialog("open");
  return false;
}

function setup_readingbox(boxname, reading) {
  var datum = reading[boxname];
  if (!datum) {
    datum = reading['text'];
  }
  var boxsize = 10;
  if (datum.length > 9) {
    boxsize = datum.length + 1;
  }
  var boxident = '#reading_' + boxname;
  $(boxident).attr('size', boxsize);
  $(boxident).val(datum);
}

function toggle_checkbox(box, value) {
  if (value == null) {
    value = false;
  }
  box.attr('checked', value);
}

function stringify_wordform(tag) {
  if (tag) {
    var elements = tag.split(' // ');
    return elements[1] + ' // ' + elements[2];
  }
  return ''
}

function color_inactive(el) {
  var svg_id = $(el).parent().attr('id');
  var reading_info = readingdata[svg_id];
  // If the reading info has any non-disambiguated lexemes, color it yellow;
  // otherwise color it green.
  $(el).attr({
    stroke: 'green',
    fill: '#b3f36d'
  });
  if (reading_info) {
    if (reading_info['is_lemma']) {
      $(el).attr({
        stroke: 'red',
        fill: '#f36d6f'
      });
    }
  }
}

function color_active(el) {
  var svg_id = $(el).parent().attr('id');
  var reading_info = readingdata[svg_id];
  // If the reading is currently selected, color it accordingly; otherwise
  // red for lemma and white for not.
  if (readings_selected.indexOf(svg_id) > -1) {
    $(el).attr({
      stroke: 'black',
      fill: '#9999ff'
    });
  } else if (reading_info && reading_info['is_lemma']) {
    $(el).attr({
      stroke: 'red',
      fill: '#ffdddd'
    });
  } else {
    $(el).attr({
      stroke: 'black',
      fill: '#fff'
    });
  }
}

// Initialize the SVG once it exists
function svgEnlargementLoaded() {
  //Give some visual evidence that we are working
  $('#loading_overlay').show();
  lo_height = $("#enlargement_container").outerHeight();
  lo_width = $("#enlargement_container").outerWidth();
  $("#loading_overlay").height(lo_height);
  $("#loading_overlay").width(lo_width);
  $("#loading_overlay").offset($("#enlargement_container").offset());
  // $("#loading_message").offset(
  //   { 'top': lo_height / 2 - $("#loading_message").height() / 2,
  //     'left': lo_width / 2 - $("#loading_message").width() / 2 });
  $('#loading_message').position({
    my: 'center',
    at: 'top + ' + $('#loading_message').height(),
    of: '#loading_overlay'
  });
  if (editable) {
    // Show the update toggle button.
    $('#update_workspace_button').data('locked', false);
    $('#update_workspace_button').css('background-position', '0px 44px');
  }
  var graph_svg = $('#svgenlargement svg');
  var svg_g = $('#svgenlargement svg g')[0];
  if (!svg_g) return;
  svg_root = graph_svg.svg().svg('get').root();

  // Find the real root and ignore any text nodes
  for (i = 0; i < svg_root.childNodes.length; ++i) {
    if (svg_root.childNodes[i].nodeName != '#text') {
      svg_root_element = svg_root.childNodes[i];
      break;
    }
  }

  //Set viewbox width and height to width and height of $('#svgenlargement svg').
  //This is essential to make sure zooming and panning works properly.
  svg_root.viewBox.baseVal.width = graph_svg.attr('width');
  svg_root.viewBox.baseVal.height = graph_svg.attr('height');

  //Now set scale and translate so svg height is about 150px and vertically centered in viewbox.
  //This is just to create a nice starting enlargement.
  var initial_svg_height = 250;
  var scale = initial_svg_height / graph_svg.attr('height');
  var additional_translate = (graph_svg.attr('height') - initial_svg_height) / (2 * scale);
  var transform = svg_g.getAttribute('transform');

  var x = 4;

  var y = parseFloat(transform.match(/translate\([^\)]*\)/)[0].split('(')[1].split(' ')[1].split(')')[0]);
  y += additional_translate;

  var transform = 'rotate(0) scale(' + scale + ')';
  svg_g.setAttribute('transform', transform);

  var keymap = document.getElementById("keymap");

  var keymap_right = keymap.getBoundingClientRect().right;
  keymap_right = svg_root.viewBox.baseVal.width - keymap_right;

  var keymap_left = keymap.getBoundingClientRect().width;

  if (text_direction == 'RL') {
    // Edge of screen minus the width of the svg minus the width of the
    // keymap minus the margin

    x = (scrollToEnd() - keymap_right - keymap_left - 40) / scale;
  } else if (text_direction == 'BI') {
    x = placeMiddle() / scale;
    y = (svg_g.getBoundingClientRect().height + 50) / scale;
  }

  svg_g.setAttribute('transform', transform + ' translate(' + x + ' ' + y + ')');

  //used to calculate min and max zoom level:
  start_element_height = $('#__START__').children('ellipse')[0].getBBox().height;
  //some use of call backs to ensure successive execution
  $.getJSON(getTextURL('readings'), function(data) {
    update_readingdata(data);
    add_relations(function() {
      $('#svgenlargement ellipse').parent().dblclick(node_dblclick_listener);
      $('#svgenlargement ellipse').each(function(i, el) {
        color_inactive(el)
      });
      $('#loading_overlay').hide();
    });
  });

  //initialize marquee
  marquee = new Marquee();
}

function add_relations(callback_fn) {
  // Add the relationship types to the keymap list
  $.each(relationship_types, function(index, typedef) {
    li_elm = $('<li class="key">').css("border-color",
      relation_manager.relation_colors[index]).text(typedef.name);
    li_elm.append($('<div>').attr('class', 'key_tip_container').append(
      $('<div>').attr('class', 'key_tip').text(typedef.description)));
    $('#keymaplist').append(li_elm);
  });
  // Save this list of names to the outer element data so that the relationship
  // factory can access it
  var rel_types = $.map(relationship_types, function(t) {
    return t.name
  });
  $('#keymap').data('relations', rel_types);
  // Now fetch the relationships themselves and add them to the graph
  var textrelpath = getTextURL('relationships');
  $.getJSON(textrelpath, function(data) {
    $.each(data, function(index, rel_info) {
      var type_index = $.inArray(rel_info.type, rel_types);
      var source_svg = rid2node[rel_info.source];
      var target_svg = rid2node[rel_info.target];
      var source_found = get_ellipse(source_svg);
      var target_found = get_ellipse(target_svg);
      var emphasis = rel_info.is_significant;
      if (type_index != -1 && source_found.size() && target_found.size()) {
        var relation = relation_manager.create(source_svg, target_svg, type_index, emphasis);
        // Save the relationship data too.
        $.each(rel_info, function(k, v) {
          relation.data(k, v);
        });
        if (editable) {
          var node_obj = get_node_obj(rel_info.source);
          node_obj.set_selectable(false);
          node_obj.ellipse.data('node_obj', null);
          node_obj = get_node_obj(rel_info.target);
          node_obj.set_selectable(false);
          node_obj.ellipse.data('node_obj', null);
        }
      }
    });
    callback_fn.call();
  });
}

function get_ellipse(node_id) {
  // See if the ID exists in readingdata; otherwise see if it exists
  // in rid2node
  var nid = node_id;
  if (node_id in rid2node) {
    nid = rid2node[node_id];
  }
  return $(jq(nid) + ' ellipse');
}

function get_node_obj(node_id) {
  var node_ellipse = get_ellipse(node_id);
  if (node_ellipse.data('node_obj') == null) {
    node_ellipse.data('node_obj', new node_obj(node_ellipse));
  };
  return node_ellipse.data('node_obj');
}

function unselect_all_readings() {
  if (readings_selected.length > 0) {
    var unselected = readings_selected;
    readings_selected = [];
    $.each(unselected, function(i, rdg) {
      var rdgnode = get_node_obj(rdg);
      if (rdgnode) {
        rdgnode.set_draggable(false);
      }
    });
  }
}



function node_obj(ellipse) {
  this.ellipse = ellipse;
  var self = this;

  this.x = 0;
  this.y = 0;
  this.dx = 0;
  this.dy = 0;
  this.node_elements = node_elements_for(self.ellipse);

  this.get_id = function() {
    return $(self.ellipse).parent().attr('id')
  }

  this.set_selectable = function(clickable) {
    color_active($(self.ellipse));
    if (clickable && editable) {
      $(self.ellipse).parent().hover(this.enter_node, this.leave_node);
      $(self.ellipse).parent().mousedown(function(evt) {
        evt.stopPropagation()
      });
      $(self.ellipse).parent().click(function(evt) {
        evt.stopPropagation();
        unselect_all_readings();
        readings_selected = [self.get_id()]
        self.set_draggable(true)
      });
    } else {
      self.ellipse.siblings('text').attr('class', '');
      $(self.ellipse).parent().unbind();
      $(self.ellipse).parent().dblclick(node_dblclick_listener);
      $('body').unbind('mousemove');
      $('body').unbind('mouseup');
    }
  }

  this.set_draggable = function(draggable) {
    if (draggable && editable) {
      $(self.ellipse).attr({
        stroke: 'black',
        fill: '#9999ff'
      });
      $(self.ellipse).parent().mousedown(this.mousedown_listener);
      $(self.ellipse).parent().unbind('mouseenter').unbind('mouseleave');
      self.ellipse.siblings('text').attr('class', 'noselect draggable');
    } else {
      color_active($(self.ellipse));
      self.ellipse.siblings('text').attr('class', '');
      $(self.ellipse).parent().unbind('mousedown ');
      $(self.ellipse).parent().mousedown(function(evt) {
        evt.stopPropagation()
      });
      $(self.ellipse).parent().hover(this.enter_node, this.leave_node);
    }
  }

  this.mousedown_listener = function(evt) {
    evt.stopPropagation();
    self.x = evt.clientX;
    self.y = evt.clientY;
    $('body').mousemove(self.mousemove_listener);
    $('body').mouseup(self.mouseup_listener);
    $(self.ellipse).parent().unbind('mouseenter').unbind('mouseleave')
    self.ellipse.attr('fill', '#6b6bb2');
    first_node_g_element = $("#svgenlargement g .node").filter(":first");
    if (first_node_g_element.attr('id') !== self.get_g().attr('id')) {
      self.get_g().insertBefore(first_node_g_element)
    };
  }

  this.mousemove_listener = function(evt) {
    self.dx = (evt.clientX - self.x) / mouse_scale;
    self.dy = (evt.clientY - self.y) / mouse_scale;
    self.move_elements();
    evt.returnValue = false;
    evt.preventDefault();
    return false;
  }

  this.mouseup_listener = function(evt) {
    if ($('ellipse[fill="#ffccff"]').size() > 0) {
      var source_node_id = $(self.ellipse).parent().attr('id');
      var source_node_text = self.ellipse.siblings('text').text();
      var target_node_id = $('ellipse[fill="#ffccff"]').parent().attr('id');
      var target_node_text = $('ellipse[fill="#ffccff"]').siblings("text").text();
      $('#source_node_id').val(readingdata[source_node_id]['id']);
      $('.rel_rdg_a').text("'" + source_node_text + "'");
      $('#target_node_id').val(readingdata[target_node_id]['id']);
      $('.rel_rdg_b').text("'" + target_node_text + "'");
      $('#dialog-form').dialog('open');
    };
    $('body').unbind('mousemove');
    $('body').unbind('mouseup');
    self.ellipse.attr('fill', '#9999ff');
    self.reset_elements();
  }

  this.cpos = function() {
    return {
      x: self.ellipse.attr('cx'),
      y: self.ellipse.attr('cy')
    };
  }

  this.get_g = function() {
    return self.ellipse.parent('g');
  }

  this.enter_node = function(evt) {
    self.ellipse.attr('fill', '#ffccff');
  }

  this.leave_node = function(evt) {
    color_active(self.ellipse);
  }

  this.greyout_edges = function() {
    $.each(self.node_elements, function(index, value) {
      value.grey_out('.edge');
    });
  }

  this.ungreyout_edges = function() {
    $.each(self.node_elements, function(index, value) {
      value.un_grey_out('.edge');
    });
  }

  this.reposition = function(dx, dy) {
    $.each(self.node_elements, function(index, value) {
      value.reposition(dx, dy);
    });
  }

  this.move_elements = function() {
    $.each(self.node_elements, function(index, value) {
      value.move(self.dx, self.dy);
    });
  }

  this.reset_elements = function() {
    $.each(self.node_elements, function(index, value) {
      value.reset();
    });
  }

  this.update_elements = function() {
    self.node_elements = node_elements_for(self.ellipse);
  }

  this.get_witnesses = function() {
    return readingdata[self.get_id()].witnesses
  }

  self.set_selectable(true);
}

function svgshape(shape_element) {
  this.shape = shape_element;
  this.reposx = 0;
  this.reposy = 0;
  this.repositioned = this.shape.parent().data('repositioned');
  if (this.repositioned != null) {
    this.reposx = this.repositioned[0];
    this.reposy = this.repositioned[1];
  }
  this.reposition = function(dx, dy) {
    this.move(dx, dy);
    this.reposx = this.reposx + dx;
    this.reposy = this.reposy + dy;
    this.shape.parent().data('repositioned', [this.reposx, this.reposy]);
  }
  this.move = function(dx, dy) {
    this.shape.attr("transform", "translate( " + (this.reposx + dx) + " " + (this.reposy + dy) + " )");
  }
  this.reset = function() {
    this.shape.attr("transform", "translate( " + this.reposx + " " + this.reposy + " )");
  }
  this.grey_out = function(filter) {
    if (this.shape.parent(filter).size() != 0) {
      this.shape.attr({
        'stroke': '#e5e5e5',
        'fill': '#e5e5e5'
      });
    }
  }
  this.un_grey_out = function(filter) {
    if (this.shape.parent(filter).size() != 0) {
      this.shape.attr({
        'stroke': '#000000',
        'fill': '#000000'
      });
    }
  }
}

// This is a facade/imposter/proxy/wrapper whatever you want to call it
// in between the svgpath( path_element, svg_element ) and
// get_edge_elements_for( ellipse ) methods below. Chrome introduced a
// SVG API change even if it was not a W3C recommendation yet. This removed
// the up for deprecation SVGPathSeg API from chrome's ECMA script.
// Although there is a polyfill for that (https://github.com/progers/pathseg)
// I chose to use the polyfill for SVG getPathData() and setPathData()
// (https://github.com/jarek-foksa/path-data-polyfill.js) as PathData is
// supposedly *to* *be* the spec, although Chrome kindly forgot to
// implement it. The path_element_class translates between this new spec/polyfill
// and Stemmaweb's own svgpath abstraction. It's extra plumbing, ducktape,
// staples, and elastic bands. It'll work. How hard can it be. As long as the
// center holds, hm?
function path_element_class(svgpath_for_edge, out_edge) {
  this.svgpath_for_edge = svgpath_for_edge;
  this.out_edge = out_edge;
  Object.defineProperty(this, "x", {
    get: function() {
      var path_data = svgpath_for_edge.getPathData();
      if (out_edge == true) {
        var start = path_data[0]; // the M-path, i.e. start of line
        return start.values[0];
      } else {
        var end = path_data[path_data.length - 1]; // last C-path, i.e. end of line
        return end.values[end.values.length - 2];
      }
    },
    set: function(value_for_x) {
      // console.log( value_for_x );
      var path_data = svgpath_for_edge.getPathData();
      if (out_edge == true) {
        var start = path_data[0]; // M-path
        start.values[0] = value_for_x;
      } else {
        var end = path_data[path_data.length - 1]; // last C-path
        end.values[end.values.length - 2] = value_for_x;
      }
      svgpath_for_edge.setPathData(path_data);
    }
  });
  Object.defineProperty(this, "y", {
    get: function() {
      var path_data = svgpath_for_edge.getPathData();
      if (out_edge == true) {
        var start = path_data[0]; // M-path
        return start.values[1];
      } else {
        var end = path_data[path_data.length - 1]; // last C-path
        return end.values[end.values.length - 1];
      }
    },
    set: function(value_for_y) {
      // console.log( value_for_y );
      var path_data = svgpath_for_edge.getPathData();
      if (out_edge == true) {
        var start = path_data[0]; // M-path
        start.values[1] = value_for_y;
      } else {
        var end = path_data[path_data.length - 1]; // last C-path
        end.values[end.values.length - 1] = value_for_y;
      }
      svgpath_for_edge.setPathData(path_data);
    }
  });
}

function svgpath(path_element, svg_element) {
  this.svg_element = svg_element;
  this.path = path_element;
  this.x = this.path.x;
  this.y = this.path.y;

  this.reposition = function(dx, dy) {
    this.x = this.x + dx;
    this.y = this.y + dy;
    this.path.x = this.x;
    this.path.y = this.y;
  }

  this.move = function(dx, dy) {
    this.path.x = this.x + dx;
    this.path.y = this.y + dy;
  }

  this.reset = function() {
    this.path.x = this.x;
    this.path.y = this.y;
  }

  this.grey_out = function(filter) {
    if (this.svg_element.parent(filter).size() != 0) {
      this.svg_element.attr('stroke', '#e5e5e5');
      this.svg_element.siblings('text').attr('fill', '#e5e5e5');
      this.svg_element.siblings('text').attr('class', 'noselect');
    }
  }
  this.un_grey_out = function(filter) {
    if (this.svg_element.parent(filter).size() != 0) {
      this.svg_element.attr('stroke', '#000000');
      this.svg_element.siblings('text').attr('fill', '#000000');
      this.svg_element.siblings('text').attr('class', '');
    }
  }
}

function node_elements_for(ellipse) {
  var node_elements = get_edge_elements_for(ellipse);
  node_elements.push(new svgshape(ellipse.siblings('text')));
  node_elements.push(new svgshape(ellipse));
  return node_elements;
}

function get_edge_elements_for(ellipse) {
  var edge_elements = new Array();
  var node_id = ellipse.parent().attr('id');
  if (!node_id) return edge_elements;
  var reading_id = readingdata[node_id]['id'];
  var edge_in_pattern = new RegExp(reading_id + '$');
  var edge_out_pattern = new RegExp('^' + reading_id + '-');
  $.each($('#svgenlargement .edge,#svgenlargement .relation').children('title'), function(index) {
    var title = $(this).text();
    if (edge_in_pattern.test(title)) {
      var polygon = $(this).siblings('polygon');
      if (polygon.size() > 0) {
        edge_elements.push(new svgshape(polygon));
      }
      var path = $(this).siblings('path')[0];
      var path_element_object = new path_element_class(path, false);
      edge_elements.push(new svgpath(path_element_object, $(this).siblings('path')));
    }
    if (edge_out_pattern.test(title)) {
      var path = $(this).siblings('path')[0];
      var path_element_object = new path_element_class(path, true);
      edge_elements.push(new svgpath(path_element_object, $(this).siblings('path')));
    }
  });
  return edge_elements;
}

function relation_factory() {
  var self = this;
  this.color_memo = null;
  //TODO: colors hard coded for now
  this.temp_color = '#FFA14F';
  this.relation_colors = ["#5CCCCC", "#67E667", "#F9FE72", "#6B90D4", "#FF7673", 
                "#E467B3", "#AA67D5", "#8370D8", "#FFC173", "#EC652F", 
              "#DB3453", "#48456A", "#ABDFCE", "#502E35", "#E761AE"];

  this.create_temporary = function(source_node_id, target_node_id) {
    var relation_id = get_relation_id(source_node_id, target_node_id);
    var relation = $(jq(relation_id));
    if (relation.size() == 0) {
      draw_relation(source_node_id, target_node_id, self.temp_color);
    } else {
      self.color_memo = relation.children('path').attr('stroke');
      relation.children('path').attr('stroke', self.temp_color);
    }
  }
  this.remove_temporary = function() {
    var path_element = $('#svgenlargement .relation').children('path[stroke="' + self.temp_color + '"]');
    if (self.color_memo != null) {
      path_element.attr('stroke', self.color_memo);
      self.color_memo = null;
    } else {
      var temporary = path_element.parent('g').remove();
      temporary.empty();
      temporary = null;
    }
  }
  this.create = function(source_node_id, target_node_id, color_index, emphasis) {
    //TODO: Protect from (color_)index out of bound..
    var relation_color = self.relation_colors[color_index];
    var relation = draw_relation(source_node_id, target_node_id, relation_color, emphasis);
    get_node_obj(source_node_id).update_elements();
    get_node_obj(target_node_id).update_elements();
    // Set the relationship info box on click.
    relation.children('path').css({
      'cursor': 'pointer'
    });
    relation.children('path').click(function(event) {
      var related_nodes = get_related_nodes(relation.attr('id'));
      // Form values need to be database IDs
      var source_node_id = readingdata[related_nodes[0]]['id'];
      var target_node_id = readingdata[related_nodes[1]]['id'];
      $('#delete_source_node_id').val(source_node_id);
      $('#delete_target_node_id').val(target_node_id);
      self.showinfo(relation);
    });
    return relation;
  }
  this.showinfo = function(relation) {
    $('#delete_relation_type').text(relation.data('type'));
    $('#delete_relation_scope').text(relation.data('scope'));
    $('#delete_relation_attributes').empty();
    var significance = ' is not ';
    if (relation.data('is_significant') === 'yes') {
      significance = ' is ';
    } else if (relation.data('is_significant') === 'maybe') {
      significance = ' might be ';
    }
    $('#delete_relation_attributes').append(
      "This relationship" + significance + "stemmatically significant<br/>");
    if (relation.data('a_derivable_from_b')) {
      $('#delete_relation_attributes').append(
        "'" + relation.data('source_text') + "' derivable from '" + relation.data('target_text') + "'<br/>");
    }
    if (relation.data('b_derivable_from_a')) {
      $('#delete_relation_attributes').append(
        "'" + relation.data('target_text') + "' derivable from '" + relation.data('source_text') + "'<br/>");
    }
    if (relation.data('non_independent')) {
      $('#delete_relation_attributes').append(
        "Variance unlikely to arise coincidentally<br/>");
    }
    if (relation.data('note')) {
      $('#delete_relation_note').text('note: ' + relation.data('note'));
    }
    var points = relation.children('path').attr('d').slice(1).replace('C', ' ').split(' ');
    var xs = parseFloat(points[0].split(',')[0]);
    var xe = parseFloat(points[1].split(',')[0]);
    var ys = parseFloat(points[0].split(',')[1]);
    var ye = parseFloat(points[3].split(',')[1]);
    var p = svg_root.createSVGPoint();
    p.x = xs + ((xe - xs) * 1.1);
    p.y = ye - ((ye - ys) / 2);
    var ctm = svg_root_element.getScreenCTM();
    var nx = p.matrixTransform(ctm).x;
    var ny = p.matrixTransform(ctm).y;
    var dialog_aria = $("div[aria-labelledby='ui-dialog-title-delete-form']");
    $('#delete-form').dialog('open');
    dialog_aria.offset({
      left: nx,
      top: ny
    });
  }
  this.remove = function(relation_id) {
    if (!editable) {
      return;
    }
    var relation = $(jq(relation_id));
    relation.remove();
  }
}

// Utility function to create/return the ID of a relation link between
// a source and target.
function get_relation_id(source_id, target_id) {
  // Make sure we are dealing with SVG node IDs
  if (!(source_id in readingdata)) {
    source_id = rid2node[source_id]
  }
  if (!(target_id in readingdata)) {
    target_id = rid2node[target_id]
  }
  var idlist = [source_id, target_id];
  idlist.sort();
  return 'relation-' + idlist[0] + '-___-' + idlist[1];
}

function get_related_nodes(relation_id) {
  var srctotarg = relation_id.substr(9);
  return srctotarg.split('-___-');
}

function draw_relation(source_id, target_id, relation_color, emphasis) {
  var source_ellipse = get_ellipse(source_id);
  var target_ellipse = get_ellipse(target_id);
  var relation_id = get_relation_id(source_id, target_id);
  var svg = $('#svgenlargement').children('svg').svg().svg('get');
  var path = svg.createPath();
  var sx = parseInt(source_ellipse.attr('cx'));
  var rx = parseInt(source_ellipse.attr('rx'));
  var sy = parseInt(source_ellipse.attr('cy'));
  var ex = parseInt(target_ellipse.attr('cx'));
  var ey = parseInt(target_ellipse.attr('cy'));
  var relation = svg.group($("#svgenlargement svg g"), {
    'class': 'relation',
    'id': relation_id
  });
  svg.title(relation, source_id + '->' + target_id);
  var stroke_width = emphasis === "yes" ? 6 : emphasis === "maybe" ? 4 : 2;
  svg.path(relation, path.move(sx, sy).curveC(sx + (2 * rx), sy, ex + (2 * rx), ey, ex, ey), {
    fill: 'none',
    stroke: relation_color,
    strokeWidth: stroke_width
  });
  var relation_element = $('#svgenlargement .relation').filter(':last');
  relation_element.insertBefore($('#svgenlargement g g').filter(':first'));
  return relation_element;
}

function delete_relation(form_values) {
  ncpath = getTextURL('relationships');
  var jqjson = $.ajax({
    url: ncpath,
    data: form_values,
    success: function(data) {
      $.each(data['relationships'], function(item, source_target) {
        relation_manager.remove(get_relation_id(source_target[0], source_target[1]));
      });
      $("#delete-form").dialog("close");
    },
    dataType: 'json',
    type: 'DELETE'
  });
}

function detach_node(readings) {
  // separate out the deleted relationships, discard for now
  if ('DELETED' in readings) {
    // Remove each of the deleted relationship links.
    $.each(readings['DELETED'], function(idx, pair) {
      relation_manager.remove(get_relation_id(pair[0], pair[1]));
    });
    delete readings['DELETED'];
  }
  // add new node(s)
  update_readingdata(readings);
  // remove from existing readings the witnesses for the new nodes/readings
  $.each(readings, function(node_id, reading) {
    $.each(reading.witnesses, function(index, witness) {
      var orig_svg_id = rid2node[reading.orig_reading];
      var witnesses = readingdata[orig_svg_id].witnesses;
      readingdata[orig_svg_id].witnesses = $.removeFromArray(witness, witnesses);
    });
  });

  detached_edges = [];

  // here we detach witnesses from the existing edges accoring to what's being relayed by readings
  $.each(readings, function(node_id, reading) {
    var svg_id = reading.id
    var edges = edges_of(get_ellipse(reading.orig_reading));
    incoming_remaining = [];
    outgoing_remaining = [];
    $.each(reading.witnesses, function(index, witness) {
      incoming_remaining.push(witness);
      outgoing_remaining.push(witness);
    });
    $.each(edges, function(index, edge) {
      detached_edge = edge.detach_witnesses(reading.witnesses);
      if (detached_edge != null) {
        detached_edges.push(detached_edge);
        $.each(detached_edge.witnesses, function(index, witness) {
          if (detached_edge.is_incoming == true) {
            incoming_remaining = $.removeFromArray(witness, incoming_remaining);
          } else {
            outgoing_remaining = $.removeFromArray(witness, outgoing_remaining);
          }
        });
      }
    });

    // After detaching we still need to check if for *all* readings
    // an edge was detached. It may be that a witness was not
    // explicitly named on an edge but was part of a 'majority' edge
    // in which case we need to duplicate and name that edge after those
    // remaining witnesses.
    if (outgoing_remaining.length > 0) {
      $.each(edges, function(index, edge) {
        if (edge.get_label() == 'majority' && !edge.is_incoming) {
          detached_edges.push(edge.clone_for(outgoing_remaining));
        }
      });
    }
    if (incoming_remaining.length > 0) {
      $.each(edges, function(index, edge) {
        if (edge.get_label() == 'majority' && edge.is_incoming) {
          detached_edges.push(edge.clone_for(incoming_remaining));
        }
      });
    }

    // Finally multiple selected nodes may share edges
    var copy_array = [];
    $.each(detached_edges, function(index, edge) {
      var do_copy = true;
      $.each(copy_array, function(index, copy_edge) {
        if (copy_edge.g_elem.attr('id') == edge.g_elem.attr('id')) {
          do_copy = false
        }
      });
      if (do_copy == true) {
        copy_array.push(edge);
      }
    });
    detached_edges = copy_array;

    // Lots of unabstracted knowledge down here :/
    // Clone original node/reading, rename/id it..
    duplicate_node = get_ellipse(reading.orig_reading).parent().clone();
    duplicate_node.attr('id', node_id);
    duplicate_node.children('title').text(svg_id);

    // This needs somehow to move to node or even to shapes! #repositioned
    duplicate_node_data = get_ellipse(reading.orig_reading).parent().data('repositioned');
    if (duplicate_node_data != null) {
      duplicate_node.children('ellipse').parent().data('repositioned', duplicate_node_data);
    }

    // Add the node and all new edges into the graph
    var graph_root = $('#svgenlargement svg g.graph');
    graph_root.append(duplicate_node);
    $.each(detached_edges, function(index, edge) {
      // TODO use returned sequence information to set the real
      // ID on the duplicated edges
      edge.g_elem.attr('id', (edge.g_elem.attr('id') + 'd'));
      edge_title = edge.g_elem.children('title').text();
      edge_weight = 0.8 + (0.2 * edge.witnesses.length);
      edge_title = edge_title.replace(reading.orig_reading, svg_id);
      edge.g_elem.children('title').text(edge_title);
      edge.g_elem.children('path').attr('stroke-width', edge_weight);
      // Reg unabstracted knowledge: isn't it more elegant to make
      // it edge.append_to( graph_root )?
      graph_root.append(edge.g_elem);
    });

    // Make the detached node a real node_obj
    var ellipse_elem = get_ellipse(node_id);
    var new_node = new node_obj(ellipse_elem);
    ellipse_elem.data('node_obj', new_node);

    // Move the node somewhat up for 'dramatic effect' :-p
    new_node.reposition(0, -70);

  });

}

// This takes SVG node IDs
function merge_nodes(source_node_id, target_node_id, consequences) {
  if (consequences.status != null && consequences.status == 'ok') {
    merge_node(source_node_id, target_node_id);
    if (consequences.checkalign != null) {
      $.each(consequences.checkalign, function(index, node_ids) {
        var temp_relation = draw_relation(node_ids[0], node_ids[1], "#89a02c");
        var sy = parseInt(temp_relation.children('path').attr('d').split('C')[0].split(',')[1]);
        var ey = parseInt(temp_relation.children('path').attr('d').split(' ')[2].split(',')[1]);
        var yC = ey + ((sy - ey) / 2);
        // TODO: compute xC to be always the same distance to the amplitude of the curve
        var xC = parseInt(temp_relation.children('path').attr('d').split(' ')[1].split(',')[0]);
        var svg = $('#svgenlargement').children('svg').svg('get');
        parent_g = svg.group($('#svgenlargement svg g'));
        var ids_text = node_ids[0] + '-' + node_ids[1];
        var merge_id = 'merge-' + ids_text;
        var yes = svg.image(parent_g, xC, (yC - 8), 16, 16, merge_button_yes, {
          id: merge_id
        });
        var no = svg.image(parent_g, (xC + 20), (yC - 8), 16, 16, merge_button_no, {
          id: 'no' + merge_id
        });
        $(yes).hover(function() {
          $(this).addClass('draggable')
        }, function() {
          $(this).removeClass('draggable')
        });
        $(no).hover(function() {
          $(this).addClass('draggable')
        }, function() {
          $(this).removeClass('draggable')
        });
        $(yes).click(function(evt) {
          merge_node(rid2node[node_ids[0]], rid2node[node_ids[1]]);
          temp_relation.remove();
          $(evt.target).parent().remove();
          //notify backend
          var ncpath = getTextURL('merge');
          var form_values = "source=" + node_ids[0] + "&target=" + node_ids[1] + "&single=true";
          $.post(ncpath, form_values);
        });
        $(no).click(function(evt) {
          temp_relation.remove();
          $(evt.target).parent().remove();
        });
      });
    }
  }
}

// This takes SVG node IDs
function merge_node(source_node_id, target_node_id, compressing) {
  $.each(edges_of(get_ellipse(source_node_id)), function(index, edge) {
    if (edge.is_incoming == true) {
      edge.attach_endpoint(target_node_id);
    } else {
      edge.attach_startpoint(target_node_id, compressing);
    }
  });
  if (!compressing) {
    // Add source node witnesses to target node
    // TODO see if we can get this info from the server
    // NOTE: this may need to be more complex to account for witness layers
    $.each(readingdata[source_node_id].witnesses, function(i, d) {
      readingdata[target_node_id].witnesses.push(d)
    });
  }
  delete_reading(source_node_id);
  $(jq(source_node_id)).remove();
}

// This takes SVG node IDs
function merge_left(source_node_id, target_node_id) {
  $.each(edges_of(get_ellipse(source_node_id)), function(index, edge) {
    if (edge.is_incoming == true) {
      edge.attach_endpoint(target_node_id);
    }
  });
  $(jq(source_node_id)).remove();
}

// This calls merge_node, as topologically it is doing basically the same thing.
function compress_nodes(readings) {
  //add text of other readings to 1st reading

  var first = get_ellipse(readings[0]);
  var first_title = first.parent().find('text')[0];
  var last_edges = edges_of(get_ellipse(readings[readings.length - 1]));
  for (var i = 0; i < last_edges.length; i++) {
    if (last_edges[i].is_incoming == false) {
      var last = last_edges[i];
    }
  }

  var total = parseInt(first[0].getAttribute('cx'), 10);

  for (var i = 1; i < readings.length; i++) {
    var cur = get_ellipse(readings[i]);
    var cur_title = cur.parent().find('text')[0];

    first_title.textContent += " " + cur_title.textContent;
    total += parseInt(cur[0].getAttribute('cx'), 10);
  };

  var avg = Math.round(total / readings.length);

  // Reattach last external edge to new to-be-merged node: NB: We
  // can't to this after the removal as startpoint wants the cx etc
  // of the ellipse the edge is moving from..
  //    last.attach_startpoint(readings[0]);


  // do this once:
  var x = parseInt(first[0].getAttribute('cx'), 10);
  first[0].setAttribute('rx', 4.5 * first_title.textContent.length);

  if (text_direction !== "BI") {
    first[0].setAttribute('cx', avg);
    first_title.setAttribute('x', first[0].getAttribute('cx'));
  }

  //merge then delete all others
  for (var i = 1; i < readings.length; i++) {
    var node = get_ellipse(readings[i]);
    var rid = readings[i - 1] + '->' + readings[i];

    var titles = svg_root.getElementsByTagName('title');
    var titlesArray = [].slice.call(titles);

    // old edge, delete after moving stuff around!
    if (titlesArray.length > 0) {
      var title = titlesArray.find(function(elem) {
        return elem.textContent === rid;
      });
    }

    // only merge start on the last one, else, we get ourselves confused!
    if (readings[i] == readings[readings.length - 1]) {
      merge_node(rid2node[readings[i]], rid2node[readings[0]], true);
    } else {
      merge_left(rid2node[readings[i]], rid2node[readings[0]]);
    }

    if (title && title.parentNode) {
      title.parentNode.remove();
    }
  }

  /* Fix size of arrows to node for LR/RL texts. */
  if (text_direction !== "BI") {
    /* This is the remaining node; find the incoming edge, which is now the
     * wrong size */
    var first_edge;
    var first_edges = edges_of(first);

    for (var i = 0; i < first_edges.length; i++) {
      if (first_edges[i].is_incoming == true) {
        first_edge = first_edges[i];
        break;
      }
    }

    if (first_edge) {
      //arrow
      var polygon = first_edge.g_elem.children('polygon');

      if (polygon.size() > 0) {
        //the line
        var edge_elem = first_edge.g_elem.children('path')[0];

        var d = edge_elem.getAttribute('d');
        //https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
        //This 'Curveto' property determines how long the line is.
        //The Syntax is C c1x,c1y c2x,c2y x,y where x,y are where the
        //path ends.
        var c_attr = d.match(/C(\S+) (\S+) (\S+)/);

        var c_x = parseInt(first[0].getAttribute('cx'), 10);
        var r_x = parseInt(first[0].getAttribute('rx'), 10);

        var x;
        if (text_direction === 'LR') {
          //line ends to the left of the ellipse,
          //so its center minus its radius
          x = c_x - r_x;
        } else if (text_direction === 'RL') {
          //line ends to the right of the ellipse,
          //so its center plus its radius
          x = c_x + r_x;
        }

        if (c_attr.length >= 4) {
          var full = c_attr.shift();

          var end_point = c_attr[2].split(',');
          var end_x = parseInt(end_point[0]);
          var end_y = parseInt(end_point[1]);
          //how much do we need to move the arrow by?
          //this is the same amount we'll be moving its line
          var dx = x - end_x;

          //build the new 'C' property. We only changed 'x' here
          var new_cattr = "C" + c_attr[0] + " " + c_attr[1] + " " + x + "," + end_y;
          edge_elem.setAttribute('d', d.replace(full, new_cattr));

          //and moe the arrow
          var end_point_arrowhead = new svgshape(polygon);
          end_point_arrowhead.reposition(dx, 0);
        }
      }
    }
  }

  get_node_obj(readings[0]).update_elements();
}

function Marquee() {

  var self = this;

  this.x = 0;
  this.y = 0;
  this.dx = 0;
  this.dy = 0;
  this.enlargementOffset = $('#svgenlargement').offset();
  this.svg_rect = $('#svgenlargement svg').svg('get');

  this.show = function(event) {
    self.x = event.clientX;
    self.y = event.clientY;
    p = svg_root.createSVGPoint();
    p.x = event.clientX - self.enlargementOffset.left;
    p.y = event.clientY - self.enlargementOffset.top;
    self.svg_rect.rect(p.x, p.y, 0, 0, {
      fill: 'black',
      'fill-opacity': '0.1',
      stroke: 'black',
      'stroke-dasharray': '4,2',
      strokeWidth: '0.02em',
      id: 'marquee'
    });
  };

  this.expand = function(event) {
    self.dx = (event.clientX - self.x);
    self.dy = (event.clientY - self.y);
    var rect = $('#marquee');
    if (rect.length != 0) {
      var rect_w = Math.abs(self.dx);
      var rect_h = Math.abs(self.dy);
      var rect_x = self.x - self.enlargementOffset.left;
      var rect_y = self.y - self.enlargementOffset.top;
      if (self.dx < 0) {
        rect_x = rect_x - rect_w
      }
      if (self.dy < 0) {
        rect_y = rect_y - rect_h
      }
      rect.attr("x", rect_x).attr("y", rect_y).attr("width", rect_w).attr("height", rect_h);
    }
  };

  this.select = function() {
    var rect = $('#marquee');
    if (rect.length != 0) {
      //unselect any possible selected first
      //TODO: unless SHIFT?
      unselect_all_readings();

      //compute dimension of marquee
      var left = $('#marquee').offset().left;
      var top = $('#marquee').offset().top;
      var right = left + parseInt($('#marquee').attr('width'));
      var bottom = top + parseInt($('#marquee').attr('height'));
      var tf = svg_root_element.getScreenCTM().inverse();
      var p = svg_root.createSVGPoint();
      p.x = left;
      p.y = top;
      var cx_min = p.matrixTransform(tf).x;
      var cy_min = p.matrixTransform(tf).y;
      p.x = right;
      p.y = bottom;
      var cx_max = p.matrixTransform(tf).x;
      var cy_max = p.matrixTransform(tf).y;
      // Local variable for witness sigla, for the HTML form
      $('#svgenlargement ellipse').each(function(index) {
        var cx = parseInt($(this).attr('cx'));
        var cy = parseInt($(this).attr('cy'));

        // This needs somehow to move to node or even to shapes! #repositioned
        // We should ask something more aling the lines of: nodes.each { |item| node.selected? }
        var org_translate = $(this).parent().data('repositioned');
        if (org_translate != null) {
          cx = cx + org_translate[0];
          cy = cy + org_translate[1];
        }

        //select any node with its center inside the marquee
        if (cx > cx_min && cx < cx_max) {
          if (cy > cy_min && cy < cy_max) {
            // Take note of the selected reading(s) and applicable witness(es)
            // so we can populate the multipleselect-form
            readings_selected.push($(this).parent().attr('id'));
          }
        }
      });

      $.each(readings_selected, function(i, reading) {
        color_active(get_ellipse(reading));
      });

      self.svg_rect.remove($('#marquee'));
    }
  };

  this.unselect = function() {
    unselect_all_readings();
  }

}

// This is called with reading database IDs, using form values.
function readings_equivalent(source, target) {
  var sourcetext = readingdata[rid2node[source]].text;
  var targettext = readingdata[rid2node[target]].text;
  if (sourcetext === targettext) {
    return true;
  }
  // Lowercase and strip punctuation from both and compare again
  var nonwc = XRegExp('[^\\p{L}\\s]|_');
  var stlc = XRegExp.replace(sourcetext.toLocaleLowerCase(), nonwc, "", 'all');
  var ttlc = XRegExp.replace(targettext.toLocaleLowerCase(), nonwc, "", 'all');
  if (stlc === ttlc) {
    return true;
  }
  return false;
}

function scrollToEnd() {
  var stateTf = svg_root_element.getCTM().inverse();

  var elem_width = Math.floor(svg_root_element.getBoundingClientRect().width);
  var vbdim = svg_root.viewBox.baseVal;

  var x = vbdim.width - elem_width;

  return x;
}

function placeMiddle() {
  var stateTf = svg_root_element.getCTM().inverse();

  var elem_width = Math.floor(svg_root_element.getBoundingClientRect().width);
  var vbdim = svg_root.viewBox.baseVal;

  var x = Math.floor((vbdim.width - elem_width) / 2);

  return x;
}

// Function to request the text of a particular lemma or witness
function requestRunningText() {
  var which = $('input[type=radio][name=view_as]:checked').val();
  var whichwit = $('select#textview_witness').val();
  // If nothing is selected yet, do nothing
  // If we have the witness radio button checked but no witness selected, do nothing
  if (!which || (which === "witness" && whichwit === "")) {
    return;
  }
  
  // Remove any prior error message
  $('#section-text-status').empty();
  // Construct the correct URL
  var ncpath = which === "lemma" ? getTextURL('lemmatext') : getTextURL('witnesstext/' + whichwit);
  // Make the request
  var jqjson = $.get(ncpath, function(data) {
    // ...and fill in the answer.
    var textspan = $('<p>').text(data['text']);
    $('#section_text_display').empty().append(textspan); 
  });
}

// Set up keypress commands:

var keyCommands = {
  // TODO maybe also 'c' for compress and/or 's' for split...
  '104': {
    'key': 'h',
    'description': 'Show / hide this menu',
    'function': function() {
      $('#keystroke_menu').toggle();
    }
  },
  '99': {
    'key': 'c',
    'description': 'Concatenate a sequence of readings into a single reading',
    'function': function() {
      // C for Compress; TODO get rid of dialog altogether
      if (readings_selected.length > 0) {
        $('#action-concat').prop('checked', true);
        $('#multipleselect-form').dialog('open');
      }
    }
  },
  '100': {
    'key': 'd',
    'description': 'Detach one or more witnesses from the collation for the selected reading(s)',
    'function': function() {
      // D for Detach
      if (readings_selected.length > 0) {
        $('#action-detach').prop('checked', true);
        $('#multipleselect-form').dialog('open');
      }
    }
  },
  '108': {
    'key': 'l',
    'description': 'Set / unset the selected reading(s) as canonical / lemma',
    'function': function() {
      // L for making a Lemma
      $.each(readings_selected, function(i, reading_id) {
        // need current state of lemmatization
        var selected = readingdata[reading_id]
        var set_lemma = !selected['is_lemma']
        var ncpath = getReadingURL(reading_id);
        var form_values = {
          'id': reading_id,
          'is_lemma': set_lemma,
        };
        var jqjson = $.post(ncpath, form_values, function(data) {
          readings_selected = [];
          $.each(data['readings'], function(i, rdgdata) {
            // The reading data already exists; we assume that the
            // database ID hasn't changed, and replace it wholesale.
            var this_nodeid = update_reading(rdgdata);
            if ($('#update_workspace_button').data('locked')) {
              color_active(get_ellipse(this_nodeid));
            } else {
              // Re-color the node if necessary
              color_inactive(get_ellipse(this_nodeid));
            }
          });
        });
      });
    }
  },
  '120': {
    'key': 'x',
    'description': 'Expunge all relationships on the selected reading(s)',
    'function': function() {
      // X for eXpunge relationships
      $.each(readings_selected, function(i, reading_id) {
        var form_values = 'from_reading=' + readingdata[reading_id]['id'];
        delete_relation(form_values);
      });
    }
  },
};

// Return the content of the keystroke menu.
function keystroke_menu() {
  var htmlstr = '<h4>Keystroke commands for selected readings</h4><p>Click the pen to enable reading ' +
    'selection. Readings can be selected by clicking, or by dragging across ' +
    'the screen in edit mode. Press any of the following keys to take the ' +
    'corresponding action:</p><ul>';
  $.each(keyCommands, function(k, v) {
    htmlstr += '<li><b>' + v['key'] + '</b>: ' + v['description'] + '</li>';
  });
  htmlstr += '</ul><p>Double-click a reading to access its properties; drag a reading to another one to create a relationship. For fuller documentation see the "About/Help" link.</p>';
  return htmlstr;
}


// Now get to work on the document.
// First error handling...
$(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
  var error;
  var errordiv;
  // Is it an authorization error?
  if (ajaxSettings.type == 'POST' && jqXHR.status == 403 &&
    jqXHR.responseText.indexOf('do not have permission to modify') > -1) {
    error = 'You are not authorized to modify this tradition. (Try logging in again?)';
  } else {
    try {
      var errobj = jQuery.parseJSON(jqXHR.responseText);
      error = errobj.error;
    } catch (e) {
      error = jqXHR.statusText;
    }
  }

  // To which box does it belong?
  if ($('#dialog-form').dialog('isOpen')) {
    if (ajaxSettings.url == getTextURL('merge')) {
      error += '<br>The readings cannot be merged.</p>';
    } else {
      // we were trying to make a relationship
      error += '<br>The relationship cannot be made.</p>';
    }
    errordiv = '#dialog-form-status';
  } else if ($('#delete-form').dialog('isOpen')) {
    // the delete box
    error += '<br>The relationship cannot be deleted.</p>';
    errordiv = '#delete-status';
  } else if ($('#multipleselect-form').dialog('isOpen')) {
    errordiv = '#multipleselect-form-status';
    if (ajaxSettings.url == getTextURL('duplicate')) {
      error += '<br>The reading cannot be duplicated.</p>';
    } else {
      error += '<br>The readings cannot be concatenated.</p>';
    }
  } else if ($('#reading-form').dialog('isOpen')) {
    // reading box
    error += '<br>The reading cannot be altered.</p>';
    errordiv = '#reading-status';
  } else if ($('#section-info').dialog('isOpen')) {
    // section box
    error += '<br>The section cannot be updated.</p>';
    errordiv = '#section-form-status';
  } else if ($('#section-text').dialog('isOpen')) {
    error += '<br>The running text cannot be retrieved.</br>';
    errordiv = '#section-text-status';
  } else {
    // Probably a keystroke action
    error += '<br>The action cannot be performed.</p>';
    errordiv = '#error-display';
  }

  // Populate the box with the error message
  $(errordiv).append('<p class="error">Error: ' + error);

  // Open the dialog explicitly if we need to
  if (errordiv == '#error-display') {
    $(errordiv).dialog('open');
  } else {
    // Reset the buttons on the existing dialog
    $(errordiv).parents('.ui-dialog').find('.ui-button').button("enable");
  }

  // ...then initialization.
}).ready(function() {

  timer = null;
  relation_manager = new relation_factory();

  $('#update_workspace_button').data('locked', false);

  // Set up the mouse events on the SVG enlargement
  $('#enlargement').mousedown(function(event) {
    $(this)
      .data('down', true)
      .data('x', event.clientX)
      .data('y', event.clientY)
      .data('scrollLeft', this.scrollLeft)
    stateTf = svg_root_element.getCTM().inverse();
    var p = svg_root.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    stateOrigin = p.matrixTransform(stateTf);

    // Activate marquee if in interaction mode
    if ($('#update_workspace_button').data('locked') == true) {
      marquee.show(event)
    };

    event.returnValue = false;
    event.preventDefault();
    return false;
  }).mouseup(function(event) {
    marquee.select();
    $(this).data('down', false);
  }).mousemove(function(event) {
    if (timer != null) {
      clearTimeout(timer);
    }
    if (($(this).data('down') == true) && ($('#update_workspace_button').data('locked') == false)) {
      var p = svg_root.createSVGPoint();
      p.x = event.clientX;
      p.y = event.clientY;
      p = p.matrixTransform(stateTf);
      var matrix = stateTf.inverse().translate(p.x - stateOrigin.x, p.y - stateOrigin.y);
      var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";
      svg_root_element.setAttribute("transform", s);
    }
    marquee.expand(event);
    event.returnValue = false;
    event.preventDefault();
  }).mousewheel(function(event, delta) {
    event.returnValue = false;
    event.preventDefault();
    if ($('#update_workspace_button').data('locked') == false) {
      if (!delta || delta == null || delta == 0) delta = event.originalEvent.wheelDelta;
      if (!delta || delta == null || delta == 0) delta = -1 * event.originalEvent.detail;
      if (delta < -9) {
        delta = -9
      };
      var z = 1 + delta / 10;
      z = delta > 0 ? 1 : -1;
      var g = svg_root_element;
      if (g && ((z < 1 && (g.getScreenCTM().a * start_element_height) > 4.0) || (z >= 1 && (g.getScreenCTM().a * start_element_height) < 100))) {
        var root = svg_root;
        var p = root.createSVGPoint();
        p.x = event.originalEvent.clientX;
        p.y = event.originalEvent.clientY;
        p = p.matrixTransform(g.getCTM().inverse());
        var scaleLevel = 1 + (z / 20);
        var k = root.createSVGMatrix().translate(p.x, p.y).scale(scaleLevel).translate(-p.x, -p.y);
        var matrix = g.getCTM().multiply(k);
        var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";
        g.setAttribute("transform", s);
      }
    }
  }).css({
    'overflow': 'hidden',
    'cursor': '-moz-grab'
  });


  // Set up the various dialog boxes.
  // dialog-form (relationship creation/merge) and multiselect should only be set up
  // if the tradition is editable. delete-form (relationship info) and reading-form
  // should be set up in all cases.
  if (editable) {
    $('#dialog-form').dialog({
      autoOpen: false,
      height: "auto",
      width: 340,
      modal: true,
      buttons: {
        'Merge readings': function(evt) {
          var mybuttons = $(evt.target).closest('button').parent().find('button');
          mybuttons.button('disable');
          form_values = $('#merge_node_form').serialize();
          ncpath = getTextURL('merge');
          var jqjson = $.post(ncpath, form_values, function(data) {
            merge_nodes(rid2node[$('#source_node_id').val()],
              rid2node[$('#target_node_id').val()], data);
            mybuttons.button('enable');
            $('#dialog-form').dialog('close');
          });
        },
        OK: function(evt) {
          var mybuttons = $(evt.target).closest('button').parent().find('button');
          mybuttons.button('disable');
          form_values = $('#merge_node_form').serialize();
          ncpath = getTextURL('relationships');
          var jqjson = $.post(ncpath, form_values, function(data) {
            // Stash the new relationships.
            $.each(data['relationships'], function(item, source_target) {
              var source_found = get_ellipse(source_target[0]);
              var target_found = get_ellipse(source_target[1]);
              var relation_found = $.inArray(source_target[2], $('#keymap').data('relations'));
              if (source_found.size() && target_found.size() && relation_found > -1) {
                var emphasis = $('#is_significant option:selected').attr('value');
                var relation = relation_manager.create(source_target[0], source_target[1], relation_found, emphasis);
                $.each($('#merge_node_form').serializeArray(), function(i, k) {
                  relation.data(k.name, k.value);
                });
              }
            });
            // Stash any changed readings.
            $.each(data['readings'], function(i, rdgdata) {
              update_reading(rdgdata);
            });
            mybuttons.button('enable');
            $('#dialog-form').dialog('close');
          }, 'json');
        },
        Cancel: function() {
          $('#dialog-form-status').empty();
          $(this).dialog('close');
        }
      },
      create: function(event, ui) {
        $(this).data('relation_drawn', false);
        $('#rel_type').data('changed_after_open', false);
        $.each(relationship_types, function(index, typedef) {
          $('#rel_type').append($('<option />').attr("value", typedef.name).text(typedef.name));
        });
        $.each(relationship_scopes, function(index, value) {
          $('#scope').append($('<option />').attr("value", value).text(value));
        });
        $.each(ternary_values, function(index, value) {
          $('#is_significant').append($('<option />').attr("value", value).text(value));
        });
        // Handler to reset fields to default, the first time the relationship
        // is changed after opening the form.
        $('#rel_type').change(function() {
          if (!$(this).data('changed_after_open')) {
            $('#note').val('');
            $(this).find(':checked').removeAttr('checked');
          }
          $(this).data('changed_after_open', true);
        });
      },
      open: function() {
        relation_manager.create_temporary(
          $('#source_node_id').val(), $('#target_node_id').val());
        var buttonset = $(this).parent().find('.ui-dialog-buttonset')
        if (readings_equivalent($('#source_node_id').val(),
            $('#target_node_id').val())) {
          buttonset.find("button:contains('Merge readings')").show();
        } else {
          buttonset.find("button:contains('Merge readings')").hide();
        }
        $(".ui-widget-overlay").css("background", "none");
        $("#dialog-form-status").empty();
        $("#dialog_overlay").show();
        $("#dialog_overlay").height($("#enlargement_container").height());
        $("#dialog_overlay").width($("#enlargement_container").innerWidth());
        $("#dialog_overlay").offset($("#enlargement_container").offset());
        $('#rel_type').data('changed_after_open', false);
      },
      close: function() {
        relation_manager.remove_temporary();
        $("#dialog_overlay").hide();
      }
    });

    $("#multipleselect-form").dialog({
      autoOpen: false,
      height: "auto",
      width: 250,
      modal: true,
      buttons: [{
          text: "Cancel",
          click: function() {
            $('#multipleselect-form-status').empty();
            $(this).dialog("close");
          }
        },
        {
          text: "Detach",
          id: "detach_btn",
          click: function(evt) {
            var self = $(this);
            var mybuttons = $(evt.target).closest('button').parent().find('button');
            mybuttons.button('disable');
            var form_values = $('#detach_collated_form').serialize();
            ncpath = getTextURL('duplicate');
            var jqjson = $.post(ncpath, form_values, function(data) {
              readings_selected = [];
              detach_node(data);
              mybuttons.button("enable");
              self.dialog("close");
            });
          }
        },
        {
          text: "Concatenate",
          id: "concat_btn",
          click: function(evt) {
            var self = $(this);
            var mybuttons = $(evt.target).closest('button').parent().find('button');
            mybuttons.button('disable');

            var ncpath = getTextURL('compress');
            var form_values = $('#detach_collated_form').serialize();
            // $.each($('#detach_collated_form input').filter(function() {return this.getAttribute("name") === "readings[]"}), function( i, v ) {vals.push(i)}); vals

            var jqjson = $.post(ncpath, form_values, function(data) {
              mybuttons.button('enable');
              if (data.nodes) {
                compress_nodes(data.nodes);
              }
              if (!data.success) {
                var dataerror = $('<p>').attr('class', 'error').text(data.warning);
                $('#multipleselect-form-status').append(dataerror);
              } else {
                self.dialog('close');
              }
            });
          }
        }
      ],
      create: function(event, ui) {
        var buttonset = $(this).parent().find('.ui-dialog-buttonset').css('width', '100%');
        buttonset.find("button:contains('Cancel')").css('float', 'right');
        $('#action-detach').change(function() {
          if ($('#action-detach')[0].checked) {
            $('#detach_collated_form').show();
            $('#multipleselect-form-text').show();

            $('#detach_btn').show();
            $('#concat_btn').hide();
          }
        });

        $('#action-concat').change(function() {
          if ($('#action-concat')[0].checked) {
            $('#detach_collated_form').hide();
            $('#multipleselect-form-text').hide();

            $('#detach_btn').hide();
            $('#concat_btn').show();
          }
        });
      },
      open: function() {
        $(this).dialog("option", "width", 200);
        $(".ui-widget-overlay").css("background", "none");
        $('#multipleselect-form-status').empty();
        $("#dialog_overlay").show();
        $("#dialog_overlay").height($("#enlargement_container").height());
        $("#dialog_overlay").width($("#enlargement_container").innerWidth());
        $("#dialog_overlay").offset($("#enlargement_container").offset());

        if ($('#action-concat')[0].checked) {
          $('#detach_collated_form').hide();
          $('#multipleselect-form-text').hide();

          $('#detach_btn').hide();
          $('#concat_btn').show();
        } else {
          $('#detach_collated_form').show();
          $('#multipleselect-form-text').show();

          $('#detach_btn').show();
          $('#concat_btn').hide();
        }

        // Populate the forms with the currently selected readings
        $('#detach_collated_form').empty();
        var witnesses = [];

        function sortByRank(a, b) {
          if (readingdata[a]["rank"] === readingdata[b]["rank"]) return 0;
          return readingdata[a]["rank"] < readingdata[b]["rank"] ? -1 : 1;
        };
        readings_selected.sort(sortByRank);
        $.each(readings_selected, function(index, value) {
          $('#detach_collated_form').append($('<input>').attr(
            "type", "hidden").attr("name", "readings[]").attr(
            "value", readingdata[value]['id']));
          var this_witnesses = readingdata[value]['witnesses'];
          witnesses = arrayUnique(witnesses.concat(this_witnesses));

        });
        $.each(witnesses, function(index, value) {
          $('#detach_collated_form').append(
            '<input type="checkbox" name="witnesses[]" value="' + value +
            '">' + value + '<br>');
        });
        $('#multiple_selected_readings').attr('value', readings_selected.join(','));
      },
      close: function() {
        marquee.unselect();
        $("#dialog_overlay").hide();
      }
    });
  } else {
    // Hide the unused elements
    $('#update_workspace_button').hide();
    $('#keystroke_menu_button').hide();
    $('#dialog-form').hide();
    $('#multipleselect-form').hide();
    $('#keystroke_menu').hide();
  }

  // Set up the relationship info display and deletion dialog.
  $("#delete-form").dialog({
    autoOpen: false,
    height: "auto",
    width: 300,
    modal: false,
    buttons: {
      OK: function() {
        $('#delete-status').empty()
        $(this).dialog("close");
      },
      "Delete all": function() {
        form_values = $('#delete_relation_form').serialize();
        form_values += "&scopewide=true";
        delete_relation(form_values);
      },
      Delete: function() {
        form_values = $('#delete_relation_form').serialize();
        delete_relation(form_values);
      }
    },
    create: function(event, ui) {
      // TODO What is this logic doing?
      // This scales the buttons in the dialog and makes it look proper
      // Not sure how essential it is, does anything break if it's not here?
      var buttonset = $(this).parent().find('.ui-dialog-buttonset').css('width', '100%');
      buttonset.find("button:contains('OK')").css('float', 'right');
    },
    open: function() {
      // Show the appropriate buttons...
      var buttonset = $(this).parent().find('.ui-dialog-buttonset')
      // If the user can't edit, show only the OK button
      if (!editable) {
        buttonset.find("button:contains('Delete')").hide();
        // If the relationship scope is local, show only OK and Delete
      } else if ($('#delete_relation_scope').text() === 'local') {
        $(this).dialog("option", "width", 160);
        buttonset.find("button:contains('Delete')").show();
        buttonset.find("button:contains('Delete all')").hide();
        // Otherwise, show all three
      } else {
        $(this).dialog("option", "width", 200);
        buttonset.find("button:contains('Delete')").show();
      }
    },
    close: function() {}
  });


  // function for reading form dialog should go here;
  $('#reading-form').dialog({
    autoOpen: false,
    // height: 400,
    width: 450,
    modal: true,
    buttons: {
      Cancel: function() {
        $(this).dialog("close");
      },
      Update: function(evt) {
        // Disable the button
        var mybuttons = $(evt.target).closest('button').parent().find('button');
        mybuttons.button('disable');
        $('#reading-form-status').empty();
        var reading_id = $('#reading_id').val()
        form_values = {
          'id': reading_id,
          'is_lemma': $('#reading_is_lemma').is(':checked'),
          'is_nonsense': $('#reading_is_nonsense').is(':checked'),
          'grammar_invalid': $('#reading_grammar_invalid').is(':checked'),
          'normal_form': $('#reading_normal_form').val(),
          'text': $('#reading_text').val(),
          'display': $('#reading_display').val()
        };
        // Make the JSON call
        ncpath = getReadingURL(reading_id);
        var jqjson = $.post(ncpath, form_values, function(data) {
          $.each(data['readings'], function(i, rdgdata) {
            var this_nodeid = update_reading(rdgdata);
            if ($('#update_workspace_button').data('locked') == false) {
              // Re-color the node if necessary
              color_inactive(get_ellipse(this_nodeid));
            } else {
              color_active(get_ellipse(this_nodeid));
            }
          });
          mybuttons.button("enable");
          $("#reading-form").dialog("close");
        });
        return false;
      }
    },
    create: function() {
      if (!editable) {
        // Get rid of the disallowed editing UI bits
        $(this).dialog("option", "buttons", [{
          text: "OK",
          click: function() {
            $(this).dialog("close");
          }
        }]);
      }
    },
    open: function() {
      $(".ui-widget-overlay").css("background", "none");
      $("#dialog_overlay").show();
      $('#reading-status').empty();
      $("#dialog_overlay").height($("#enlargement_container").height());
      $("#dialog_overlay").width($("#enlargement_container").innerWidth());
      $("#dialog_overlay").offset($("#enlargement_container").offset());
      $("#reading-form").parent().find('.ui-button').button("enable");
    },
    close: function() {
      $("#dialog_overlay").hide();
    }
  });

  $('#section-info').dialog({
    autoOpen: false,
    modal: true,
    buttons: {
      Close: function() {
        $(this).dialog("close");
      },
      Update: function(evt) {
        // Disable the button
        var mybuttons = $(evt.target).closest('button').parent().find('button');
        mybuttons.button('disable');
        // Remove any prior error message
        $('#section-form-status').empty();
        // Serialise and send the form
        ncpath = getTextURL('metadata');
        var jqjson = $.post(ncpath, $('#section_info_form').serialize(), function(data) {
          // Update the section name in the display
          sect_metadata = data;
          $('#text_title').empty().append(data['name']);
          $('#section_select option:selected').empty().append(data['name']);
          // Re-enable the buttons and get out of here
          mybuttons.button("enable");
          $("#section-info").dialog("close");
        });
        return false;
      },
    },
    open: function() {
      $("#section_name").val(sect_metadata['name']);
      $("#section_language").val(sect_metadata['language']);
      // Show the appropriate buttons...
      var buttonset = $(this).parent().find('.ui-dialog-buttonset')
      // If the user can't edit, show only the OK button
      if (!editable) {
        buttonset.find("button:contains('Update')").hide();
        // If the relationship scope is local, show only OK and Delete
      }
    }
  });
  
  $('#section-text').dialog({
    autoOpen: false,
    modal: true,
    width: 800,
    height: 600,
    buttons: {
      Close: function() {
        $(this).dialog("close");
      }
    },
    open: function() {
      $('#section-text-status').empty();
      // Populate the witness list from the start node in readingdata, but only
      // if we haven't yet
      if ($('#textview_witness option').length == 1) {
        $.each(readingdata['__START__'].witnesses, function(i, wit) {
          var witopt = $('<option>').val(wit).text(wit);
          $('#textview_witness').append(witopt);
        }); 
      }
      // Refresh whatever form settings we last had
      requestRunningText();
    }
  }); 

  // Set up the error message dialog, for results from keystroke commands
  $('#error-display').dialog({
    autoOpen: false,
    width: 450,
    modal: true,
    buttons: {
      OK: function() {
        $(this).dialog("close");
      },
    }
  });

  $('#update_workspace_button').click(function() {
    if (!editable) {
      return;
    }
    var svg_enlargement = $('#svgenlargement').svg().svg('get').root();
    mouse_scale = svg_root_element.getScreenCTM().a;
    if ($(this).data('locked') == true) {
      $('#svgenlargement ellipse').each(function(index) {
        if ($(this).data('node_obj') != null) {
          $(this).data('node_obj').ungreyout_edges();
          $(this).data('node_obj').set_selectable(false);
          color_inactive($(this));
          $(this).data('node_obj', null);
        }
      })
      $(this).data('locked', false);
      $(this).css('background-position', '0px 44px');
    } else {
      var left = $('#enlargement').offset().left;
      var right = left + $('#enlargement').width();
      var tf = svg_root_element.getScreenCTM().inverse();
      var p = svg_root.createSVGPoint();
      p.x = left;
      p.y = 100;
      var cx_min = p.matrixTransform(tf).x;
      p.x = right;
      var cx_max = p.matrixTransform(tf).x;
      $('#svgenlargement ellipse').each(function(index) {
        var cx = parseInt($(this).attr('cx'));
        if (cx > cx_min && cx < cx_max) {
          if ($(this).data('node_obj') == null) {
            $(this).data('node_obj', new node_obj($(this)));
          } else {
            $(this).data('node_obj').set_selectable(true);
          }
          $(this).data('node_obj').greyout_edges();
        }
      });
      $(this).css('background-position', '0px 0px');
      $(this).data('locked', true);
    }
  });

  $('#keystroke_menu_button').click(function() {
    $('#keystroke_menu').toggle();
  });

  $('.helptag').popupWindow({
    height: 500,
    width: 800,
    top: 50,
    left: 50,
    scrollbars: 1
  });

  expandFillPageClients();
  $(window).resize(function() {
    expandFillPageClients();
  });

  $('#keystroke_menu').html(keystroke_menu);

  // Enable the keyboard shortcuts.
}).bind('keypress', function(event) {
  if (!$(".ui-dialog").is(":visible") && editable) {
    if (event.which in keyCommands) {
      var fn = keyCommands[event.which]['function'];
      fn();
    }
  }
});

function expandFillPageClients() {
  $('.fillPage').each(function() {
    $(this).height($(window).height() - $(this).offset().top - MARGIN);
  });
}

// Wondering what kicks it all in motion? See: relate.tt
function loadSVG(svgData) {
  var svgElement = $('#svgenlargement');

  $(svgElement).svg('destroy');

  $(svgElement).svg({
    loadURL: svgData,
    onLoad: svgEnlargementLoaded
  });
}



/*  OS Gadget stuff

function svg_select_callback(topic, data, subscriberData) {
  svgData = data;
  loadSVG(svgData);
}

function loaded() {
  var prefs = new gadgets.Prefs();
  var preferredHeight = parseInt(prefs.getString('height'));
  if (gadgets.util.hasFeature('dynamic-height')) gadgets.window.adjustHeight(preferredHeight);
  expandFillPageClients();
}

if (gadgets.util.hasFeature('pubsub-2')) {
  gadgets.HubSettings.onConnect = function(hum, suc, err) {
    subId = gadgets.Hub.subscribe("interedition.svg.selected", svg_select_callback);
    loaded();
  };
}
else gadgets.util.registerOnLoadHandler(loaded);
*/
