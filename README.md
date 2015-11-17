# About
The Show Spot allows user authentication via Spotify's secure log-in.  Spotify does NOT share passwords or any other sensitive data with The Show Spot.  The Show Spot accesses your "followed" artists, as well as the artists from your saved tracks.  Unfortunately, it is not possible to access your radio stations.  We wish it was!

The Show Spot accesses event information through the Bandsintown API.  No user authetication is needed for this step.  We've got it covered!

# Authentication
Uses the OAUTH flow suggested by Spotify.  User is redirected to log into Spotify, then redirected back to the app.  This app has no database (for now), so a user's credentials are only cached in the session.

# Data
The application will gather artists from Spotify based on the current logged-in user's "followed" artists, as well as the artists from any saved tracks or playlists.  We then use these artists to find events from Bandsintown.  We cache all Spotify artists and Bandsintown events in the session, so that we don't overload the external APIs, plus its faster.

# Filtering
At present, the only filter is by zip code, with a mile radius.

# TODO
1. Sorting:  right now the events are sorted in no particular order.  We would like to offer sorting on column headers.
2. Grouping: the full list (no filtering) can be quite lengthy.  We would like to offer grouping on the artist name, allowing the user to expand each artist as desired to view events.
3. Auto-populate zip code field on client side:  there's got to be a well-documented library for that.  I dont want to write one.
4. More APIs:  it would be great to offer more API coverage, especially for events. 
