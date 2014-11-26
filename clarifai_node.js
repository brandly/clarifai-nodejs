// clarifai_node.js - the Clarifai client API for node.js programs
//
// this version supports:
//   tagging by single URL
//   tagging by multiple URLs
//   giving feedback to add tags to multiple docids
//   giving feedback to remove tags from multiple docids
//   automatically requesting a new access token, and queuing any requests received while the access token request is in flight
//   honoring the server throttling instructions   
//
// to get an idea of how to use the API, see the example clarifai_sample.js in the same directory
// requires only that you have node installed

var querystring = require('querystring');
var https = require('https');

var tagPath = "/v1/tag/";
var requestTokenPath = "/v1/token";
var feedbackPath = "/v1/feedback";


// handle the common responses to HTTP status codes
// 200 and 401 Unauthorized are passed to the httpSuccessHandler
// 429 throttles the client
Clarifai.prototype._commonHttpStatusHandler = function(  res, responseData, localId, httpSuccessHandler, successHandler, retry ) {

	if( this._bLogHttp ) console.log( responseData );

	http_status = res.statusCode;
	switch( http_status ) {
		case 200:
		case 201: // returned by feedback methods
		case 401:
			httpSuccessHandler( responseData, successHandler, retry );
			break;
		case 429:
			waitSeconds = res.headers["x-throttle-wait-seconds"];
			if(this._bVerbose) console.log('Server throttled. Wait time: '+waitSeconds+' seconds.');
			if( ! this._throttled ) {
				this._throttled = true;
				if( typeof( this._handleThrottleChanges ) == "function" ) {
					this._handleThrottleChanges( true, waitSeconds );	
					// only set a timeout handler to call the throttle change handler if
					// there is one registered. No reason waiting on the timeout otherwise.
					setTimeout( function() { 
						this._throttled = false;
						if(typeof( this._handleThrottleChanges ) == "function" ) this._handleThrottleChanges( false, 0 ); }.bind(this), 
						1000*Number(waitSeconds) );
				} 
				
			}
			successHandler( JSON.parse( responseData ) );

			break;
		default:
			if(this._bVerbose) console.log( "unexpected http status code "+http_status);
			break;
	}
}

Clarifai.prototype._commonApiStatusHandler = function( responseData, successHandler, retry ) {

	res = JSON.parse(responseData);
	switch( res["status_code"] ) {
		case "OK":
			if( this._bLogResults ) console.log( res );
			successHandler( res );
			break;
		case "TOKEN_INVALID":
			if(this._bVerbose) console.log("Server refused request due to invalid Access Token");
			this._requestAccessToken( successHandler, retry );
			break;
		default:
			if(this._bVerbose) console.log( "_commonApiStatusHandler: unhandled API response: "+res["status_code"]);
			break;
	}
}

Clarifai.prototype._requestAccessToken  = function( errorHandler, retry ) {
	this._retryQueue.push( retry );
	if (this._tokenRequestInFlight) {
		if(this._bVerbose) console.log( "Access Token request already in flight. Queuing request for completion with fresh token.");
		return;
	}
	this._tokenRequestInFlight = true;
	if(this._bVerbose) console.log( "Requesting new Access Token. Queuing request for completion with fresh token.");
	var responseData = '';
	var form = new Array();
	form["grant_type"]="client_credentials";
	form["client_id"] = this._clientId;
	form["client_secret"] = this._clientSecret;
	var formData = querystring.stringify( form );

	this.POSTheaders["Content-Length"] = formData.length;
	this.POSTheaders["Authorization"] = "Bearer "+this._accessToken;

	var self = this;
	var req = https.request( {
		headers : this.POSTheaders,
		hostname :  this._apiHost,
		port : this._apiPort,
		path : requestTokenPath,
		method: 'POST'
	}, function(res) {
		res.setEncoding('utf8');
		res.on("error",console.error);
		res.on("data",function(chunk) { responseData += chunk; } );
		res.on("end",function() { 
			self._commonHttpStatusHandler( 
				res, 
				responseData, 
				null, // no local ids for this request 
				function( requestTokenResponse, successHandler, retry ) {
					this._tokenRequestInFlight = false;
					parsedResponse = JSON.parse(requestTokenResponse);
					if( parsedResponse["status_code"]) {
						if(this._bVerbose) console.log("(Client Id, Client Secret) is invalid.");
						errorHandler( parsedResponse );
					}
					if( typeof parsedResponse["access_token"] == "string") {
						this._accessToken = parsedResponse["access_token"];
						while( 0 < this._retryQueue.length ) {
							retryfn = this._retryQueue.pop();
							retryfn();
						}	
						return;			
					}
					console.error( requestTokenResponse )
					console.error( "_requestAccessToken: unhandled API response: "+parsedResponse["status_code"]);
				}.bind(self)
				, null, 
				retry );
		});
	}).on("error",console.error);

	req.write( formData );
	if( this._bLogHttp ) console.log(req.output);
	req.end();
}


