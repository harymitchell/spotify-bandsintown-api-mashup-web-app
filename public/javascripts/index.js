// Event data array for filling in info box.
var lastEventsData = [];

// DOM Ready =============================================================
$(document).ready(function() {
    setZipCodeForClient()
    var lastTableContent = localStorage.getItem("lastTableContent")
    if (lastTableContent) {
	$('#showList.list').html(lastTableContent)
    }
    $('#showList.list').html(lastTableContent)
    $('.throbber-loader').hide();
    $('#searchButton').show();
    $('#loginButton').show();
    $('li#home').addClass('active');
    $( "#inputRadius" ).val (50)
    $('#searchButton').on('click', function(){
	searchEvents ()
    });
    $( "#inputZipCode" ).on( "keydown", function(event) {
      if(event.which == 13) 
         searchEvents ()
    });
    $( "#inputRadius" ).on( "keydown", function(event) {
      if(event.which == 13) 
         $( "#inputZipCode" ).focus()
    });
    $('#loginButton').on('click', function(){
	$('#searchButton').hide();
	$('.throbber-loader').show();	
        localStorage.setItem("lastTableContent", '');
    });
    $('#logout').on('click', function(){
        localStorage.setItem("lastTableContent", '');
    })
    setUpListEvents ()
});

function searchEvents (){
    // Sreach events
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
	console.log ('post done with response: ')
	console.log(response)
	loadEventsList (response.events, 'title')
    });    
}

function loadEventsList (events, sortValue){
    // For each item in our events JSON, add a table row and cells to the content string.
    var tableContent = ''
    var currentArtist = ''
    var escapedCurrentArtist = ''
    // Sort events
    if (sortValue && sortValue != '') {
	events.sort (function(a,b){
	    if (a[sortValue] < b[sortValue]) {
		return -1
	    }else if (a[sortValue] > b[sortValue]) {
		return 1
	    }else{
		return 0
	    }
	});
    }
     
    if (events[0]) {
	tableContent += '<table>'
	    tableContent += '<col width="45%" />'
	    tableContent += '<col width="25%" />'
	    tableContent += '<col width="25%" />'
	    tableContent += '<col width="15%" />'
	    tableContent += '<tbody>'
	$.each(events, function(){
	    if (this.artists[0] && this.artists[0].name != currentArtist) {
		// New parent row
		currentArtist = this.artists[0].name
		escapedCurrentArtist = currentArtist.replace(/[^a-z0-9]/gi,'');
		tableContent += '<tr class="parentRow" id="'+escapedCurrentArtist+'">';
		tableContent += '<td colspan=4><a>' + currentArtist  + '</a></td>'
		tableContent += '</tr>'
		tableContent += '<tr class="childRow" id="'+escapedCurrentArtist+'">'
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
	    }
	    tableContent += '<tr class="childRow" id="'+escapedCurrentArtist+'">';
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
    }else{
	// TODO:  notify visually no results
    }
    // Inject the whole content string into our #showList.list
    $('#showList.list').html(tableContent)
    setUpListEvents ()
    lastEventsData = events
    localStorage.setItem("lastTableContent", tableContent);
}

function setUpListEvents () {
    // Sets up events for list rows.
    $('.childRow').hide() // hide all children by default
    $('.parentRow').on('click', function(event){
	var artistID = event.target.closest('tr.parentRow').id
        console.log ("clicking parent "+artistID)
	//$('#'+artistID).show()
	if ($('.parentRow#'+artistID).hasClass('openNode')) {
	    // Close it
	    $('.parentRow#'+artistID).removeClass('openNode')
	    $('.childRow#'+artistID).hide()
	}else{
	    // Open it
	    $('.childRow').hide() // hide all children by default
	    $('.parentRow').removeClass('openNode')
	    $('.parentRow#'+artistID).addClass('openNode')
	    $('.childRow#'+artistID).show()
	}
    })
}

function setZipCodeForClient(){
    if(navigator.geolocation) {
	navigator.geolocation.getCurrentPosition(function(a) {
	    console.log (a.coords)
	    coords = a.coords
	    url = "https://maps.googleapis.com/maps/api/geocode/json?latlng="+coords.latitude+","+coords.longitude+"&sensor=true&callback=zipmap"
	    console.log (url)
	    $.ajax({
	      url: url,
	      dataType: 'json',
	      cache: true,
	    }).success(function( data ) {
		console.log (JSON.stringify(data))
		for (i in data.results){
		    for (c in data.results[i].address_components){
			if (data.results[i].address_components[c].types && data.results[i].address_components[c].types[0] == 'postal_code'){
			  $( "#inputZipCode" ).val (data.results[i].address_components[c].short_name)
			  break;
			}
		    }
		}
	    }); // end ajax callback
	}); //end geolocation callback
    }else{
	alert('navigator.geolocation not supported.')
    }
}

