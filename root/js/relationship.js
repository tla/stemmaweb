var MARGIN = 30;
var svg_root = null;
var svg_main_graph = null;
var start_element_height = 0;
var global_zoomstart_yes = false;
var reltypes = {};
var readingdata = {};
var readings_selected = [];
var start_id;
var end_id;

function removeFromArray(value, arr) {
  var idx = arr.indexOf(value);
  if (idx > -1) {
    arr.splice(idx, 1)
  }
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

// Get the SVG node for the given reading ID using browser XPath.
function svgresolver(prefix) {
  let nsr = {
    'svg': 'http://www.w3.org/2000/svg',
    'xlink': 'http://www.w3.org/1999/xlink'
  };
  return nsr[prefix];
}

function rid2node(rid) {
  // Get each node of class 'node' that contains the reading ID, and
  // filter them to make sure they contain *only* the given ID
  let xpathexpr = '//svg:g[@class="node" and child::svg:title/text()="' +
    rid + '"]/attribute::id';
  let r = document.evaluate(xpathexpr, svg_root, svgresolver).iterateNext();
  return r ? r.value : r;
}

// Get the reading ID for the given SVG node.
function node2rid(nid) {
  let xpathexpr = '//svg:g[@class="node" and @id="' +
    nid + '"]/svg:title/text()';
  let r = document.evaluate(xpathexpr, svg_root, svgresolver).iterateNext();
  return r ? r.textContent : r;
}

// Update the browser data when we get reading updates from the server
// rdata here is a hash of reading ID -> reading info.
function update_readingdata(rdata) {
  // Put the data on in the D3 way
  d3svg.selectAll('g.node')
    .data(Object.values(rdata),
      function(d) {
        return d ? rid2node(d.id) : this.id
      });
  // Put the data in the legacy external hash
  Object.entries(rdata).forEach(([k, v]) => {
    readingdata[k] = v;
    // Throw in an extra entry for START and END nodes
    let key = v['is_start'] ? '__START__' : v['is_end'] ? '__END__' : ''
    if (key) {
      readingdata[key] = v;
    }
  });
}

// rdata here is the info for an individual reading.
function update_reading(rdata) {
  var rid = rdata['id'];
  // Update the d3 version of the data
  d3.select(jq(rid2node(rid))).data([rdata]);
  // ...and the legacy hash
  readingdata[rid] = rdata;
  // Return the SVG node ID for further visual processing.
  return rid2node(rid);
}

// Utility function to sort a group of reading node IDs by rank.
function sortByRank(a, b) {
  ra = node2rid(a);
  rb = node2rid(b);
  return readingdata[ra]["rank"] - readingdata[rb]["rank"];
}

// TODO add text decoration for emendations
function update_reading_display(node_id) {
  // Get our components
  var theGroup = d3.select(jq(node_id));
  var theShape = theGroup.select('ellipse');
  var rdata = theGroup.datum();

  // If we have to deal with HTML display text, don't
  var updateDisplay = true;
  if (rdata.display && rdata.display !== rdata.text) {
    alert("Not updating formatted display of reading");
    updateDisplay = false;
  }
  // See which existing text nodes correspond to which reading
  var displayY = 0;
  var normalY = 0;
  var displayT = [];
  var normalT = [];
  var fontFamily = null;
  var fontSize = null;
  theGroup.selectAll('text')
    .each( function() {
      // Make a note of the font in use
      if (!fontFamily) {
          fontFamily = this.getAttribute('font-family');
      }
      if (!fontSize) {
          fontSize = this.getAttribute('font-size');
      }
      // Sort out display vs. normalised text
      let yc = parseFloat(this.getAttribute('y'));
      if (displayY === 0) {
          displayY = yc;
      } else if (yc > displayY) {
          normalY = yc;
      }
      if (yc == displayY) { displayT.push(this); }
      if (yc == normalY) { normalT.push(this); }

    });
  // Display the necessary text node(s)
  // Update the actual text in case it has changed
  if (updateDisplay) {
      d3.select(displayT[0])
        .text(rdata.text);
  }
  // See if we need to add a normal form
  var cy = parseFloat(theShape.attr('cy'));
  if (rdata.normal_form && rdata.normal_form !== rdata.text) {
      if (normalT.length) {
          // Just update the text of the existing normal form label
          d3.select(normalT[0])
            .text(rdata.normal_form);
      } else {
          // We have to move the existing text node(s) up, and add
          // the normal form text
          theGroup.selectAll('text')
            .attr('y', cy - 3.8 );
          theGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('font-family', fontFamily)
            .attr('font-size', fontSize)
            .attr('x', theShape.attr('cx'))
            .attr('y', cy + 10.2)
            .attr('fill', 'grey')
            .text(rdata.normal_form)
            .call(t => normalT.push(t.node()));
          theShape.attr("ry", "25.4");
      }
  } else if (normalT.length) {
      // We don't need the normal form node anymore. Remove it and
      // reset the display X attribute(s)
      d3.select(normalT[0]).remove();
      theGroup.selectAll('text')
        .attr('y', cy + 3.7);
      theShape.attr("ry", 18);
      normalT = [];
  }

  // Resize the ellipse as necessary along the X axis.
  // Minimum from Graphviz is 27.
  var maxLength = 0;
  displayT.forEach( el => maxLength = maxLength + el.getComputedTextLength());
  if (normalT.length > 0 && normalT[0].getComputedTextLength() > maxLength) {
      maxLength = normalT[0].getComputedTextLength();
  }
  theShape.attr("rx", radiusX(maxLength));
}

function radiusX(textlen) {
    let rx = (textlen + 12.5) / 1.26;
    if (rx < 27) {
        rx = 27;
    }
    return rx;
}

function delete_reading(nodeid) {
  var rid = node2rid(nodeid);
  if (!rid) {
    alert("Node or reading ID " + nodeid + " not found");
  } else {
    delete readingdata[rid];
  }
}

// Actions for opening the reading panel
function node_dblclick_listener(evt) {
  // Open the reading dialogue for the given node.
  // First get the reading info
  var svg_id = $(this).attr('id');
  var reading_info = readingdata[node2rid(svg_id)];
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
  var nsel = d3.select(jq(svg_id));
  // Is it a normal reading...
  nsel.select('ellipse')
    .attr('stroke', d => (d && d.is_lemma) ? 'red' : 'green')
    .attr('fill', d => (d && d.is_lemma) ? '#f36d6f' : '#b3f36d');
  // ...or an emendation?
  nsel.select('rect')
    .attr('stroke', 'blue')
    .attr('fill', d => (d && d.is_lemma) ? '#f36d6f' : '#6d6ff3');
}

function color_active(el) {
  var svg_id = $(el).parent().attr('id');
  d3.select(jq(svg_id))
    .select('ellipse,rect')
    .attr('stroke', d => (d && d.is_emendation) ? 'blue' : (d && d.is_lemma) ? 'red' : 'black')
    .attr('fill', d => {
      if (readings_selected.indexOf(svg_id) > -1) {
        return '#9999ff';
      }
      return (d && d.is_lemma) ? '#ffdddd' : '#fff';
    });
}

function showLoadingScreen() {
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
}


var d3svg;
var slider;

// New marquee code attempt JMB

var selectionRect = {
  element: null,
  previousElement: null,
  currentY: 0,
  currentX: 0,
  originX: 0,
  originY: 0,
  setElement: function(ele) {
    this.previousElement = this.element;
    this.element = ele;
  },
  getNewAttributes: function() {
    var x = this.currentX < this.originX ? this.currentX : this.originX;
    var y = this.currentY < this.originY ? this.currentY : this.originY;
    var width = Math.abs(this.currentX - this.originX);
    var height = Math.abs(this.currentY - this.originY);
    return {
      x: x,
      y: y,
      width: width,
      height: height
    };
  },
  getBoundingRect: function() {
    return this.element.node().getBoundingClientRect();
  },
  init: function(newX, newY) {
    d3svg = d3.select("svg");
    //d3svg3.style("background-color", "red");
    var rectElement = d3svg.append("rect")
      .attrs({
        rx: 4,
        ry: 4,
        x: 0,
        y: 0,
        width: 0,
        height: 0
      })
      .classed("selection", true);
    this.setElement(rectElement);
    this.originX = newX;
    this.originY = newY;
    this.update(newX, newY);
  },
  update: function(newX, newY) {
    this.currentX = newX;
    this.currentY = newY;
    this.element.attrs(this.getNewAttributes());
  },
  focus: function() {
    this.element
      .style("stroke", "#DE695B")
      .style("stroke-width", "2.5");
  },
  remove: function() {
    this.element.remove();
    this.element = null;
  },
  removePrevious: function() {
    if (this.previousElement) {
      this.previousElement.remove();
    }
  }
};

function dragStart() {
  // console.log("dragStart");
  var p = d3.mouse(this);
  selectionRect.init(p[0], p[1]);
  selectionRect.removePrevious();
}

function dragMove() {
  // console.log("dragMove");
  var p = d3.mouse(this);
  selectionRect.update(p[0], p[1]);
}

function dragEnd() {
  var finalBound = selectionRect.getBoundingRect();
  if (finalBound.width > 1 && finalBound.height > 1) {
    d3.event.sourceEvent.preventDefault();
    selectionRect.focus();
    unselect_all_readings();
    d3.selectAll('#graph0 .node')
      .each(function(d) {
        // n.b. We aren't using d yet but we should be, for the reading ID
        // Get the coordinates of our shape
        let ourShape = d3.select(this).select('ellipse,rect').node();
        if (!ourShape) {
          return;
        }
        let ourGeometry = ourShape.getBoundingClientRect();
        let cx = ourGeometry.x + (ourGeometry.width / 2);
        let cy = ourGeometry.y + (ourGeometry.height / 2);
        if (cx > finalBound.left && cx < finalBound.right) {
          if (cy > finalBound.top && cy < finalBound.bottom) {
            readings_selected.push(this.getAttribute('id'));
          }
        }
      });

    readings_selected.forEach(r => color_active(get_ellipse(r)));

    // END OF SELECTION GRABBER
    selectionRect.remove();
  } else {
    // console.log("single point");
    // single point selected
    selectionRect.remove();
    // trigger click event manually
    //clicked();
  }
}

var dragBehavior = d3.drag()
  .on("drag", dragMove)
  .on("start", dragStart)
  .on("end", dragEnd);

var zoomBehavior = d3.zoom()
  .scaleExtent([0.1, 3])
  .filter(function() {
    return !d3.event.button && d3.event.type !== "wheel";
  })
  .on("zoom", zoomer);


// A function to d3-load some SVG
d3.selection.prototype.appendSVG = function(SVGString) {
  return this.select(function() {
    return this.appendChild(document.importNode(new DOMParser()
      .parseFromString(SVGString, 'application/xml').documentElement, true));
  });
};

// MAIN INITIALISATION FUNCTION
// Initialize the SVG once it exists
function svgEnlargementLoaded() {
  //Give some visual evidence that we are working
  // showLoadingScreen();
  if (editable) {
    // Show the update toggle button.
    $('#update_workspace_button').data('locked', false);
    $('#update_workspace_button').css('background-position', '0px 44px');
  }
  // Set our SVG root elements
  var svg_container = document.getElementById('svgenlargement');
  svg_main_graph = document.getElementById('graph0');
  svg_root = svg_main_graph.parentNode;

  // Get the SVG into d3 for manipulation
  d3svg = d3.select("svg");
  d3svg.style("background-color", "white");
  d3svg.style('transformOrigin', 'top left');
  // Give any lemma-text paths a more interesting color
  d3svg.selectAll('.edge[id^="l"] path').attr("stroke", "#bb2255");

  $(window).bind("mousewheel DOMMouseScroll", function(event) {
    if (event.shiftKey) {
      event.preventDefault();
    }
  });

  //JMB - BBox gets us the real (internal coords) size of the graph, as opposed to getBoundingClientRect which would show the on-screen value
  // This section mainly calculates the starting zoom. Transform origin, unlike in earlier versions, always remains as "top left". -JMB
  var ghigh = svg_main_graph.getBBox().height;
  var gwit = svg_main_graph.getBBox().width;
  var chigh = svg_container.getBoundingClientRect().height;
  var cwit = svg_container.getBoundingClientRect().width;

  // Figure out the actual starting zoom -
  // - so that the graph all fits in the box top to bottom
  // - so that the start node is centered vertically bzw. horizontally
  // TODO this needs work.
  var windowSize = text_direction === 'BI' ? cwit : chigh;
  var initialScale = windowSize / (text_direction === 'BI' ? gwit : ghigh);
  if (initialScale > 1) {
    initialScale = 1;
  }

  var initialScrollTop;
  var initialScrollLeft;
  if (text_direction === 'BI') {
    // x 0 is at left, startPosition will be positive
    var startPosition = parseInt(d3svg.select('#__START__ ellipse').attr('cx'));
    // Coordinate is cx minus half the window size
    initialScrollLeft = startPosition - (windowSize / 2);
    initialScrollTop = 0;
  } else {
    // y 0 is at bottom, startPosition will be negative
    var startSelector = text_direction === 'RL' ? '#__END__ ellipse' : '#__START__ ellipse';
    var startNode = d3svg.select(startSelector)
    var startY = parseInt(startNode.attr('cy'));
    // scroll to ((height of SVG - center of start)/scale) - (height of window / 2)
    initialScrollTop = (ghigh + startY) / initialScale - (chigh / 2);
    if (text_direction === 'RL') {
      // Calculate the left scroll - SVG end point minus width
      var startX = parseInt(startNode.attr('cx'));
      initialScrollLeft = (startX * initialScale) - gwit;
    } else {
      initialScrollLeft = 0;
    }
  }

  // Make the zoom slider
  slider = d3.select("body").append("p").append("input")
    .datum({})
    .attr("id", "slider")
    .attr("type", "range")
    .attr("value", initialScale)
    .attr("min", zoomBehavior.scaleExtent()[0])
    .attr("max", zoomBehavior.scaleExtent()[1])
    .attr("step", (zoomBehavior.scaleExtent()[1] - zoomBehavior.scaleExtent()[0]) / 100)
    .attr("orient", "vertical") // for Firefox
    .on("input", function(d) {
      zoomBehavior.scaleTo(d3svg, d3.select(this).property("value"));
    });

  // d3svg.style("transform-origin", "top left");
  d3svg.attr("transform", "scale(" + initialScale + ")");
  d3svg.call(zoomBehavior);

  // Scroll to our starting position
  svg_container.scrollTo({
    'top': initialScrollTop,
    'left': initialScrollLeft,
    'behavior': 'auto'
  });

  // Put all our sequence labels into textPath elements if we have a
  // horizontal text. Otherwise just make sure that all sequence paths
  // are classed appropriately.
  if (text_direction !== 'BI') {
    var sequenceEdges = d3svg.selectAll("g.edge")
      .each(function() {
        attach_sequence_label(this)
      });
  } else {
    d3svg.selectAll("g.edge")
      .select('path')
      .attr('class', 'sequence');
  }

  //some use of call backs to ensure successive execution
  d3.json(getTextURL('readings'))
    .then(data => {
      // Hook the reading data to the respective SVG group elements
      update_readingdata(data);
      add_relations(function() {
        $('#svgenlargement ellipse').parent().dblclick(node_dblclick_listener);
        $('#svgenlargement ellipse').each(function(i, el) {
          color_inactive(el)
        });
        $('#loading_overlay').hide();
      });
      d3.json(getTextURL('emendations'))
        .then(data => transform_emendations(data));
    });
}

// Make the offset shadow path and the textPath elements for the
// sequence edge labels
function attach_sequence_label(el) {
  // Extract the label content
  var textNode = el.getElementsByTagName('text')[0];
  if (!textNode) {
    return;
  }

  // Set up the static attributes
  var our_id = el.getAttribute('id') + 'text';
  var path_label = textNode.textContent;
  var sel = d3.select(el);
  sel.select('path')
    .attr('class', 'sequence')
    .clone()
    .attr('class', 'shadow')
    .attr('id', our_id)
    .attr('fill', 'none')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 0);
  sel.select('text')
    .attr('text-anchor', null)
    .attr('x', null)
    .attr('y', null)
    .text(null)
    .append('textPath')
    .attr('href', '#' + our_id)
    .attr('side', () => text_direction === 'LR' ? 'left' : 'right')
    .text(path_label);
  // Set up the dynamic attributes
  offset_sequence_label(el);
}

