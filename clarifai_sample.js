// node_example.js - Example showing use of Clarifai node.js API


var Clarifai = require('./clarifai_node.js');


// exampleTagSingleURL() shows how to request the tags for a single image URL
function exampleTagSingleURL() {
	var exampleImageURL = 'http://www.clarifai.com/img/metro-north.jpg';
	Clarifai.tagURL( exampleImageURL , function(res) {
		console.log(res);
		// get the docid
		console.log(res["results"][0]["docid"]);
	} );		
}

// exampleTagMultipleURL() shows how to request the tags for multiple images URLs
function exampleTagMultipleURL() {
	var exampleImageURLs = [ 
	"http://www.clarifai.com/img/metro-north.jpg", 
	"http://www.clarifai.com/img/img_fire_bg.jpg" ] ;

	Clarifai.tagURLmulti( exampleImageURLs, function( res ){
		console.log(res);
		// get the docids
		console.log(res["results"][0]["docid"]);
		console.log(res["results"][1]["docid"]);
	} );		
}

// exampleFeedback() shows how to send feedback (add or remove tags) from 
// a list of docids. Recall that the docid uniquely identifies an image previously
// presented for tagging to one of the tag methods.
function exampleFeedback() {
	var docids = [
	"15512461224882630000",
	"9549283504682293000"
	];
	var addTags = [
	"addTag1",
	"addTag2"
	];
	Clarifai.feedbackAddTagsToDocids( docids, addTags, console.log )

	var removeTags = [
	"removeTag1",
	"removeTag2"
	];
	Clarifai.feedbackRemoveTagsFromDocids( docids, removeTags, console.log )
}


exampleTagSingleURL();
exampleTagMultipleURL();
exampleFeedback();
