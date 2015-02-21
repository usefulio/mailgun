Emails.Mailgun = {};

Emails.route("mailgun", {
	action: function (email) {
		var emailToSend = _.pick(email
			, 'from'
			, 'to'
			, 'replyTo'
			, 'cc'
			, 'bcc'
			, 'subject'
			, 'text'
			, 'html'
			, 'attachement'
			, 'inline'
			);

		var result = HTTP.post(
			"https://api.mailgun.net/v2/" + this.get("domain") + "/messages"
			, {
				auth: "api:" + this.get("api_key")
				, params: emailToSend
		});

		if (result.data.id && email._id) {
			Emails._collection.update(email._id, {
				outgoingId: result.data.id
			});
		}
	}
});

Meteor.startup(function () {
	var settings = Meteor.settings;
	if (settings && settings.mailgun) {
		Emails.routes.mailgun.config.api_key = settings.mailgun.api_key;
		Emails.routes.mailgun.config.domain = settings.mailgun.domain;
	}
});

// // Write your package code here!
// Mailgun = {
// 	init: function (config) {

// 		// the http basic authentication header to send with any mailgun api calls
// 		config.auth = 'api:' + config.api_key;

// 		// The route where mailgun-emails will listen for notifications
// 		// we generate this route from the api_key, hasing it first
// 		// this makes the route more secure, and unlikely that the route will
// 		// colide with other routes.
// 		config.route = "_mailgun_" + SHA256(config.api_key).slice(0, 15);
		
// 		// The absolute path to our callback route
// 		config.routePath = Meteor.absoluteUrl() + '' + config.route;

// 		// The mailgun action param - mailgun store our email and notify us if
// 		// the server is publically accessible
// 		config.action = config.routePath.match(/localhost|127\.0\.0\.1/) ?
// 			'store()' :
// 			'store(notify="' + config.routePath + '")';

// 		config.priority = _.isNumber(config.priority) ? config.priority : 5;

// 		// The filter for matching emails to catch and forward
// 		config.expression = "match_recipient(\".*@" + config.domain.replace(/\./g, '\\.') + "\")";

// 		Mailgun.config = config;

// 		Emails.config.domain = config.domain;

// 		Emails.provider = Mailgun;

// 		console.log('Creating mailgun route.');
// 		var route = _.find(HTTP.get('https://api.mailgun.net/v2/routes', {
// 				auth: config.auth
// 			}).data.items, function (route) {
// 				return route.expression == config.expression &&
// 					   route.description == 'meteor_reply_to_route';
// 			});

// 		if (route) {
// 			if (!_.any(route.actions, function (a) {
// 				return a == config.action;
// 			})) {
// 				// delete route since it doesn't match.
// 				// we don't want two meteor apps forwarding messages
// 				HTTP.del('https://api.mailgun.net/v2/routes/' + route.id, {
// 					auth: config.auth
// 				});
// 				console.log("Existing mailgun route deleted ", route.id);
// 				route = undefined;
// 			} else {
// 				console.log("Existing mailgun route left in place ", route.id);
// 			}
// 		}

// 		if (!route) {
// 			var response = HTTP.post('https://api.mailgun.net/v2/routes', {
// 				auth: config.auth
// 				, params: {
// 					description: 'meteor_reply_to_route'
// 					, expression: config.expression
// 					, action: config.action
// 					, priority: config.priority
// 				}
// 			});
// 			console.log("New mailgun route added", response.data.route.id);
// 		}

// 		// We always setup a notify callback even if we're running on localhost
// 		// this is mainly for testing

// 		Router.route(config.route, {where: 'server', path: '/' + config.route, action: function () {
// 			Mailgun.processEmail(this.request.body["message-url"]);
// 			this.response.statusCode = 200;
// 			this.response.end('recieved\n');
// 		}});

// 		Mailgun.processQueue();

// 	}
// 	, processEmail: function (callbackUrl) {
// 		console.log('processing', callbackUrl);
// 		var incomingId = callbackUrl.match(/messages\/(.*)$/)[1]
// 			, id;

// 		try {
// 			if (Emails._collection && Emails._collection.findOne({
// 				incomingId: incomingId
// 			})) {
// 				return;
// 			}

// 			// By inserting the email as a draft we lock this incomingId for
// 			// processing, any other node which tries to process the same email
// 			// will fall afoul of the unique index on incomingId (or will stop
// 			// after the check above)

		
// 			// If this throws a mongo index collision error we can assume
// 			// another node is processing this email, and we can safely stop
// 			// processing this email.
// 			id = Emails.config.queue && Emails.send({
// 				draft: true
// 				, incomingId: incomingId
// 			});

// 			// If this throws a 404 error we can assume this message has already
// 			// been processed. This shouldn't happen if Emails.config.persist is
// 			// true, but would happen if we reset the db. If this happends we
// 			// can safely stop processing this email.
// 			var result = HTTP.get(callbackUrl, {
// 				auth: Mailgun.config.auth
// 			});

// 			var message = result.data;

// 			var email = {
// 				subject: message.subject
// 				, from: message.sender
// 				, to: message.recipients || message.recipient
// 				, text: message["body-plain"]
// 				, html: message["body-html"]
// 				// stripped-text is a mailgun provided field which returns the:
// 				// 'text version of the message without quoted parts and signature 
// 				// block (if found).'
// 				, message: message["stripped-text"]
// 				, incomingId: incomingId
// 				, mailgunId: message["Message-Id"]
// 			};