// Use this when the textPath already exists, to adjust its offset
// when the path and shadow path have been modified
function offset_sequence_label(edge) {
  var orig_path = edge.querySelector('.sequence');
  var shadow_path = edge.querySelector('.shadow');
  var text_el = edge.querySelector('text');
  var textpath_el = text_el.querySelector('textPath');
  if (!shadow_path || !textpath_el) {
    console.log("Called adjust_sequence_label on a node without a sequence label");
    return;
  }
  // Offset the shadow path
  var path_data = orig_path.getPathData();
  path_data.forEach(c => {
    c.values.forEach((v, i) => {
      if (i % 2) {
        c.values[i] = v - 5;
      }
    });
  });
  shadow_path.setPathData(path_data);

  // Offset the text label
  var startOffset = (shadow_path.getTotalLength() -
    text_el.getBBox().width) / 2;
  textpath_el.setAttribute('startOffset', startOffset);
}

// Turn all emendations into rect elements instead
function transform_emendations(edata) {
  edata.readings.forEach(r => {
    let enode = d3.select(jq(rid2node(r.id)));
    let endata = enode.datum();
    // Update the data to include extra emendation info
    Object.keys(r).forEach(k => endata[k] = r[k]);
    // Change the node shape
    let ene = enode.select('ellipse');
    let enr = enode.insert('rect', 'ellipse')
      .attr('x', ene.attr('cx') - ene.attr('rx'))
      .attr('y', ene.attr('cy') - ene.attr('ry'))
      .attr('width', ene.attr('rx') * 2)
      .attr('height', ene.attr('ry') * 2)
      .attr('rx', 5)
      .attr('ry', 5);
    ene.remove();
    color_inactive(enr.node());
  });
}

