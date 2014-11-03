Clarifai API Client for node.js
==================



[Clarifai](http://www.clarifai.com) provides an API for image recognition. This node.js module makes it easy to incorporate Clarifai image tagging and other capabilities into your node.js backend. It wraps [Clarifai's REST API](http://developer.clarifai.com). Please refer to that documentation for a complete description of capabilites. This documentation assumes you are familiar with that material.

Table of Contents
================
**Get started**

1. [Setup](#setup)
1. [Online documentation](#documentation)

Setup
-------------
To setup your project, follow these steps:

 1. Download the file clarifai_node.js
 2. In your node.js program require the *clarifai_node.js* module, adjusting the path to your setup. For example, if you put clarifai_node.js in the same directory that your node.js program runs in, then the following line will include it.

```javascript
var Clarifai = require('./clarifai_node.js');
```
3. Initialize the client with your Client ID and Client Secret. You can find them in the [Applications](https://developer.clarifai.com/applications) section of your developer profile. Note that Client IDs and Client Secrets come in pairs, with each pair associated with a single application.

```javascript
Clarifai.initAPI("your Client Id", "your Client Secret" );
```

Note that if you put your Client ID and Client Secret in environment variables CLIENT_ID and CLIENT_SECRET respectively, then the following call will pick them up and initialize the API.

```javascript
Clarifai.initAPI(process.env.CLIENT_ID, process.env.CLIENT_SECRET);
```

Now you're ready to make calls to the Clarifai API.

At a command prompt in the folder where you downloaded the Clarifai node.js API client, run the supplied sample program. NOTE: the sample program assumes you have set the environment variables CLIENT_ID and CLIENT_SECRET. Review the source for examples of how to use the API client.

```
$ node clarifai_sample.js
```

Documentation
================

This documentation is limited to incorporating the node.js client module into your backend. For a complete information on the API, check [our developer site](http:/developer.clarifai.com). 

Callbacks
----------------------
Methods on the API take a parameter which is a callback function. The callback function will eventually be called when the response to the request is available, or an unrecoverable error occurs.

Error Handling
----------------------
It is possible for requests to encounter errors that the API cannot recover from and must surface to your program. The asynchronous nature of the interface complicates the way that your program can understand the error. So, the callback routines take two parameters. The first is a result object containing the results of the API method invocation. The second is your localId parameter. So in the case of an error you'll get your meaningful ids back just as in the case of sucessful completion.

Queuing Requests
----------------------
The REST API requires an access token to be presented in all requests (except for requesting a new access token). These access tokens expire periodically. When the access token expires, the API is effectively unavailable to your application until a new one is retrieved. Because this node.js client is handling the request for a new access token automatically, we queue any requests that arrive while a) the access token is invalid and b) the access token request and response are in flight. Once the new access token is received, we unspool the queued requests. This should be completely transparent to you unless something goes awry with the retrieval of a valid access token.

Throttling
----------------------
At various times the server will instruct the client to temporarily stop submitting requests for intervals on the order of many seconds. Because the client cannot submit requests during this period, they are refused with an error indicating that the server is throttling the client. Specifically, the result_code member of the result object will be "ERROR_THROTTLED". To help you manage workload while accomodating the occasional throttled state, the API allows you to register a callback that will be notified when the API state has changed to Throttled and also when the Throttled state ends and normal API request submissions can resume. We recommend that you register a throttle event listener in order to better handle the transitions from normal operation to Throttled and back.

Thread Safety
----------------------
Note this version of the Clarifai node.js API client is *not* thread safe. There is shared state in the client module that precludes concurrent use by muliple threads.