Clarifai.prototype._tagURL  = function( url, localId, successHandler, retry ) {

	if( this._throttled ) successHandler( { 'status_code': 'ERROR_THROTTLED',
										   'status_msg': 'Request refused. Service is throttled.'} );

	var responseData = '';

	// handle both a single url string and a list of url strings
	if( typeof url == "string" ) url = [ url ];
	var form = new Array();
	form["url"] = url;
	if( localId != null ) form["local_id"] = localId;
	if( this._model != null ) form["model"] = this._model;
	var formData = querystring.stringify( form );

	this.POSTheaders["Content-Length"] = formData.length;
	this.POSTheaders["Authorization"] = "Bearer "+this._accessToken;

	var self = this;
	var req = https.request( {
		headers : this.POSTheaders,
		hostname :  this._apiHost,
		port : this._apiPort,
		path : tagPath,
		rejectUnauthorized : false,
		method: 'POST'
	}, function(res) {
		res.setEncoding('utf8');
		res.on("error",console.error);
		res.on("data",function(chunk) { responseData += chunk; } );
		res.on("end",function() { 
			self._commonHttpStatusHandler( res, responseData, localId, self._commonApiStatusHandler.bind(self), successHandler, retry );
			});
	}).on("error",console.log);

	req.write( formData );
	if( this._bLogHttp ) console.log(req.output);
	req.end();
}

Clarifai.prototype.tagURL = function( url, localId, callback ) {

	this._tagURL( url, localId, callback, function() { this.tagURL( url, localId, callback ); }.bind(this) );

}

// _feedbackTagsDocids is a private method for adding or removing
// tags from a list of docids. Whether to add or remove is specified by the
// boolean bAdd.
Clarifai.prototype._feedbackTagsDocids = function( docids, tags, localId, bAdd, successHandler, retry ) {

	var responseData = '';
	var form = new Array();
	form["docids"] = docids;
	if( localId != null ) form["local_id"] = localId;
	if( this._model != null ) form["model"] = this._model;
	form[bAdd ? "add_tags" : "remove_tags"] = tags;
	var formData = querystring.stringify( form );

	this.POSTheaders["Content-Length"] = formData.length;
	this.POSTheaders["Authorization"] = "Bearer "+this._accessToken;

	var self = this;
	var req = https.request( {
		headers : this.POSTheaders,
		hostname :  this._apiHost,
		port : this._apiPort,
		path : feedbackPath,
		method: 'POST'
	}, function(res) {
		res.setEncoding('utf8');
		res.on("error",console.error);
		res.on("data",function(chunk) { responseData += chunk; } );
		res.on("end",function() { 
			self._commonHttpStatusHandler( res, responseData, localId, self._commonApiStatusHandler.bind(self), successHandler, retry );
			});
	}).on("error",console.log);

	req.write( formData );
	if( this._bLogHttp ) console.log(req.output);
	req.end();
}

Clarifai.prototype.feedbackAddTagsToDocids = function( docids, tags, localId, callback ) {

	this._feedbackTagsDocids( docids, tags, localId, true, callback, function() { this.feedbackAddTagsToDocids( docids, tags, localId, callback ); }.bind(this) );

}

Clarifai.prototype.feedbackRemoveTagsFromDocids = function( docids, tags, localId, callback ) {

	this._feedbackTagsDocids( docids, tags, localId, true, callback, function() { this.feedbackAddTagsToDocids( docids, tags, localId, callback ); }.bind(this) );

}

Clarifai.prototype.setThrottleHandler = function( newThrottleHandler ) {
	this._handleThrottleChanges = newThrottleHandler;
}

Clarifai.prototype.setHost = function( newHost ) {
	this._apiHost = newHost;
}

Clarifai.prototype.setPort = function( newPort ) {
	this._apiPort = newPort;
}

Clarifai.prototype.setModel = function( newModel ) {
	this._model = newModel;
}

Clarifai.prototype.setLogHttp = function( bLog ) {
	this._bLogHttp = bLog;
}

Clarifai.prototype.setVerbose = function( bVerbose ) {
	this._bVerbose = bVerbose;
}

Clarifai.prototype.initAPI = function( clientId, clientSecret ) {
	this._clientId = clientId;
	this._clientSecret = clientSecret;	
}

function Clarifai( ) {
	this._clientId = "";
	this._clientSecret = "";
	this._apiHost = "api.clarifai.com";
	this._apiPort = "443";
	this._model = null;
	this._accessToken = "uninitialized";

	this._tokenRequestInFlight = false;
	this._retryQueue = [];
	this._throttled = false;
	this._handleThrottleChanges;
	this._bLogHttp = false;
	this._bVerbose = false;

	this.POSTheaders = {
		"Content-Length" : 0,
		"Content-Type" : "application/x-www-form-urlencoded",
	};

}

module.exports = exports = new Clarifai();