// JMB: d3 zoom function
function zoomer() {
  if ($('#update_workspace_button').data('locked') == false) {
    //document.getElementsByClassName('hasSVG')[1].style.transformOrigin = 'center top';
    //d3svg.style("background-color", "green");
    if (global_zoomstart_yes == false) {
      global_zoomstart_yes = true;
      console.log("Penguins are good.");
      // d3.event.transform.k = global_graph_scale;
    };
    // Find the center of the on-screen SVG, which should be the focus of our zoom
    var crect = d3svg.node().parentNode.getBoundingClientRect();
    var pt = d3svg.node().createSVGPoint();
    pt.x = crect.x + (crect.width / 2);
    pt.y = crect.y + (crect.height / 2);
    var svgpt = pt.matrixTransform(d3svg.node().getScreenCTM().inverse())
    // debug
    // d3svg.append('circle').attr('cx', svgpt.x).attr('cy', svgpt.y).attr('r', 3).attr('fill', 'red');

    // // Hint taken from https://stackoverflow.com/questions/6711610/
    var sf = slider.property("value");
    // // var matrix = [sf, 0, 0, sf, svgpt.x - (sf * svgpt.x), svgpt.y - (sf * svgpt.y)];
    // // var transform = 'matrix(' + matrix.join(" ") + ')';
    // var transform = 'translate(-' + svgpt.x + ', -' + svgpt.y + ')';
    // transform += ' scale(' + slider.property("value") + ') ';
    // transform += 'translate(' + svgpt.x + ', ' + svgpt.y + ')';
    // d3svg.attr('transform', transform);
    // // d3svg.attr('transform-origin', svgpt.x + " " + svgpt.y);
    d3svg.attr('transform', 'scale(' + sf + ')');

    var coords = [svgpt.x, svgpt.y];
    // This next bit grabs the coordinates relative to the container, which are used to "neaten up" the final pan.
    var coords2 = [pt.x, pt.y];
    percLR = coords2[0]
    percUD = coords2[1]
    //global_zoomstart_yes
    if (text_direction == 'BI') {
      // Locked pan to centre of X Axis
      var gwit = svg_main_graph.getBoundingClientRect().width;
      crect.scrollTo({
        left: (gwit - crect.width) / 2
      });
      // Panning zoom in Y Axis
      // console.log("Mouse coords at " + coords[1]);
      var ghighA = svg_main_graph.getBoundingClientRect().height; // Real height
      var ghighB = svg_main_graph.getBBox().height; // Internal height
      var yval = coords[1] //This gives us INTERNAL Y coord
      var percy = yval / ghighB //This gives us the % of the way along the Y axis
      var realy = percy * ghighA
      // console.log("True graph height is " + ghighA + ", internal height is " + ghighB);
      // console.log("Internal Y is " + yval + ", percent is " + percy + ", real point to scroll to is " + realy);
      $("div #svgenlargement").scrollTop(realy - percUD);
    } else {
      // Panning zoom in X Axis, no need to change Y axis
      // Get the scale factor of the internal width vs. DOM with of the SVG
      var scrollScale = svg_root.getBoundingClientRect().width / svg_root.getBBox().width;
      // Apply this factor to the SVG center point, offsetting half the width of the box
      svg_root.parentNode.scrollTo({
        left: (svgpt.x * scrollScale) - (crect.width / 2)
      })
    }

  }
}

function populate_relationtype_keymap() {
  // If there aren't any relationship types, hide the keymap list and return
  if (relationship_types.length == 0) {
    document.getElementById('keymap').hidden = true;
    return;
  }
  document.getElementById('keymap').hidden = false;

  // Add the relationship types to the keymap list and to option lists
  // First, sort relation types by bindlevel
  const by_bindlevel = (a, b) => {
    return a.bindlevel - b.bindlevel;
  }
  relationship_types.sort(by_bindlevel);
  // Set an arbitrary color for each relation type
  let relation_colors = new Set(["#5CCCCC", "#67E667", "#F9FE72", "#6B90D4",
    "#FF7673", "#E467B3", "#AA67D5", "#8370D8", "#FFC173", "#EC652F",
    "#DB3453", "#48456A", "#ABDFCE", "#502E35", "#E761AE"
  ]);
  relationship_types.forEach(x => {
    if ('assigned_color' in x) {
      relation_colors.delete(x.assigned_color)
    }
  });
  relationship_types.forEach(x => {
    if (!('assigned_color' in x)) {
      let ac = relation_colors.values().next().value;
      x['assigned_color'] = ac;
      relation_colors.delete(ac);
    }
  });

  // Now that each relationship type has a color, (re)create the keymaplist.
  // The colors need to stay constant, but the ordering should always be by
  // bind level.
  d3.select('.keymaplist').selectAll('li')
    .data(relationship_types, d => d.name)
    .join(enter => enter.append('li')
      .attr('class', 'key')
      .style('border-color', d => d.assigned_color)
      .text(d => d.name)
      .append('div')
      .attr('class', 'key_tip_container')
      .append('div')
      .attr('class', 'key_tip')
      .text(d => d.name),
      update => update,
      exit => exit.remove());

  // and set up all the relation type list options
  let relation_namelist = relationship_types.map(x => x.name)
  d3.selectAll('.relation-type-list')
    .selectAll('option')
    .data(relation_namelist)
    .join(
      enter => enter.append('option').attr('value', d => d).text(d => d),
      update => update.attr('value', d => d).text(d => d),
      exit => exit.remove()
    );
}

function add_relations(callback_fn) {
  // Start by populating the keymap and assigning the colors
  populate_relationtype_keymap();
  // Now fetch the relationships themselves and add them to the graph
  var textrelpath = getTextURL('relationships');
  d3.json(textrelpath)
    .then(data => {
      // Filter the relations to make sure both source and target are
      // present in the current graph view
      relation_list = data.filter(
        r => rid2node(r.source) && rid2node(r.target));
      // Bind the data to the enter selection and draw the paths
      rels = d3.select('#graph0').selectAll('g.relation')
        .data(relation_list, d => d.id)
        .enter()
        .call(draw_relation);

      callback_fn.call();
    });
}

// This takes an d3 .enter() selection, and a flag to indicate Whether
// the relation is a temporary/placeholder element.
function draw_relation(sel, tempclass) {
  let classList = 'relation';
  if (tempclass) {
    classList += ' ' + tempclass;
  }
  let rels = sel.insert('g', 'g.node')
    .attr('id', d => get_relation_id(d.source, d.target))
    .attr('class', classList);
  rels.append('title').text(d => d.source + "->" + d.target);
  rels.append('path')
    .attr('fill', 'none')
    .attr('stroke', d => tempclass ? '#FFA14F' :
      relationship_types.find(x => x.name === d.type).assigned_color)
    .attr('stroke-width', d => d.is_significant === "yes" ? 6 :
      d.is_significant === "maybe" ? 4 : 2)
    .attr('d', d => {
      let source_el = d3.select(jq(rid2node(d.source))).select('ellipse');
      let target_el = d3.select(jq(rid2node(d.target))).select('ellipse');
      let rx = parseFloat(source_el.attr('rx'));
      let sx = parseFloat(source_el.attr('cx'));
      let ex = parseFloat(target_el.attr('cx'));
      let sy = parseFloat(source_el.attr('cy'));
      let ey = parseFloat(target_el.attr('cy'));
      let p = d3.path()
      p.moveTo(sx, sy);
      p.bezierCurveTo(sx + (2 * rx), sy, ex + (2 * rx), ey, ex, ey)
      return p;
    })
    .style('cursor', 'pointer');
  if (!tempclass) {
    // Bind the mouse click action to the paths created
    rels.selectAll('path').on('click', function(d) {
      // Form values need to be database IDs
      $('#delete_source_node_id').val(d.source);
      $('#delete_target_node_id').val(d.target);
      $('#delete_relation_type').text(d.type);
      $('#delete_relation_scope').text(d.scope);
      $('#delete_relation_attributes').empty();
      var significance = ' is not ';
      if (d.is_significant === 'yes') {
        significance = ' is ';
      } else if (d.is_significant === 'maybe') {
        significance = ' might be ';
      }
      $('#delete_relation_attributes').append(
        "This relationship" + significance + "stemmatically significant<br/>");
      if (d.a_derivable_from_b) {
        $('#delete_relation_attributes').append(
          "'" + d.source_text + "' derivable from '" + d.target_text + "'<br/>");
      }
      if (d.b_derivable_from_a) {
        $('#delete_relation_attributes').append(
          "'" + d.target_text + "' derivable from '" + d.source_text + "'<br/>");
      }
      if (d.non_independent) {
        $('#delete_relation_attributes').append(
          "Variance unlikely to arise coincidentally<br/>");
      }
      if (d.note) {
        $('#delete_relation_note').text('note: ' + d.note);
      }
      var points = this.getPathData();
      var xs = parseFloat(points[0].values[0]);
      var xe = parseFloat(points[1].values[0]);
      var ys = parseFloat(points[0].values[1]);
      var ye = parseFloat(points[1].values[5]);
      var p = svg_root.createSVGPoint();
      p.x = xs + ((xe - xs) * 1.1);
      p.y = ye - ((ye - ys) / 2);
      var ctm = svg_main_graph.getScreenCTM();
      var nx = p.matrixTransform(ctm).x;
      var ny = p.matrixTransform(ctm).y;
      var dialog_aria = $("div[aria-labelledby='ui-dialog-title-delete-form']");
      $('#delete-form').dialog('open');
      dialog_aria.offset({
        left: nx,
        top: ny
      });
    })
  }
}

// This creates (or re-colors) a temporary relation to display while the
// user decides whether to make the relation
function create_temporary(source, target, tempclass) {
  // Tempclass is, by default, 'temporary'
  tempclass ||= 'temporary';
  // See if a relation already exists
  let relid = get_relation_id(source, target);
  let existing = document.getElementById(relid) ||
    document.getElementById(get_relation_id(target, source));
  if (existing) {
    d3.select(existing)
      .classed(tempclass, true)
      .select('path')
      .datum(function() {
        return {
          color_memo: this.getAttribute('stroke')
        }
      })
      .attr('stroke', '#FFA14F');
  } else {
    // I still don't understand what 'call' actually returns, so I grab
    // the new element after it has been created
    d3.select('#graph0').selectAll('g#' + relid)
      .data([{
        source: source,
        target: target,
        is_significant: 'no'
      }])
      .enter()
      .call(draw_relation, tempclass);
    existing = document.getElementById(relid);
  }
  return existing;
}

