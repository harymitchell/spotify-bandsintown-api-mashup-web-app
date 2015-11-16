// DOM Ready =============================================================
$(document).ready(function() {
    $('#searchButton').on('click', function(){
    	$.ajax({
            type: 'POST',
            data: {},
            url: '/search',
            dataType: 'JSON'
        }).done(function( response ) {
        	console.log ('post done')
        	location.reload(true)
        });
    });
});