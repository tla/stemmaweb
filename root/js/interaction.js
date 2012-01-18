var colors = ['#ffeeaa','#afc6e9','#d5fff6','#ffccaa','#ffaaaa','#e5ff80','#e5d5ff','#ffd5e5'];
var row_triggered = false;
$(document).ready(function() {
  $('.rowid').click( function() {
    row_triggered = true;
    $('ellipse').attr( {stroke:'black', fill:'#fff'} );
    $('.node').children('polygon').attr( {stroke:'#fff', fill:'#fff'} );
    $('.node').children('text').attr( {stroke:'none', fill:'#000'} );
    $('tr.active_variant_row').children('td').removeClass('cellb0 cellb1 cellb2 cellb3 cellb4 cellb5 cellb6 cellb7'); 
    $(this).parent().nextAll('.clickable').children('span').click();
    $('td.active_variant_cell').removeClass('active_variant_cell');
    row_triggered = false;
  });
  $('svg').width('485px');
})
function color_nodes( column_index, arr_node_ids, arr_greynode_ids ) {
  if( !row_triggered ) {
    $('tr.active_variant_row').children('td').removeClass('cellb0 cellb1 cellb2 cellb3 cellb4 cellb5 cellb6 cellb7'); 
    $('td.active_variant_cell').removeClass('active_variant_cell');
    $('ellipse').attr( {stroke:'black', fill:'#fff'} );
    $('.node').children('polygon').attr( {stroke:'#fff', fill:'#fff'} );
    $('.node').children('text').attr( {stroke:'none', fill:'#000'} );
  }; 
  $('tr.active_variant_row').removeClass('active_variant_row') 
  jQuery.each( arr_greynode_ids, function(index,value) {
    nodes = $('.node').children('title').filter( function(index) {
      return $(this).text() == value;
    })
    nodes.siblings('ellipse, polygon, text').each( function( index ) {
        $(this).attr( {stroke:'#ddd', fill:'#f8f8f8'} );
      });
  });
  jQuery.each( arr_node_ids, function(index,value) {
    $('.node').children('title').filter( function(index) {
      return $(this).text() == value;
    }).siblings('ellipse').each( function( index ) {
        $(this).attr( {stroke:'black', fill:colors[column_index-1]} );
      });
  });
}