function remove_temporary() {
  d3.select('g.temporary').each(function() {
    // See if there is a color memo on the path; if so, reset the color and
    // if not, remove the relation element
    let thePath = d3.select(this).select('path')
    if ('color_memo' in thePath.datum()) {
      thePath.attr('stroke', thePath.datum().color_memo);
    } else {
      d3.select(this).remove();
    }
  });
}

function get_ellipse(nid) {
  // Try to get the ellipse with the given ID; otherwise treat it as a
  // reading ID and try to get the relevant node ID
  var result = $(jq(nid) + ' ellipse');
  result = result.add(jq(nid) + ' rect');
  if (result.length) {
    return result;
  }
  console.log("Called get_ellipse with a reading ID");
  nid = rid2node(nid);
  return nid ? $(jq(nid) + ' ellipse') : nid;
}

function get_node_obj(node_id) {
  var node_ellipse = get_ellipse(node_id);
  if (!node_ellipse) {
    return node_ellipse;
  }
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
  // n.b. the "ellipse" might be a rect, if it is an emendation node
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
    color_active(self.ellipse);
    if (clickable && editable) {
      $(self.ellipse).parent().hover(this.enter_node, this.leave_node);
      $(self.ellipse).parent().mousedown(function(evt) {
        evt.stopPropagation()
      });
      $(self.ellipse).parent().click(function(evt) {
        evt.stopPropagation();
        // Enable shift-select for multiple readings
        if (!evt.shiftKey) {
          unselect_all_readings();
        }
        // Unselect a selected reading if we clicked on it
        var idx = readings_selected.indexOf(self.get_id())
        if (idx > -1) {
          readings_selected.splice(idx, 1);
          self.set_draggable(false);
        } else {
          readings_selected.push(self.get_id());
          self.set_draggable(true);
        }
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
    $('body').unbind('mousemove');
    $('body').unbind('mouseup');
    self.ellipse.attr('fill', '#9999ff');
    self.reset_elements();
    if ($('ellipse[fill="#ffccff"]').size() > 0) {
      var source_node_id = $(self.ellipse).parent().attr('id');
      var source_node_text = readingdata[node2rid(source_node_id)].text
      var target_node_id = $('ellipse[fill="#ffccff"]').parent().attr('id');
      var target_node_text = readingdata[node2rid(target_node_id)].text
      $('#source_node_id').val(readingdata[node2rid(source_node_id)]['id']);
      $('.rel_rdg_a').text("'" + source_node_text + "'");
      $('#target_node_id').val(readingdata[node2rid(target_node_id)]['id']);
      $('.rel_rdg_b').text("'" + target_node_text + "'");
      // This is a binary relation
      $('#dialog-form').data('binary', true);
      $('#dialog-form').dialog('open');
    };
  }

  this.cpos = function() {
    // Are we an emendation (rect)?
    if (self.ellipse[0].tagName === 'rect') {
      return {
        x: self.ellipse.attr('x') + (self.ellipse.attr('width') / 2),
        y: self.ellipse.attr('y') + (self.ellipse.attr('height') / 2)
      }
    }
    // We are a normal reading (ellipse)
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
    return readingdata[node2rid(self.get_id())].witnesses
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

  this.reposition = function(dx, dy, which) {
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
  var reading_id = node2rid(node_id);
  var edge_in_pattern = new RegExp('>' + reading_id + '$');
  var edge_out_pattern = new RegExp('^' + reading_id + '-');
  $.each($('#svgenlargement .edge,#svgenlargement .relation').children('title'), function(index) {
    var title = $(this).text();
    if (edge_in_pattern.test(title)) {
      var polygon = $(this).siblings('polygon');
      if (polygon.size() > 0) {
        edge_elements.push(new svgshape(polygon));
      }
      var paths = $(this).siblings('path');
      paths.each(function(i, path) {
        var path_element_object = new path_element_class(path, false);
        edge_elements.push(new svgpath(path_element_object, $(path)));
      });
    }
    if (edge_out_pattern.test(title)) {
      var paths = $(this).siblings('path');
      paths.each(function(i, path) {
        var path_element_object = new path_element_class(path, true);
        edge_elements.push(new svgpath(path_element_object, $(path)));
      });
    }
  });
  return edge_elements;
}

// Utility functions to create/return the ID of a relation link between
// a source and target reading, and vice versa.
function get_relation_id(source_id, target_id) {
  // This is keyed on reading IDs
  var idlist = [source_id, target_id];
  idlist.sort();
  return 'relation-' + idlist[0] + '-___-' + idlist[1];
}

function get_related_nodes(relation_id) {
  var srctotarg = relation_id.substr(9);
  return srctotarg.split('-___-');
}

function delete_relation(form_values) {
  var ncpath = getTextURL('relationships');
  $.ajax({
    url: ncpath,
    data: form_values,
    success: function(data) {
      data.relationships.forEach(pair => {
        let relid = get_relation_id(pair[0], pair[1]);
        d3.select('g#' + relid).remove();
      });
      $("#delete-form").dialog("close");
    },
    dataType: 'json',
    type: 'DELETE'
  });
}

// Redisplay emendations:
// get
// g.select('ellipse').remove()
// g.insert('rect', 'text').attr('x', cx-rx).attr('y', cy-ry).attr('width', rx*2).attr('height', ry*2).attr('rx', 5).attr('ry', 5).attr('fill', '#ffdddd').attr('stroke', 'red')


function add_emendation(emenddata) {
  // Set some useful reduce functions
  const floor = (acc, cval) => (cval !== null) && (cval < acc) ? cval : acc;
  const ceiling = (acc, cval) => (cval !== null) && (cval > acc) ? cval : acc;

  // Data is a set of readings and a set of sequences. For each reading
  // we make an SVG group consisting of an ellipse and a text element.
  emenddata.readings.forEach(function(r) {
    // Determine the node ID and the min and max ranks
    let svgid = 'ne' + r.id;
    let frids = emenddata.sequences.map(x => x.target).filter(x => x != r.id);
    let franks = new Array();
    let posLeft = 0;
    d3.selectAll('#graph0 .node')
      .filter(d => d && frids.includes(d.id))
      .each(d => franks.push(d.rank));
    let maxrank = franks.reduce(floor) - 1;
    // Initialize the d3 element
    let enode = d3.select('#graph0')
      .selectAll('g#' + svgid)
      .data([r], d => d.id)
      .enter()
      .append('g')
      .attr('id', svgid)
      .attr('class', 'node');
    enode.append('title').text(r.id);
    let eshape = enode.append('rect')
      .attr('x', function(d) { // Place the node at the same rank as its fellows
        let startNodes = new Array();
        let pointsLeft = new Array();
        d3.selectAll('#graph0 .node')
          .filter(d2 => d2 && !d2.is_emendation && d2.rank === d.rank)
          .each(function() {
            let shape = get_ellipse(this.getAttribute('id'));
            pointsLeft.push(parseFloat(shape.attr('cx')) - parseFloat(shape.attr('rx')));
          });
        posLeft = pointsLeft.reduce(floor);
        return posLeft;
      })
      .attr('width', function(d) {
        // Find the end of the widest / rightmost node at the max rank
        let pointsRight = new Array();
        d3.selectAll('#graph0 .node')
          .filter(d2 => d2 && !d2.is_emendation && d2.rank === maxrank)
          .each(function() {
            let shape = get_ellipse(this.getAttribute('id'));
            pointsRight.push(parseFloat(shape.attr('cx')) + parseFloat(shape.attr('rx')));
          });
        return pointsRight.reduce(ceiling) - posLeft;
      })
      .attr('y', function(d) {
        // Find the top-placed node covered by the emendation
        let coveredNodes = new Array();
        d3.selectAll('#graph0 .node')
          .filter(d2 => d2 && d2.rank >= d.rank && d2.rank <= maxrank && !d2.is_emendation)
          .each(d2 => coveredNodes.push(rid2node(d2.id)));
        var highestY = coveredNodes.map(x => parseFloat(get_ellipse(x).attr('cy'))).reduce(floor);
        return highestY - 90;
        // n.b. we might have to expand the viewport upward to accommodate this
      })
      .attr('height', 36)
      .attr('rx', '5')
      .attr('ry', '5')
    enode.append('text')
      .attr('x', function() {
        let rx = parseFloat(eshape.attr('x'));
        let rw = parseFloat(eshape.attr('width'));
        return rx + rw / 2;
      })
      .attr('y', function() {
        let ry = parseFloat(eshape.attr('y'));
        return ry + 22;
      })
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Times,serif')
      .attr('font-size', '14.00')
      .text(r.text);
    // TODO add the authority info, maybe when we allow edits
    // Color the node appropriately. I think we can only be in
    // active mode at this point.
    color_active(eshape.node());

    // Make it selectable
    $(eshape.node()).data('node_obj', new node_obj($(eshape.node())));
    $(eshape.node()).data('node_obj').set_selectable(true);
    // Add the emendation to our legacy readingdata
    readingdata[r.id] = r;
  });

}

function detach_node(readings) {
  // separate out the deleted relationships, discard for now
  if ('DELETED' in readings) {
    // Remove each of the deleted relationship links.
    readings.DELETED.forEach(pair => {
      let relid = get_relation_id(pair[0], pair[1]);
      d3.select('g#' + relid).remove();
    });
    delete readings['DELETED'];
  }
  // remove from existing reading data structures the witnesses
  // for the new nodes/readings
  // TODO get this from the server and d3ify it
  for (const [rid, rdata] of Object.entries(readings)) {
    let origdata = readingdata[rdata.orig_reading];
    rdata.witnesses.forEach(w => removeFromArray(w, origdata.witnesses));
    update_reading(origdata);
  }


  // here we remove the sigla of the detached witnesses from the existing
  // graph edges, and create the new edges for the detached readings
  var detached_edges = [];
  for (const [rid, rdata] of Object.entries(readings)) {
    let orig_ellipse = get_ellipse(rid2node(rdata.orig_reading));
    let node_id = 'n' + rid; // set the XML ID for the new node
    let edges = edges_of(orig_ellipse);
    // These are to keep track of the witnesses for which an edge still needs to
    // be detached (since the witness won't be found in a 'majority' label)
    let incoming_remaining = new Set();
    let outgoing_remaining = new Set();
    rdata.witnesses.forEach(w => {
      incoming_remaining.add(w);
      outgoing_remaining.add(w);
    });
    edges.forEach(edge => {
      let detached_edge = edge.detach_witnesses(rdata.witnesses);
      if (detached_edge != null) {
        detached_edges.push(detached_edge);
        detached_edge.witnesses.forEach(w => {
          if (detached_edge.is_incoming == true) {
            incoming_remaining.delete(w);
          } else {
            outgoing_remaining.delete(w);
          }
        });
      }
    });
    // After detaching we still need to check if for *all* readings
    // an edge was detached. It may be that some witnesses were not
    // explicitly named on an edge but were part of a 'majority' edge,
    // in which case we need to duplicate and name that edge after those
    // remaining witnesses.
    if (outgoing_remaining.size) {
      let outWits = Array.from(outgoing_remaining);
      edges.forEach(edge => {
        if (edge.get_label() == 'majority' && !edge.is_incoming) {
          detached_edges.push(edge.clone_for(outWits));
        }
      });
    }
    if (incoming_remaining.size) {
      let inWits = Array.from(incoming_remaining);
      edges.forEach(edge => {
        if (edge.get_label() == 'majority' && edge.is_incoming) {
          detached_edges.push(edge.clone_for(inWits));
        }
      });
    }
    // Finally deal with the fact that edges might be shared if we
    // duplicated multiple nodes.
    let copy_array = [];
    detached_edges.forEach(edge => {
      let do_copy = true;
      copy_array.forEach(copy_edge => {
        if (copy_edge.g_elem.attr('id') == edge.g_elem.attr('id')) {
          do_copy = false;
        }
      });
      if (do_copy) {
        copy_array.push(edge);
      }
    });
    detached_edges = copy_array;

    // Lots of unabstracted knowledge down here :/
    // Clone original node/reading, rename/id it..
    let duplicate_node = orig_ellipse.parent().clone();
    duplicate_node.attr('id', node_id);
    duplicate_node.children('title').text(rid);

    // This needs somehow to move to node or even to shapes! #repositioned
    let duplicate_node_data = orig_ellipse.parent().data('repositioned');
    if (duplicate_node_data != null) {
      duplicate_node.children('ellipse').parent().data('repositioned', duplicate_node_data);
    }

    // Add the node and all new edges into the graph
    let graph_root = $(svg_main_graph);
    graph_root.append(duplicate_node);
    detached_edges.forEach(edge => {
      // TODO use returned sequence information to set the real
      // ID on the duplicated edges
      let eid = edge.g_elem.attr('id');
      edge.g_elem.attr('id', eid + 'd');
      // We also need to fix the ID for textPaths
      let etextid = edge.g_elem.children('.shadow').attr('id');
      edge.g_elem.children('.shadow').attr('id', etextid + 'd');
      edge.g_elem.find('textPath').attr('href', '#' + etextid + 'd');
      // Fix the edge title and edge weight
      let edge_title = edge.g_elem.children('title').text();
      let edge_weight = 0.8 + (0.2 * edge.witnesses.length);
      edge_title = edge_title.replace(rdata.orig_reading, rid);
      edge.g_elem.children('title').text(edge_title);
      edge.g_elem.children('path.sequence').attr('stroke-width', edge_weight);
      // Reg unabstracted knowledge: isn't it more elegant to make
      // it edge.append_to( graph_root )?
      graph_root.append(edge.g_elem);
    });

    // Make the detached node a real node_obj
    let ellipse_elem = get_ellipse(node_id);
    let new_node = new node_obj(ellipse_elem);
    ellipse_elem.data('node_obj', new_node);

    // Move the node somewhat up for 'dramatic effect' :-p
    //JMB: Edited this to vary according to text direction
    if (text_direction == 'RL') {
      new_node.reposition(0, 70);
    } else if (text_direction == 'BI') {
      new_node.reposition(-120, 0);
    } else {
      new_node.reposition(0, 70);
    }
  }
  // add new node(s) in the data
  Object.values(readings).forEach(x => update_reading(x));
}

// This takes SVG node IDs
function merge_nodes(source_node_id, target_node_id, consequences) {
  if (consequences.status != null && consequences.status == 'ok') {
    merge_node(source_node_id, target_node_id);
    if (consequences.checkalign != null) {
      // Remove all prior checkmerge button groups
      $('[id*="nomerge"]').parent().remove();
      // Remove all leftover temp relations
      $('.checkalign').remove();
      $.each(consequences.checkalign, function(index, rdg_ids) {
        var node_ids = rdg_ids.map(x => rid2node(x));
        var ids_text = rdg_ids[0] + '-' + rdg_ids[1];
        var merge_id = 'merge-' + ids_text;
        // Make a checkmerge button if there isn't one already, for this pair
        if ($(jq(merge_id)).length == 0) {
          // This returns a d3 selection
          let temp_relation = create_temporary(rdg_ids[0], rdg_ids[1], 'checkalign')
          let pathInfo = temp_relation.querySelector('path').getPathData();
          let mVals = pathInfo.find(x => x.type === "M");
          let cVals = pathInfo.find(x => x.type === "C");
          let sy = parseInt(mVals.values[1]);
          let ey = parseInt(cVals.values.pop()); // yes this is destructive,
          // no we don't currently care
          let yC = ey + ((sy - ey) / 2);
          // TODO: compute xC to be always the same distance to the amplitude of the curve
          let xC = parseInt(cVals.values[0]);
          // Put the images into a suggestion group
          let sugg = d3.select('#graph0')
            .append('g')
            .attr('id', 'suggestion-' + rdg_ids.join('-'))
            .attr('class', 'suggestion');
          // The yes button
          sugg.append('image')
            .attr('id', merge_id)
            .attr('x', xC)
            .attr('y', yC - 8)
            .attr('width', 16)
            .attr('height', 16)
            .attr('href', merge_button_yes)
            .on('mouseover', function() {
              d3.select(this).classed('draggable', true);
              // Indicate which nodes are active
              get_ellipse(node_ids[0]).attr('fill', '#9999ff');
              get_ellipse(node_ids[1]).attr('fill', '#9999ff');
            })
            .on('mouseout', function() {
              d3.select(this).classed('draggable', false);
              var colorme = $('#update_workspace_button').data('locked') ? color_active : color_inactive;
              colorme(get_ellipse(node_ids[0]));
              colorme(get_ellipse(node_ids[1]));
            })
            .on('click', function(evt) {
              // node_ids[0] is the one that goes away
              var ncpath = getTextURL('merge');
              var form_values = "source=" + rdg_ids[0] + "&target=" + rdg_ids[1] + "&single=true";
              // Make the request
              $.post(ncpath, form_values, function(data) {
                merge_node(node_ids[0], node_ids[1]);
                // remove any suggestions that involve the removed node
                d3.selectAll('.suggestion[id*="-' + rdg_ids[0] + '"]').remove()
                d3.selectAll('.checkalign[id*="-' + rdg_ids[0] + '"]').remove()
              });
              // Whether it succeeded or not, remove the buttons and line
              temp_relation.remove();
              sugg.remove();
            });
          // The no button
          sugg.append('image')
            .attr('id', 'no' + merge_id)
            .attr('x', xC + 20)
            .attr('y', yC - 8)
            .attr('width', 16)
            .attr('height', 16)
            .attr('href', merge_button_no)
            .on('mouseover', function() {
              d3.select(this).classed('draggable', true);
            })
            .on('mouseout', function() {
              d3.select(this).classed('draggable', false);
            })
            .on('click', function() {
              temp_relation.remove();
              sugg.remove();
            });
        }
      });
    }
  }
}

// This takes SVG node IDs
function merge_node(todelete_id, tokeep_id, compressing) {
  edges_of(get_ellipse(todelete_id)).forEach(edge => {
    if (edge.is_incoming) {
      edge.attach_endpoint(tokeep_id);
    } else {
      edge.attach_startpoint(tokeep_id, compressing);
    }
  });
  if (!compressing) {
    // Add source node witnesses to target node
    // TODO see if we can get this info from the server
    // NOTE: this may need to be more complex to account for witness layers
    $.each(readingdata[node2rid(todelete_id)].witnesses, function(i, d) {
      readingdata[node2rid(tokeep_id)].witnesses.push(d)
    });
  }
  // Remove from legacy readingdata
  delete_reading(todelete_id);
  // Remove any relation paths that belonged to this node
  d3.selectAll('.relation[id*="-' + node2rid(todelete_id) + '"]').remove();
  // Remove the SVG node itself
  d3.select('#' + todelete_id).remove();
}

// This takes SVG node IDs
function merge_left(todelete_id, tokeep_id) {
  edges_of(get_ellipse(todelete_id), 'incoming').forEach(
    edge => edge.attach_endpoint(tokeep_id));
  delete_reading(todelete_id);
  $(jq(todelete_id)).remove();
}

// This calls merge_node, as topologically it is doing basically the same thing.
function compress_nodes(data) {
  var readings = data['merged'];
  var remaining_reading = data['readings'][0];
  // Save the data and update the content of the first reading node
  var rnode = update_reading(remaining_reading);
  update_reading_display(rnode);

  // Get the ellipse elements for all affected reading IDs
  var ellipses = readings.map(x => get_ellipse(rid2node(x)));

  // This should be the ellipse for the node we just updated
  var first = ellipses[0];
  var d3first = d3.select(jq(first.parent().attr('id')));

  // Find the new center point for the first node
  var total = parseInt(first[0].getAttribute('cx'), 10);
  for (var i = 1; i < readings.length; i++) {
    var cur = ellipses[i];
    total += parseInt(cur[0].getAttribute('cx'), 10);
  };
  var avg = Math.round(total / readings.length);
  if (text_direction !== "BI") {
    d3first.selectAll('*[cx]').attr('cx', avg);
    d3first.selectAll('*[x]').attr('x', avg);
  }

  //merge then delete all others
  for (var i = 1; i < readings.length; i++) {
    var node = ellipses[i];
    var edgeid = readings[i - 1] + '->' + readings[i];

    // This is finding the incoming (intermediate) edge by "1234->5678" title
    var titles = svg_root.getElementsByTagName('title');
    var titlesArray = [].slice.call(titles);

    // old edge, delete after moving stuff around!
    if (titlesArray.length > 0) {
      var title = titlesArray.find(function(elem) {
        return elem.textContent === edgeid;
      });
    }

    // only merge start on the last one, else, we get ourselves confused!
    if (readings[i] == readings[readings.length - 1]) {
      merge_node(rid2node(readings[i]), rnode, true);
    } else {
      merge_left(rid2node(readings[i]), rnode);
    }

    // Remove the intermediate edge
    if (title && title.parentNode) {
      title.parentNode.remove();
    }
  }

  // The merge_node / merge_left call will have taken care of outgoing edges;
  // now we have to fix the incoming edges to the new position of the combined
  // node (unless it is running top to bottom, and the ellipse didn't move)
  if (text_direction !== "BI") {
    /* This is the remaining node; find the incoming edge(s), which are now the
     * wrong size */
    edges_of(first, 'incoming').forEach(edge => edge.attach_endpoint(rnode));
  }

  get_node_obj(readings[0]).update_elements();
}

// This is called with SVG node IDs.
function readings_equivalent(source, target) {
  var sourcetext = readingdata[node2rid(source)].text;
  var targettext = readingdata[node2rid(target)].text;
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

// function scrollToEnd() {
//   var stateTf = svg_main_graph.getCTM().inverse();
//
//   var elem_width = Math.floor(svg_main_graph.getBoundingClientRect().width);
//   var vbdim = svg_root.viewBox.baseVal;
//
//   var x = vbdim.width - elem_width;
//
//   return x;
// }
//
// function placeMiddle() {
//   var stateTf = svg_main_graph.getCTM().inverse();
//
//   var elem_width = Math.floor(svg_main_graph.getBoundingClientRect().width);
//   var vbdim = svg_root.viewBox.baseVal;
//
//   var x = Math.floor((vbdim.width - elem_width) / 2);
//
//   return x;
// }

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
  $.get(ncpath, function(data) {
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
      // C for Compress
      if ($('#svgenlargement').data('display_normalised')) {
        $('#error-display').append('<p class="caution">The graph topology cannot be altered in normalized view.</p>');
        $('#error-display').dialog('open');
      } else if (readings_selected.length > 0) {
        // TODO prevent further keyCommands until finished.
        dialog_background('#error-display')
        var ncpath = getTextURL('compress');
        // We need to gin up a form to serialize.
        readings_selected.sort(sortByRank);
        var cform = $('<form>')
        $.each(readings_selected, function(index, value) {
          cform.append($('<input>').attr(
            "type", "hidden").attr(
            "name", "readings[]").attr(
            "value", readingdata[node2rid(value)]['id']));
        });
        var form_values = cform.serialize();
        $.post(ncpath, form_values, function(data) {
          if (data.merged) {
            // Do the visual munging
            compress_nodes(data);
          }
          if (data.status === 'warn') {
            var dataerror = $('<p>').attr('class', 'caution').text(data.warning);
            $('#error-display').empty().append(dataerror);
          } else {
            unselect_all_readings();
          }
          $("#dialog_overlay").hide();
        });
      }
    }
  },
  '100': {
    'key': 'd',
    'description': 'Detach one or more witnesses from the collation for the selected reading(s)',
    'function': function() {
      // D for Detach
      if ($('#svgenlargement').data('display_normalised')) {
        $('#error-display').append('<p class="caution">The graph topology cannot be altered in normalized view.</p>');
        $('#error-display').dialog('open');
      } else if (readings_selected.length > 0) {
        $('#action-detach').val('on');
        $('#multipleselect-form').dialog('open');
      }
    }
  },
  '101': {
    'key': 'e',
    'description': 'Provide an emendation at the selected text position',
    'function': function() {
      // E for Emend
      if (readings_selected.length > 0) {
        $('#emend').dialog('open');
      }
    }
  },
  '108': {
    'key': 'l',
    'description': 'Set / unset the selected reading(s) as canonical / lemma',
    'function': function() {
      // L for making a Lemma
      $.each(readings_selected, function(i, rnode_id) {
        // need current state of lemmatization
        var reading_id = node2rid(rnode_id);
        var selected = readingdata[reading_id];
        var set_lemma = !selected['is_lemma']
        var ncpath = getReadingURL(reading_id);
        var form_values = {
          'id': reading_id,
          'is_lemma': set_lemma,
        };
        $.post(ncpath, form_values, function(data) {
          unselect_all_readings();
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
  '110': {
    'key': 'n',
    'description': 'Propagate the normal form of the selected reading(s) along specified relations',
    'function': function() {
      $('#normal-form-propagate').dialog('open');
    }
  },
  '114': {
    'key': 'r',
    'description': 'Relate the selected readings',
    'function': function() {
      if (readings_selected.length > 0) {
        $('#dialog-form').data('binary', false);
        $('#dialog-form').dialog('open');
      }
    }
  },
  // '115': {
  // 	'key': 's',
  // 	'description': 'Split the selected reading according to given criteria',
  // 	'function': function () {
  // 		// S for Split reading
  // 		if( readings_selected.length == 1 ) {
  // 			$('#split-form').dialog( 'open' );
  // 		}
  // 	} },
  '120': {
    'key': 'x',
    'description': 'Expunge all relationships on the selected reading(s)',
    'function': function() {
      // X for eXpunge relationships
      $.each(readings_selected, function(i, rnode_id) {
        var reading_id = node2rid(rnode_id);
        var form_values = 'from_reading=' + reading_id;
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


// Some utility functions for the dialogs
function dialog_background(status_el) {
  $(".ui-widget-overlay").css("background", "none");
  if (status_el) {
    $(status_el).empty();
  }
  $("#dialog_overlay").show();
  $("#dialog_overlay").height($("#enlargement_container").height());
  $("#dialog_overlay").width($("#enlargement_container").innerWidth());
  $("#dialog_overlay").offset($("#enlargement_container").offset());
}

function get_relation_querystring() {
  // A cheesy hack - if we used the keystroke menu, add on the rest of the
  // source nodes to our form data.
  var form_values = $('#merge_node_form').serialize();
  if (!$('#dialog-form').data('binary')) {
    var formsource = $('#source_node_id').val();
    var formtarget = $('#target_node_id').val();
    $.each(readings_selected, function(i, nid) {
      var rid = node2rid(nid);
      if (rid !== formsource && rid !== formtarget) {
        // Prepend the extra source.
        form_values = 'source=' + rid + '&' + form_values;
      }
    })
  }
  return form_values;
}

// Populate the relation type editing form with the current values for
// the given relation type, or reset it if the type given is "". But don't
// do anything if the type is not recognised.
function populate_rtform(rtname) {
  var rtdata = relationship_types.find(function(el) {
    return el.name === rtname
  });
  if (rtdata) {
    $.each(rtdata, function(k, v) {
      // Find the field that corresponds to the key
      var field = k.replace('is_', '');
      var fieldid = '#rtype_' + field;
      if (typeof v === "boolean") {
        $(fieldid).prop("checked", v);
      } else {
        $(fieldid).val(v);
      }
    });
  } else if (rtname === "") {
    $("#relation-type-edit").trigger("reset");
  }
  $('.relation-type-button').button('enable');
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
    error += '<br>The reading cannot be duplicated.</p>';
  } else if ($('#reading-form').dialog('isOpen')) {
    // reading box
    error += '<br>The reading cannot be altered.</p>';
    errordiv = '#reading-status';
    // } else if ( $('#split-form').dialog('isOpen') ) {
    // 	// the split-reading box
    // 	error += '<br>The reading cannot be split.</p>';
    // 	errordiv = '#split-form-status';
  } else if ($('#section-info').dialog('isOpen')) {
    // section box
    error += '<br>The section cannot be updated.</p>';
    errordiv = '#section-form-status';
  } else if ($('#section-text').dialog('isOpen')) {
    error += '<br>The running text cannot be retrieved.</br>';
    errordiv = '#section-text-status';
  } else if ($('#download-dialog').dialog('isOpen')) {
    // reading box
    error += '<br>The tradition cannot be downloaded.</p>';
    errordiv = '#download_status';
  } else if ($('#normal-form-propagate').dialog('isOpen')) {
    error += '<br>The readings cannot be updated.';
    errordiv = '#normal-form-propagate-status';
  } else if ($('#emend').dialog('isOpen')) {
    error += '<br>The text cannot be emended.';
    errordiv = '#emend-status';
  } else if ($('#relation-type-dialog').dialog('isOpen')) {
    error += '<br>The relation type cannot be modified.';
    errordiv = '#relation-type-status';
  } else {
    // Probably a keystroke action
    error += '<br>The action cannot be performed.</p>';
    errordiv = '#error-display';
  }

  // Populate the box with the error message
  $(errordiv).empty().append('<p class="error">Error: ' + error);

  // Open the dialog explicitly if we need to
  if (errordiv === '#error-display') {
    $(errordiv).dialog('open');
  } else {
    // Reset the buttons on the existing dialog
    $(errordiv).parents('.ui-dialog').find('.ui-button').button("enable");
  }

  // ...then initialization.
}).ready(function() {

  timer = null;

  $('#update_workspace_button').data('locked', false);

  // Set up the mouse events on the SVG enlargement
  $('#enlargement').mousedown(function(event) {
    $(this)
      .data('down', true)
      .data('x', event.clientX)
      .data('y', event.clientY)
      .data('scrollLeft', this.scrollLeft)
    stateTf = svg_main_graph.getCTM().inverse();
    var p = svg_root.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
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
          var form_values = get_relation_querystring();
          var ncpath = getTextURL('merge');
          var jqjson = $.post(ncpath, form_values, function(data) {
            failed = [];
            if (data.status === 'warn') {
              $.each(data['failed'], function(i, rid) {
                failed.push(rid2node[rid]);
              })
              var dataerror = $('<p>').attr('class', 'caution').text(data.warning);
              $('#dialog-form-status').empty().append(dataerror);
            }
            // Here again we profit from the source nodes all being in readings_selected
            var target = rid2node($('#target_node_id').val());
            $.each(readings_selected, function(i, nid) {
              // Don't send the checkalign data until we are merging the last node.
              var consequences = {
                'status': 'ok'
              };
              if (nid === rid2node($('#source_node_id').val()) &&
                'checkalign' in data) {
                consequences['checkalign'] = data.checkalign;
              }
              if (!failed.includes(nid) && nid !== target) {
                merge_nodes(nid, target, consequences);
              }
            })
            mybuttons.button('enable');
            if (data.status === 'ok') {
              $('#dialog-form').dialog('close');
            }
          });
        },
        OK: function(evt) {
          var mybuttons = $(evt.target).closest('button').parent().find('button');
          mybuttons.button('disable');
          var form_values = get_relation_querystring();
          var ncpath = getTextURL('relationships');
          var jqjson = $.post(ncpath, form_values, function(data) {
            // Remove the temporary relation first to avoid ID collision
            remove_temporary();
            // If we were handed a 304 response, there won't be data.
            if (data) {
              // Add the relations individually, since we aren't maintaining
              // a global relation array to merge into.
              d3.select('#graph0').selectAll('g.ADDING')
                .data(data.relationships, d => d.id)
                .enter()
                .call(draw_relation);
              d3.select('.ADDING').classed('ADDING', false);
              // Stash any changed readings.
              data.readings.forEach(r => update_reading(r));
            }
            // Stash the new relationships.
            mybuttons.button('enable');
            // See if we need to display a warning.
            if (data && data.status === 'warn') {
              var dataerror = $('<p>').attr('class', 'caution').text(data.warning);
              $('#dialog-form-status').empty().append(dataerror);
            } else {
              $('#dialog-form').dialog('close');
            }
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
        // Don't allow merge (or split) if we are in normalised view mode
        var show_merge = !$('#svgenlargement').data('display_normalised');
        if ($('#dialog-form').data('binary')) {
          // Form values are already set from the mouseup event
          // Should the merge button be shown?
          show_merge = readings_equivalent(rid2node($('#source_node_id').val()),
            rid2node($('#target_node_id').val()));
        } else {
          // Hide the parts of the form that aren't applicable
          $('#binary_relation_only').hide();
          // We need to set the form values from readings_selected
          var numrdgs = readings_selected.length;
          var target = readings_selected[numrdgs - 1];
          $('#source_node_id').val(node2rid(readings_selected[numrdgs - 2]));
          $('#target_node_id').val(node2rid(target));
          // Should the merge button be shown?
          $.each(readings_selected, function(i, nid) {
            show_merge = show_merge && readings_equivalent(nid, target);
          });
        }
        // In the case of a drag-and-drop relation, the source node is in readings_selected;
        // otherwise, all nodes are. Make our temporary relations
        $.each(readings_selected, function(i, nid) {
          var source_id = node2rid(nid);
          var target_id = $('#target_node_id').val();
          if (source_id !== target_id) {
            create_temporary(source_id, target_id);
          }
        });
        // Show the merge button if applicable
        var buttonset = $(this).parent().find('.ui-dialog-buttonset')
        if (show_merge) {
          buttonset.find("button:contains('Merge readings')").show();
        } else {
          buttonset.find("button:contains('Merge readings')").hide();
        }
        // Set the dialog background and our form state data
        dialog_background('#dialog-form-status');
        $('#rel_type').data('changed_after_open', false);
      },
      close: function() {
        remove_temporary();
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
            var ncpath = getTextURL('duplicate');
            $.post(ncpath, form_values, function(data) {
              unselect_all_readings();
              detach_node(data);
              mybuttons.button("enable");
              self.dialog("close");
            });
          }
        }
      ],
      create: function(event, ui) {
        var buttonset = $(this).parent().find('.ui-dialog-buttonset').css('width', '100%');
        buttonset.find("button:contains('Cancel')").css('float', 'right');
        $('#action-detach').change(function() {
          if ($('#action-detach').val() == 'on') {
            $('#detach_collated_form').show();
            $('#multipleselect-form-text').show();

            $('#detach_btn').show();
          }
        });
      },
      open: function() {
        $(this).dialog("option", "width", 200);
        dialog_background('#multipleselect-form-status');

        if ($('#action-detach').val() == 'on') {
          $('#detach_collated_form').show();
          $('#multipleselect-form-text').show();

          $('#detach_btn').show();
        }

        // Populate the forms with the currently selected readings
        $('#detach_collated_form').empty();
        var witnesses = new Set();

        readings_selected.sort(sortByRank);
        $.each(readings_selected, function(index, value) {
          var valrid = node2rid(value);
          $('#detach_collated_form').append($('<input>').attr(
            "type", "hidden").attr("name", "readings[]").attr(
            "value", valrid));
          readingdata[valrid]['witnesses'].forEach(el => witnesses.add(el));
        });
        witnesses.forEach(function(value) {
          $('#detach_collated_form').append(
            '<input type="checkbox" name="witnesses[]" value="' + value +
            '">' + value + '<br>');
        });
        $('#multiple_selected_readings').attr('value', readings_selected.join(','));
      },
      close: function() {
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

  // Set up the reading split dialog.
  //   $( '#split-form').dialog({
  // 	  autoOpen: false,
  // 	  modal: true,
  // 	  buttons: {
  // 		  Cancel: function() {
  // 			  $('#split-form-status').empty();
  // 			  $(this).dialog("close");
  // 		  },
  // 		  Split: function() {
  // 			  form_values = $('#split-form').serialize();
  // 			  split_readings( form_values );
  // 		  }
  // 	  },
  //   /* create: function() {
  // 	  var buttonset = $(this).parent().find( '.ui-dialog-buttonset' ).css( 'width', '100%' );
  // 	  buttonset.find( "button:contains('Cancel')" ).css( 'float', 'right' );
  //   } */
  // 	  open: function() {
  // 	  // Set up the hidden form values. There should be only one reading selected.
  // 	  var rdg = readings_selected[0];
  // 	  $('#split_reading_id').empty().append(rdg);
  // 	  $('#split_reading_text').empty().append(readingdata[rdg]["text"]);
  // 	  },
  //   close: function() {
  // 	  $("#dialog_overlay").hide();
  //   }
  // });

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
        var form_values = $('#delete_relation_form').serialize();
        form_values += "&scopewide=true";
        delete_relation(form_values);
      },
      Delete: function() {
        var form_values = $('#delete_relation_form').serialize();
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
        var form_values = {
          'id': reading_id,
          'is_lemma': $('#reading_is_lemma').is(':checked'),
          'is_nonsense': $('#reading_is_nonsense').is(':checked'),
          'grammar_invalid': $('#reading_grammar_invalid').is(':checked'),
          'normal_form': $('#reading_normal_form').val(),
          'text': $('#reading_text').val(),
          'display': $('#reading_display').val()
        };
        // Make the JSON call
        var ncpath = getReadingURL(reading_id);
        $.post(ncpath, form_values, function(data) {
          $.each(data['readings'], function(i, rdgdata) {
            var this_nodeid = update_reading(rdgdata);
            update_reading_display(this_nodeid);
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
      dialog_background('#reading-status');
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
        var ncpath = getTextURL('metadata');
        $.post(ncpath, $('#section_info_form').serialize(), function(data) {
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
      dialog_background('#section-form-status');
      $("#section_name").val(sect_metadata['name']);
      $("#section_language").val(sect_metadata['language']);
      // Show the appropriate buttons...
      var buttonset = $(this).parent().find('.ui-dialog-buttonset')
      // If the user can't edit, show only the OK button
      if (!editable) {
        buttonset.find("button:contains('Update')").hide();
        // If the relationship scope is local, show only OK and Delete
      }
    },
    close: function() {
      $("#dialog_overlay").hide();
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
      dialog_background('#section-text-status');
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
    },
    close: function() {
      $("#dialog_overlay").hide();
    }
  });

  // Set up the download dialog
  $('#download-dialog').dialog({
    autoOpen: false,
    height: 150,
    width: 500,
    modal: true,
    buttons: {
      Download: function(evt) {
        var ncpath = getTextURL('download');
        if ($('#download_conflate').val() === "") {
          $('#download_conflate').prop('disabled', true);
        }
        ncpath += '?' + $('#download_form').serialize();
        window.location = ncpath;
      },
      Done: function() {
        $('#download-dialog').dialog('close');
      }
    },
    create: function() {
      $('#download_tradition').attr("value", textid);
      $('#download_section').attr("value", sectid);
    },
    open: function() {
      dialog_background('#download_status');
      $('#download_conflate').prop('disabled', false);
    },
    close: function() {
      $("#dialog_overlay").hide();
    }
  });

  // Set up the normal form propagation dialog
  $('#normal-form-propagate').dialog({
    autoOpen: false,
    height: 150,
    modal: true,
    buttons: {
      OK: function(evt) {
        var mybuttons = $(evt.target).closest('button').parent().find('button');
        mybuttons.button('disable');
        $('#normal-form-propagate-status').empty();
        // Run the POST for each reading in readings_selected
        $.each(readings_selected, function(i, nid) {
          var rid = node2rid(nid);
          var rtype = $('#normal-form-relationtype').val();
          var ncpath = getTextURL('copynormal/' + rid + "/" + rtype);
          $.post(ncpath, function(data) {
            // Re-enable the buttons
            mybuttons.button('enable');
            // TODO update the normal form in the relevant reading nodes
            $.each(data, function(i, rdg) {
              var this_nodeid = update_reading(rdg);
              update_reading_display(this_nodeid);
            });
          });
        });
        $('#normal-form-propagate').dialog('close');
      },
      Cancel: function(evt) {
        $('#normal-form-propagate').dialog('close');
      }
    },
    create: function() {
      // Populate the relation type select
      $.each(relationship_types, function(i, typedef) {
        $('#normal-form-relationtype').append($('<option />').attr("value", typedef.name).text(typedef.name));
      });
    },
    open: function() {
      dialog_background('#normal-form-propagate-status');
      // Populate the normal form span
      var normals = [];
      $.each(readings_selected, function(i, nid) {
        normals.push(readingdata[node2rid(nid)].normal_form);
      });
      $('#normal-form-reading').empty().text(normals.join(", "));
      // Bind the return key to the OK button
      var okbutton = $(this).parent().find('button:contains("OK")')[0];
      $(this).keypress(function(evt) {
        if (evt.which === 13) {
          okbutton.click();
        }
      });
    },
    close: function() {
      $('#dialog_overlay').hide();
      $(this).off("keypress");
    }
  });

  $('#emend').dialog({
    autoOpen: false,
    width: 350,
    modal: true,
    buttons: {
      OK: function(evt) {
        var mybuttons = $(evt.target).closest('button').parent().find('button');
        mybuttons.button('disable');
        var ncpath = getTextURL('emend');
        $.post(ncpath, $('#emend_form').serialize(), function(data) {
          // Data will be a reading and several sequences
          add_emendation(data);
          mybuttons.button('enable');
          $('#emend').dialog('close');
        });
      },
      Cancel: function(evt) {
        $('#emend').dialog('close');
      }
    },
    open: function() {
      dialog_background('#emend-status');
      // Populate the hidden from/to ranks
      var minRank = readingdata['__END__'].rank;
      var maxRank = 0;
      $.each(readings_selected, function(i, nid) {
        var myRank = readingdata[node2rid(nid)].rank;
        if (minRank > myRank) {
          minRank = myRank;
        }
        if (maxRank < myRank) {
          maxRank = myRank;
        }
      });
      $('#emend-from').val(minRank);
      $('#emend-to').val(maxRank + 1);
    },
    close: function() {
      $('#dialog_overlay').hide();
    }
  });

  // Set up the relation type editing dialog
  $('#rtype_name').on('input', function() {
    var inputVal = this.value;
    // console.log("Triggered with " + inputVal);
    if (relationship_types.some(x => x.name === inputVal)) {
      // Populate values for this type
      populate_rtform(inputVal);
      // Make the 'create' button an 'update' button
      $('.relation-type-change-button').button({
        'label': 'Update type'
      });
    } else {
      $('.relation-type-change-button').button({
        'label': 'Create type'
      })
    }
  });
  $('#relation-type-dialog').dialog({
    autoOpen: false,
    width: 450,
    modal: true,
    buttons: {
      delete: {
        text: "Delete type",
        class: 'relation-type-button',
        click: function() {
          $('.relation-type-button').button('disable');
          $('#relation-type-status').empty()
          var reltypename = $('#rtype_name').val();
          var ncpath = getTextURL('relationtype/' + reltypename);
          $.ajax({
            url: ncpath,
            success: function(data) {
              // Remove the data in relationship_types
              var ridx = relationship_types.findIndex(function(el) {
                return el.name === data.name
              });
              relationship_types.splice(ridx, 1);
              // Re-display the keymap list
              populate_relationtype_keymap();
              populate_rtform("");
            },
            dataType: 'json',
            type: 'DELETE'
          });
        }
      },
      change: {
        // TODO update #keymap.data and change the colors!
        text: "Create type",
        class: 'relation-type-button relation-type-change-button',
        click: function() {
          $('.relation-type-button').button('disable');
          $('#relation-type-status').empty()
          var reltypename = $('#rtype_name').val();
          var ncpath = getTextURL('relationtype/' + reltypename);
          var rtdata = $('#relation-type-edit').serialize();
          $.ajax({
            url: ncpath,
            success: function(data) {
              // Re-enable the buttons
              $('.relation-type-button').button('enable');
              // Replace the data in relationship_types
              var ridx = relationship_types.findIndex(function(el) {
                return el.name === data.name
              });
              if (ridx === -1) {
                relationship_types.push(data);
              } else {
                Object.keys(data).each(
                  k => relationship_types[ridx][k] = data[k]);
              }
              // Re-display the keymap list
              populate_relationtype_keymap();
            },
            data: rtdata,
            dataType: 'json',
            type: 'PUT'
          })
        }
      },
      Close: function() {
        $('#relation-type-dialog').dialog('close');
      }
    },
    open: function() {
      dialog_background('#relation-type-status');
      // Clear out any prior values in the form
      populate_rtform("");
      // Make the list of relation types in the dialog clickable
      $('#relation-type-list li').each(function() {
        var name = $(this).data('name');
        $(this).click(function() {
          populate_rtform(name);
        });
      });
      // Clear the form
      document.getElementById('relation-type-edit').reset();
    },
    close: function() {
      $('#dialog_overlay').hide();
    }
  });

  // Set up the error message dialog, for results from keystroke commands without their own
  // dialog boxes
  $('#error-display').dialog({
    autoOpen: false,
    width: 450,
    modal: true,
    buttons: {
      OK: function() {
        // Hide the overlay in case it was shown
        $("#dialog_overlay").hide();
        $(this).dialog("close");
      },
    }
  });

  $('#update_workspace_button').click(function() {
    if (!editable) {
      return;
    }
    $(this).hide();
    mouse_scale = svg_main_graph.getScreenCTM().a;
    if ($(this).data('locked') == true) {
      d3svg.on(".drag", null);
      d3svg.call(zoomBehavior); // JMB turn zoom function on
      unselect_all_readings();
      $('#svgenlargement .node').each(function(index) {
        let ourId = $(this).attr('id');
        let ourShape = get_ellipse(ourId);
        if (!ourShape) {
          return true;
        }
        let ourObj = get_node_obj(ourId);
        if (ourObj != null) {
          ourObj.ungreyout_edges();
          ourObj.set_selectable(false);
          color_inactive(ourShape);
          ourShape.data('node_obj', null);
        }
      });
      $(this).data('locked', false);
      $(this).css('background-position', '0px 44px');
    } else {
      d3svg.on(".zoom", null); // JMB turn zoom function off
      d3svg.call(dragBehavior);
      document.getElementById('graph0').style.transformOrigin = 'top left';
      var left = $('#enlargement').offset().left;
      var right = left + $('#enlargement').width();
      var tf = svg_main_graph.getScreenCTM().inverse();
      var p = svg_root.createSVGPoint();
      p.x = left;
      p.y = 100;
      var cx_min = p.matrixTransform(tf).x;
      p.x = right;
      var cx_max = p.matrixTransform(tf).x;
      $('#svgenlargement .node').each(function(index) {
        let ourId = $(this).attr('id');
        let ourShape = get_ellipse(ourId);
        if (!ourShape) {
          return true;
        }
        if (ourShape.data('node_obj') == null) {
          ourShape.data('node_obj', new node_obj(ourShape));
        } else {
          ourShape.data('node_obj').set_selectable(true);
        }
        ourShape.data('node_obj').greyout_edges();
      });
      $(this).css('background-position', '0px 0px');
      $(this).data('locked', true);
    }
    $(this).show();
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

function loadSVG(normalised) {
  // Disable the toggle button
  $('#select_normalised').addClass('disable');
  // Construct the request
  var ncpath = getTextURL('get_graph');
  var buttonText;

  if (normalised) {
    // We are switching to the normalised view
    ncpath += '?' + $('#normalize-for-type').serialize();
    // Record the actual normalisation we are using
    $('#svgenlargement').data('display_normalised',
      $('#normalize-for-type').val());
    buttonText = "Expand graph";
  } else {
    // We are switching back to the expanded view
    buttonText = "Normalize for";
    $('#svgenlargement').data('display_normalised', false)
  }

  // Make the request
  $.get(ncpath, function(svgData) {
    // Change the button text and re-enable the button
    $('#select_normalised span').text(buttonText);
    $('#select_normalised').removeClass('disable');
    // Show or hide the select box as appropriate
    if (normalised) {
      $('#normalize-for-type').hide();
    } else {
      $('#normalize-for-type').show();
    }
    // Reload the SVG
    $('#svgenlargement').empty().append(svgData.documentElement)
    // TODO center the SVG vertically
    svgEnlargementLoaded();
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
