function $upl(id) {
	return document.getElementById(id);	
}

function limitFiles( up, files ) {
    most_recent = files.slice(-1)[0];
    file_ids = $.map(up.files, function (item) { return item.id; });
    $.each(file_ids, function(index, file_id) {
        if( file_id!=most_recent.id ) { uploader.removeFile( uploader.getFile(file_id) ) };
    });
    $('#filelist').empty().html( '<div class="uploadfile" id="' + most_recent.id + '"><span id="uploadfile_label">File selected:</span>&nbsp;' + most_recent.name.substring(0,17) + '&nbsp;<b></b></div>' );
    $('#upload_button').button('enable');
}

// Utility function to pull the JSON out of the <pre>-wrapped HTML that
// plupload irritatingly returns.
function parseResponse( resp ) {
	return $.parseJSON($(resp).text() );
}

function create_uploader(upload_url) {
        uploader = new plupload.Uploader({
        runtimes : 'html4',
        browse_button : 'pick_uploadfile_button',
        container: 'upload_container',
        max_file_size : '10mb',
        url : upload_url,
        filters : [
            {title : "Tradition files", extensions : "txt,xls,xlsx,csv,xml"},
        ]
    });

    uploader.bind('BeforeUpload', function(up, file) {
        var parameter_values = {};
        $.each($('#new_tradition').serializeArray(), function(i, field) {
            parameter_values[field.name] = field.value;
        });    
        up.settings.multipart_params = parameter_values;
    });
   
    uploader.bind('Init', function(up, params) {
        // $upl('filelist').innerHTML = "<div>Current runtime: " + params.runtime + "</div>";
    });

    uploader.bind('FilesAdded', function(up, files) {
        //Needed because Pluploader needs some time to add the file to the queue.
        setTimeout( function(){ limitFiles(up, files) }, 50 );
    });

    uploader.bind('UploadProgress', function(up, file) {
        $upl(file.id).getElementsByTagName('b')[0].innerHTML = '<span>' + file.percent + "%</span>";
    });
    
    uploader.bind('Error', function( up, args ) {
    	$('#upload_status').empty().append(
    		$('<span>').attr('class', 'error').append( 'A server error occurred' ) );
    });
    

    uploader.bind('FileUploaded', function(up, file, ret) {
		var result = parseResponse( ret.response );
		if( result.id ) {
			$('#upload-collation-dialog').dialog('close');
			refreshDirectory();
			loadTradition( result.id, result.name, 1 );
		} else if( result.error ) {
			file.status = plupload.FAILED;
			$('#upload_status').empty().append( 
				$('<span>').attr('class', 'error').append( result.error ) );
		}
    });
 
    uploader.bind('Error', function(up, err) {
        console.log( 'echt wel' );
        console.log( err );
    });
            
    uploader.init();

}
