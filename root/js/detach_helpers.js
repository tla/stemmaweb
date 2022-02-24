function edges_of(ellipse, direction) {
  var edges = new Array();
  var node_id = ellipse.parent().attr('id');
  var reading_id = ellipse.prev('title').text();
  var edge_outgoing_pattern = new RegExp('^' + reading_id + '-');
  var edge_incoming_pattern = new RegExp(reading_id + '$');
  $.each($('#svgenlargement .edge'), function(index) {
    title = $(this).children('title').text();
    if (edge_outgoing_pattern.test(title) || edge_incoming_pattern.test(title)) {
      let edge = new Edge($(this));
      edge.node_id = node_id;
      edge.is_incoming = edge_incoming_pattern.test(title);
      edges.push(edge);
    }
  });
  if (direction === 'incoming') {
    return edges.filter(e => e.is_incoming);
  } else if (direction === 'outgoing') {
    return edges.filter(e => !e.is_incoming);
  }
  return edges;
}

function Edge(g_elem) {

  var self = this;

  this.g_elem = g_elem;
  this.witnesses = g_elem.children('text').text().split(/,\s*/);
  this.is_incoming = false;
  // This is a nasty hack, manually correlating SVG ID to DB ID
  this.start_node_id = rid2node(g_elem.children('title').text().split('-')[0]);
  this.end_node_id = rid2node(g_elem.children('title').text().split('>')[1]);

  this.detach_witnesses = function(witnesses_to_detach) {
    var detached = [];
    var left = '';
    var clone = null;
    witnesses_to_detach.forEach(w => {
      witness_index = self.witnesses.indexOf(w);
      if (witness_index > -1) {
        self.witnesses.splice(witness_index, 1);
        detached.push(w);
      }
    });
    if (detached.length) {
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
    witnesses.sort();
    return witnesses.join(', ');
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
    var text_elem = self.g_elem.children('text');
    if (text_direction != 'BI') {
      text_elem = text_elem.children('textPath');
    }
    text_elem.text(self.create_label(self.witnesses));
    var edge_weight = 0.8 + (0.2 * self.witnesses.length);
    self.g_elem.children('path').attr('stroke-width', edge_weight);
  }

  this.attach_endpoint = function(target_node_id) {
    // first let's find out if the startpoint might also be linked to the
    // target already via another edge
    // in that case we need to remove this edge and transfer the witnesses
    // to the appropriate edge of the target_node
    edges_of(get_ellipse(target_node_id)).forEach(target_edge => {
      if ((self != null) && (target_edge.is_incoming == true)) {
        if (self.start_node_id == target_edge.start_node_id &&
          self.end_node_id != target_edge.end_node_id) {
          target_edge.attach_witnesses(self.witnesses);
          self.g_elem.remove();
          self = null;
        }
      }
    });
    // if not let's really move the end pointer towards the target node
    if (self != null) {
      let polygon = self.g_elem.children('polygon');
      if (polygon.size() > 0) {
        let end_point_arrowhead = new svgshape(polygon);
        let path = self.g_elem.children('path')[0];
        let path_element_object = new path_element_class(path, false);
        let edge_path = new svgpath(path_element_object, self.g_elem.children('path'));
        let target_ellipse = get_ellipse(target_node_id);
        let target_cx = parseFloat(target_ellipse.attr('cx'));
        let target_cy = parseFloat(target_ellipse.attr('cy'));
        let target_rx = parseFloat(target_ellipse.attr('rx'));
        let curr_pos = polygon[0].getBBox();
        let source_cx = curr_pos.x + (curr_pos.width / 2);
        let source_cy = curr_pos.y + (curr_pos.height / 2);
        let dx = (target_cx - target_rx) - (source_cx);
        let dy = (target_cy - source_cy);
        end_point_arrowhead.reposition(dx, dy);
        edge_path.reposition(dx, dy);
        if (text_direction !== 'BI') {
          offset_sequence_label(g_elem[0]);
        }
        g_elem.children('title').text(g_elem.children('title').text().replace(self.end_node_id, target_node_id));
      }
    }
  }

  this.attach_startpoint = function(target_node_id, compressing) {
    // first let's find out if the endpoint might also be linked to the target already
    // in that case we need to remove this edge and transfer the witnesses to the
    // appropriate edge of the target_node
    edges_of(get_ellipse(target_node_id)).forEach(target_edge => {
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
      let path = self.g_elem.children('path')[0];
      let path_element_object = new path_element_class(path, true);
      let edge_path = new svgpath(path_element_object, self.g_elem.children('path'));

      let target_ellipse = get_ellipse(target_node_id);
      let target_cx = parseFloat(target_ellipse.attr('cx'));
      let target_cy = parseFloat(target_ellipse.attr('cy'));
      let target_rx = parseFloat(target_ellipse.attr('rx'));

      let dx = (target_cx + target_rx) - (edge_path.x);
      let dy = (target_cy - edge_path.y);
      edge_path.reposition(dx, dy);

      if (compressing && text_direction === 'RL') {
        edge_path.reposition((target_cx - target_rx) - edge_path.path.x, 0);
      } else if (compressing && text_direction === 'BI') {
        edge_path.reposition(-target_rx / 2, 0);
      }
      if (text_direction !== 'BI') {
        offset_sequence_label(g_elem[0]);
      }

      self.g_elem.children('title').text(self.g_elem.children('title').text().replace(self.start_node_id, target_node_id));
    }
  }
}
