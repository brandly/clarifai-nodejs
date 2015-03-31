// node_example.js - Example showing use of Clarifai node.js API

var Clarifai = require('./clarifai_node.js');
Clarifai.initAPI(process.env.CLIENT_ID, process.env.CLIENT_SECRET);


var async = require('async');
var stdio = require('stdio');

// support some command-line options
var opts = stdio.getopt( {
	'print-results' : { description: 'print results'},
	'print-http' : { description: 'print HTTP requests and responses'},
	'verbose' : { key : 'v', description: 'verbose output'}
});
var verbose = opts["verbose"];
Clarifai.setVerbose( verbose );
if( opts["print-http"] ) {
	Clarifai.setLogHttp( true ) ;
}

if(verbose) console.log("using CLIENT_ID="+Clarifai._clientId+", CLIENT_SECRET="+Clarifai._clientSecret);

// Setting a throttle handler lets you know when the service is unavailable because of throttling. It will let
// you know when the service is available again. Note that setting the throttle handler causes a timeout handler to
// be set that will prevent your process from existing normally until the timeout expires. If you want to exit fast
// on being throttled, don't set a handler and look for error results instead.

Clarifai.setThrottleHandler( function( bThrottled, waitSeconds ) { 
	console.log( bThrottled ? ["throttled. service available again in",waitSeconds,"seconds"].join(' ') : "not throttled");
});


function commonResultHandler( err, res ) {
	if( err != null ) {
		if( typeof err["status_code"] === "string" && err["status_code"] === "TIMEOUT") {
			console.log("TAG request timed out");
		}
		else if( typeof err["status_code"] === "string" && err["status_code"] === "ALL_ERROR") {
			console.log("TAG request received ALL_ERROR. Contact Clarifai support if it continues.");				
		}
		else if( typeof err["status_code"] === "string" && err["status_code"] === "TOKEN_EXPIRED") {
			console.log("TAG request received TOKEN_EXPIRED.");
			Clarifai.requestAccessToken( function( err, res ) {
				if( opts["print-results"] ) {
					console.log( res );
				};
				if( res != null ) {
					Clarifai.setAccessToken( res['access_token'] );
				}
			});
			// note that in the interval between now and when a valid token is received, any requests
			// on the API will return TOKEN_EXPIRED
		}
		else if( typeof err["status_code"] === "string" && err["status_code"] === "TOKEN_FAILURE") {
			console.log("TAG request received TOKEN_FAILURE. Contact Clarifai support if it continues.");				
		}
		else if( typeof err["status_code"] === "string" && err["status_code"] === "ERROR_THROTTLED") {
			console.log("Clarifai host is throttling this application.");				
		}
		else {
			console.log("TAG request encountered an unexpected error: ");
			console.log(err);				
		}
	}
	else {
		if( opts["print-results"] ) {
			// if some images were successfully tagged and some encountered errors,
			// the status_code PARTIAL_ERROR is returned. In this case, we inspect the
			// status_code entry in each element of res["results"] to evaluate the individual
			// successes and errors. if res["status_code"] === "OK" then all images were 
			// successfully tagged.
			if( typeof res["status_code"] === "string" && 
				( res["status_code"] === "OK" || res["status_code"] === "PARTIAL_ERROR" )) {

				// the request completed successfully
				for( i = 0; i < res.results.length; i++ ) {
					if( res["results"][i]["status_code"] === "OK" ) {
						console.log( 'docid='+res.results[i].docid +
							' local_id='+res.results[i].local_id +
							' tags='+res["results"][i].result["tag"]["classes"] )
					}
					else {
						console.log( 'docid='+res.results[i].docid +
							' local_id='+res.results[i].local_id + 
							' status_code='+res.results[i].status_code +
							' error = '+res.results[i]["result"]["error"] )
					}
				}

			}
		}			
	}
}


// by default, access token management is manual, meaning that you need to make
// explicit access token requests whenever you need a new token. for example, if
// you are not caching your token between executions, you will need a new token
// when you start up.

// this sample starts with no token, so we want to wait while we get one before
// we send our first tag request


async.series( [ 
	function(callback) {
		Clarifai.requestAccessToken( function( err, res ) {
			if( opts["print-results"] ) {
				console.log( res );
			};
			if( res != null ) {
				// assuming you got a response (no error), then set the new token
				// on the API instance
				Clarifai.setAccessToken( res['access_token'] );
			}
			callback(err,res);
		});
	},
	function(callback) {

		var testImageURL = 'http://www.clarifai.com/img/metro-north.jpg';
		var ourId = "train station 1"; // this is any string that identifies the image to your system

		Clarifai.tagURL( testImageURL , ourId, function( err, res ) {
			commonResultHandler(err,res);
			callback(err,res);
		} );

	},
	function(callback) {

		var testImageFile = 'testimages/img0001.jpg';
		var ourId = 'our sample image';
		
		Clarifai.tagFile( testImageFile, ourId,  function( err, res ) {
			commonResultHandler(err,res);
			callback(err,res);
		} );

	},
	function(callback) {
		var testImageURLs = [ 
								"http://www.clarifai.com/img/metro-north.jpg", 
								"http://www.clarifai.com/img/metro-north.jpg"
							];
		var ourIds =  [ "train station 1", 
		                "train station 2" ]; // this is any string that identifies the image to your system
		
		Clarifai.tagURL( testImageURLs, ourIds, function( err, res ) {
			commonResultHandler(err,res);
			callback(err,res);
		} );

	},
	function(callback) {
		var docids = [
			"15512461224882630000",
			"9549283504682293000"
			];
		var addTags = [
			"addTag1",
			"addTag2"
			];

		Clarifai.feedbackAddTagsToDocids( docids, addTags, null, function( err, res ) {
			if( opts["print-results"] ) {
				console.log( res );
			};
			callback(err,res);
		} );
	}
	],
	function( err, res ) {
	}

);

Clarifai.clearThrottleHandler();