// 			if (id) {
// 				email._id = id;
// 				email.draft = false;
// 			}

// 			Emails.receive(email);

// 			// deleting the message ensures it won't be sent twice, even if we
// 			// process emails on two different servers.
// 			// (it's still possible to write code which will process these
// 			//	emails twice if they don't share the same db.)
// 			HTTP.del(callbackUrl, {
// 				auth: Mailgun.config.auth
// 			});

// 		} catch (e) {

// 			// We remove the draft email from the collection - if the emails
// 			// package rejected the email it won't be marked as a draft anymore
// 			// and can safely be left in the collection
// 			if (id && Emails._collection && Emails._collection.findOne({
// 				_id: id
// 				// only delete drafts, if the email was invalid, it will have
// 				// been 'rejected' by the email system and should be kept for
// 				// logging purposes and to prevent it being retried.
// 				, draft: {
// 					$exists: true
// 				}
// 			})) {
// 				Emails._collection.remove(id);
// 			}

// 			// XXX the following error types should not be retried (we should
// 			// leave the email record in the collection)
// 			//  - mailgun 404 message not found (indicates message has been
// 			//	sent, we still need to throw an error, sent messages aren't
// 			//	supposed to be caught this way)
// 			//	- Mongo index collision (indicates message is being processed on
// 			//	another node, we shouldn't throw an error if this happens)


// 			// Better stack trace handling:
// 			Meteor.setTimeout(function () {
// 				throw e;
// 			});
// 		}
// 	}
// 	, processQueue: function (queryPeriod) {
// 		// XXX query the db to limit how many hours back we search for messages
// 		// right now we look back 3 days which is the length of time mailgun
// 		// will store a message, so we're pretty much gaurenteed not to miss
// 		// a message, but we'll over process every time the server starts up
// 		// (hopefully not very often.)
// 		var pageUrl = "https://api.mailgun.net/v2/" + Mailgun.config.domain + '/events';
// 		queryPeriod = queryPeriod || 1000 * 60 * 60 * 72;
// 		while (true) {
// 			var response =  HTTP.get(pageUrl, {
// 				auth: Mailgun.config.auth
// 				, params: {
// 					event: 'stored'
// 					, begin: (new Date(new Date().valueOf() - queryPeriod)).toGMTString()
// 					, end: new Date().toGMTString()
// 					, limit: 100
// 				}
// 			});

// 			var queue = response.data.items;

// 			_.each(queue, function (message) {
// 				Mailgun.processEmail(message.storage.url);
// 			});

// 			if (
// 				// already processed the next page
// 				response.data.paging.next == pageUrl ||
// 				// last page / only one page
// 				queue.length < 100
// 				) break;
// 			else pageUrl = response.data.paging.next;
// 		}

// 	}
// 	// this function is the default reject function and should be replaced
// 	// with a customized function which uses an admin user as the fromId
// 	// and goes through the Emails.send method.
// 	, reject: function (email) {
// 		// if you can't figure out what code is rejecting an email, just
// 		// uncomment this code below:
// 		// var error = new Error('rejected email:' + email.subject);
// 		// Meteor.setTimeout(function () {
// 		// 	throw error;
// 		// });

// 		// it might be a good idea to prevent an email from being rejected more
// 		// than once:
// 			// if (email._id) {
// 			// 	var dbVersion = Emails._collection.findOne(email._id);
// 			// 	if (dbVersion.bounced) return;
// 			// 	Emails._collection.update(email._id, {
// 			// 		$set: {
// 			// 			bounced: true
// 			// 		}
// 			// 	});
// 			// }
// 		Mailgun.send({
// 			from: 'noreply@' + Mailgun.config.domain
// 			, to: email.from
// 			, subject: 'Message delivery failed: ' + email.subject
// 			, text: [
// 				'Your email could not be delivered, '
// 				, 'check that you are a user on our site, '
// 				, 'that the address you are sending to is valid, '
// 				, 'and that your message included both a subject and body.'
// 				, ' \n\nFor further information please contact support on our website,'
// 				, ' you can refer to the following details: '
// 				, '\nemailId: ', email._id
// 				, '\nmessageId: ', email.mailgunId
// 				].join('')

// 		});
// 	}
// 	, send: function (email, updates) {
// 		var emailToSend = _.pick(email
// 			, 'from'
// 			, 'to'
// 			, 'cc'
// 			, 'bcc'
// 			, 'subject'
// 			, 'text'
// 			, 'html'
// 			, 'attachement'
// 			, 'inline'
// 			);

// 		var result = HTTP.post(
// 			"https://api.mailgun.net/v2/" + Mailgun.config.domain + "/messages"
// 			, {
// 				auth: Mailgun.config.auth
// 				, params: emailToSend
// 			}
// 			);

// 		// The emails package will save any keys on the updates object
// 		// to the database.
// 		if (result.data.id && updates) updates.outgoingId = result.data.id;
// 	}
// };

// Meteor.startup(function () {
// 	if (Meteor.settings && Meteor.settings.mailgun) {
// 		Mailgun.init(Meteor.settings.mailgun);
// 	}
// });