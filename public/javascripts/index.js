// Event data array for filling in info box.
var lastEventsData = [];

// DOM Ready =============================================================
$(document).ready(function() {
    var lastTableContent = localStorage.getItem("lastTableContent")
    if (lastTableContent) {
	$('#showList.list').html(lastTableContent)
    }
    $('#showList.list').html(lastTableContent)
    $('.throbber-loader').hide();
    $('#searchButton').show();
    $('#loginButton').show();
    $('li#home').addClass('active');
    $('#searchButton').on('click', function(){
	$('#searchButton').hide();
	$('.throbber-loader').show();
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
	    $('#searchButton').show();
	    $('.throbber-loader').hide();
            console.log ('post done with response: '+response)
	    loadEventsList (response.events)
        });
    });
    $('#loginButton').on('click', function(){
	$('#searchButton').hide();
	$('.throbber-loader').show();	
        localStorage.setItem("lastTableContent", '');
    });
    $('#logout').on('click', function(){
        localStorage.setItem("lastTableContent", '');
    })
});

function loadEventsList (events){
    // For each item in our events JSON, add a table row and cells to the content string. 
    var tableContent = ''   
    tableContent += '<table>'
	tableContent += '<thead>'
	    tableContent += '<tr>'
		tableContent += '<th>'
		tableContent += 'Event'
		tableContent += '</th>'
		
		tableContent += '<th>'
		tableContent += 'When'
		tableContent += '</th>'
		
		tableContent += '<th>'
		tableContent += 'Where'
		tableContent += '</th>'
		
		tableContent += '<th>'
		tableContent += '</th>'
	    tableContent += '</tr>'
	tableContent += '</thead>'
	tableContent += '<tbody>'
    $.each(events, function(){
	tableContent += '<tr>';
	tableContent += '<td>' + this.title + '</td>'
	tableContent += '<td>' + this.formatted_datetime + '</td>'
	tableContent += '<td>' + this.formatted_location + '</td>'
	tableContent += '<td>'
	    tableContent += '<a href="'+this.facebook_rsvp_url+'">RSVP'
	    tableContent += '</a>'
	    tableContent += '<br>'
	    tableContent += '<a href="'+this.ticket_url+'">Tix'
	    tableContent += '</a>'
	tableContent += '</tr>'
    });
    tableContent += '</tbody>'
    tableContent += '</table>'
    // Inject the whole content string into our #showList.list
    $('#showList.list').html(tableContent)
    lastEventsData = events
    localStorage.setItem("lastTableContent", tableContent);
}

window.onbeforeunload = function() {
    console.log ("onbeforeunload ")
}

