function edges_of(ellipse) {
  var edges = new Array();
  var node_id = ellipse.parent().attr('id');
  // This is a nasty hack, manually correlating SVG ID to DB ID
  var reading_id = node_id.replace('n', '');
  var edge_outgoing_pattern = new RegExp('^' + reading_id + '-');
  var edge_incoming_pattern = new RegExp(reading_id + '$');
  $.each($('#svgenlargement .edge'), function(index) {
    title = $(this).children('title').text();
    if (edge_outgoing_pattern.test(title) || edge_incoming_pattern.test(title)) {
      var edge = new Edge($(this));
      edge.node_id = node_id;
      if (edge_incoming_pattern.test(title)) {
        edge.is_incoming = true;
      }
      edges.push(edge);
    }
  });
  return edges;
}

function Edge(g_elem) {

  var self = this;

  this.g_elem = g_elem;
  this.witnesses = g_elem.children('text').text().split(/,\s*/);
  this.is_incoming = false;
  // This is a nasty hack, manually correlating SVG ID to DB ID
  this.start_node_id = 'n' + g_elem.children('title').text().split('-')[0];
  this.end_node_id = 'n' + g_elem.children('title').text().split('>')[1];

  this.detach_witnesses = function(witnesses_to_detach) {
    var detached = [];
    var left = '';
    var clone = null;
    $.each(witnesses_to_detach, function(index, witness_to_detach) {
      witness_index = self.witnesses.indexOf(witness_to_detach);
      if (witness_index > -1) {
        self.witnesses.splice(witness_index, 1);
        detached.push(witness_to_detach);
      }
    });
    if (detached != '') {
      clone = self.clone_for(detached);
    }
    var remaining = self.create_label(self.witnesses);
    if (remaining == '') {
      self.g_elem.remove();
    } else {
      self.g_elem.children('text').text(remaining);
    }
    return clone;
  }

  this.get_label = function() {
    return self.g_elem.children('text').text();
  }

  this.create_label = function(witnesses) {
    var label = '';
    $.each(witnesses, function(index, witness) {
      label = label + witness + ', ';
    });
    label = label.replace(/, $/, '');
    return label;
  }

  this.clone_for = function(witnesses) {
    var label = self.create_label(witnesses);
    var clone = g_elem.clone();
    clone.children('text').text(label);
    var duplicate_data = g_elem.data('repositioned');
    if (duplicate_data != null) {
      clone.data('repositioned', duplicate_data);
    }
    clone = new Edge(clone);
    clone.is_incoming = self.is_incoming;
    return clone;
  }

  this.attach_witnesses = function(witnesses) {
    self.witnesses = self.witnesses.concat(witnesses);
    self.g_elem.children('text').text(self.create_label(self.witnesses));
    var edge_weight = 0.8 + (0.2 * self.witnesses.length);
    self.g_elem.children('path').attr('stroke-width', edge_weight);
  }

  this.attach_endpoint = function(target_node_id) {
    // first let's find out if the startpoint might also be linked to the target already
    // in that case we need to remove this edge and transfer the witnesses to the
    // appropriate edge of the target_node
    $.each(edges_of(get_ellipse(target_node_id)), function(index, target_edge) {
      if ((self != null) && (target_edge.is_incoming == true)) {
        if (self.start_node_id == target_edge.start_node_id) {
          target_edge.attach_witnesses(self.witnesses);
          self.g_elem.remove();
          self = null;
        }
      }
    });
    // if not let's really move the end pointer towards the target node
    if (self != null) {
      var polygon = self.g_elem.children('polygon');
      if (polygon.size() > 0) {
        var end_point_arrowhead = new svgshape(polygon);
        // var path_segments = self.g_elem.children('path')[0].pathSegList;
        // var edge_path = new svgpath( path_segments.getItem(path_segments.numberOfItems - 1), self.g_elem.children('path') );
        var path = self.g_elem.children('path')[0];
        var path_element_object = new path_element_class(path, true);
        var edge_path = new svgpath(path_element_object, self.g_elem.children('path'));
        var target_ellipse = get_ellipse(target_node_id);
        var target_cx = parseFloat(target_ellipse.attr('cx'));
        var target_cy = parseFloat(target_ellipse.attr('cy'));
        var target_rx = parseFloat(target_ellipse.attr('rx'));
        var source_ellipse = get_ellipse(self.end_node_id);
        var source_cx = parseFloat(source_ellipse.attr('cx'));
        var source_cy = parseFloat(source_ellipse.attr('cy'));
        var source_rx = parseFloat(source_ellipse.attr('rx'));
        var dx = (target_cx - target_rx) - (source_cx - source_rx);
        var dy = (target_cy - source_cy);
        end_point_arrowhead.reposition(dx, dy);
        // TODO this does a wrong thing and leave a dangling path
        edge_path.reposition(dx, dy);
        g_elem.children('title').text(g_elem.children('title').text().replace(self.end_node_id, target_node_id));
      }
    }
  }

  this.attach_startpoint = function(target_node_id, compressing) {
    // first let's find out if the endpoint might also be linked to the target already
    // in that case we need to remove this edge and transfer the witnesses to the
    // appropriate edge of the target_node
    $.each(edges_of(get_ellipse(target_node_id)), function(index, target_edge) {
      if ((self != null) && (target_edge.is_incoming != true)) {
        if (self.end_node_id == target_edge.end_node_id) {
          target_edge.attach_witnesses(self.witnesses);
          self.g_elem.remove();
          self = null;
        }
      }
    });
    // if not let's really move the start point towards the target node
    if (self != null) {
      // var path_segments = self.g_elem.children('path')[0].pathSegList;
      // var edge_path = new svgpath( path_segments.getItem(0), self.g_elem.children('path') );
      var path = self.g_elem.children('path')[0];
      var path_element_object = new path_element_class(path, true);
      var edge_path = new svgpath(path_element_object, self.g_elem.children('path'));

      var target_ellipse = get_ellipse(target_node_id);
      var target_cx = parseFloat(target_ellipse.attr('cx'));
      var target_cy = parseFloat(target_ellipse.attr('cy'));
      var target_rx = parseFloat(target_ellipse.attr('rx'));
      var source_ellipse = get_ellipse(self.start_node_id);
      var source_cx = parseFloat(source_ellipse.attr('cx'));
      var source_cy = parseFloat(source_ellipse.attr('cy'));
      var source_rx = parseFloat(source_ellipse.attr('rx'));

      var dx = (target_cx + target_rx) - (source_cx + source_rx);
      var dy = (target_cy - source_cy);
      edge_path.reposition(dx, dy);

      if (compressing && text_direction === 'RL') {
        edge_path.reposition((target_cx - target_rx) - edge_path.path.x, 0);
      } else if (compressing && text_direction === 'BI') {
        edge_path.reposition(-target_rx / 2, 0);
      }


      self.g_elem.children('title').text(self.g_elem.children('title').text().replace(self.start_node_id, target_node_id));
    }
  }
}
