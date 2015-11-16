// DOM Ready =============================================================
$(document).ready(function() {
    $('li#home').addClass('active');
    $('#searchButton').on('click', function(){
	var zip = $('input#inputZipCode').val()
	var radius = $('input#inputRadius').val()
	console.log (zip)
	console.log (radius)
    	$.ajax({
            type: 'POST',
            data: {zip: zip, radius: radius},
            url: '/search',
            dataType: 'JSON'
        }).done(function( response ) {
        	console.log ('post done')
        	location.reload(true)
        });
    });
});