// node_example.js - Example showing use of Clarifai node.js API

var Clarifai = require('./clarifai_node.js');
Clarifai.initAPI(process.env.CLIENT_ID, process.env.CLIENT_SECRET);

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

// exampleTagSingleURL() shows how to request the tags for a single image URL
function exampleTagSingleURL() {var testImageURL = 'http://www.clarifai.com/img/metro-north.jpg';
	var ourId = "train station 1"; // this is any string that identifies the image to your system

	Clarifai.tagURL( testImageURL , null, function( res, localId ) {
		if( opts["print-results"] ) {
			console.log( res, localId );
		};
	} );
}

// exampleTagMultipleURL() shows how to request the tags for multiple images URLs
function exampleTagMultipleURL() {
	var testImageURLs = [ 
	"http://www.clarifai.com/img/metro-north.jpg", 
	"http://www.clarifai.com/img/img_fire_bg.jpg" ] ;
	var ourIds =  [ "train station 1", 
	                        "img002032" ]; // this is any string that identifies the image to your system

	Clarifai.tagURL( testImageURLs , null, function( res, localId ) {
		if( opts["print-results"] ) {
			console.log( res , localId );
		};
	} );
}

// exampleFeedback() shows how to send feedback (add or remove tags) from 
// a list of docids. Recall that the docid uniquely identifies an image previously
// presented for tagging to one of the tag methods.
function exampleFeedback() {
// these are docids that just happen to be in the database right now. this test should get 
// upgraded to tag images and use the returned docids.
var docids = [
	"15512461224882630000",
	"9549283504682293000"
	];
	var addTags = [
	"addTag1",
	"addTag2"
	];
	Clarifai.feedbackAddTagsToDocids( docids, addTags, null, function( res ) {
		if( opts["print-results"] ) {
			console.log( res );
		};
	} );

	var removeTags = [
	"removeTag1",
	"removeTag2"
	];
	Clarifai.feedbackRemoveTagsFromDocids( docids, removeTags, null, function( res ) {
		if( opts["print-results"] ) {
			console.log( res );
		};
	} );
}


exampleTagSingleURL();
exampleTagMultipleURL();
exampleFeedback();
