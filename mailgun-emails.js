// Write your package code here!
Mailgun = {
	init: function (config) {

		// the http basic authentication header to send with any mailgun api calls
		config.auth = 'api:' + config.api_key;

		// The route where mailgun-emails will listen for notifications
		// we generate this route from the api_key, hasing it first
		// this makes the route more secure, and unlikely that the route will
		// colide with other routes.
		config.route = "_mailgun_" + SHA256(config.api_key).slice(0, 15);
		
		// The absolute path to our callback route
		config.routePath = Meteor.absoluteUrl() + '' + config.route;

		// The mailgun action param - mailgun store our email and notify us if
		// the server is publically accessible
		config.action = config.routePath.match(/localhost|127\.0\.0\.1/) ?
			'store()' :
			'store(notify="' + config.routePath + '")';

		config.priority = _.isNumber(config.priority) ? config.priority : 5;
		
		// The filter for matching emails to catch and forward
		config.expression = "match_recipient(\".*@" + config.domain.replace(/\./g, '\\.') + "\")";

		Mailgun.config = config;

		Emails.config.domain = config.domain;

		Emails.provider = Mailgun;

		console.log('Creating mailgun route.');
		var route = _.find(HTTP.get('https://api.mailgun.net/v2/routes', {
				auth: config.auth
			}).data.items, function (route) {
				return route.expression == config.expression &&
					   route.description == 'meteor_reply_to_route';
			});

		if (route) {
			if (!_.any(route.actions, function (a) {
				return a == config.action;
			})) {
				// delete route since it doesn't match.
				// we don't want two meteor apps forwarding messages
				HTTP.del('https://api.mailgun.net/v2/routes/' + route.id, {
					auth: config.auth
				});
				console.log("Existing mailgun route deleted ", route.id);
				route = undefined;
			} else {
				console.log("Existing mailgun route left in place ", route.id);
			}
		}

		if (!route) {
			var response = HTTP.post('https://api.mailgun.net/v2/routes', {
				auth: config.auth
				, params: {
					description: 'meteor_reply_to_route'
					, expression: config.expression
					, action: config.action
					, priority: config.priority
				}
			});
			console.log("New mailgun route added", response.data.route.id);
		}

		// We always setup a notify callback even if we're running on localhost
		// this is mainly for testing

		Router.route(config.route, {where: 'server', path: '/' + config.route, action: function () {
			Mailgun.processEmail(this.request.body["message-url"]);
			this.response.statusCode = 200;
			this.response.end('recieved\n');
		}});

		Mailgun.processQueue();

	}
	, processEmail: function (callbackUrl) {
		console.log('processing', callbackUrl);
		try {
			var incomingId = callbackUrl.match(/messages\/(.*)$/)[1];

			if (Emails._collection && Emails._collection.findOne({
				incomingId: incomingId
			})) {
				return;
			}
			var result = HTTP.get(callbackUrl, {
				auth: Mailgun.config.auth
			});

			var message = result.data;

			var email = {
				subject: message.subject
				, from: message.sender
				, to: message.recipients || message.recipient
				, text: message["body-plain"]
				, html: message["body-html"]
				// stripped-text is a mailgun provided field which returns the:
				// 'text version of the message without quoted parts and signature 
				// block (if found).'
				, message: message["stripped-text"]
				, incomingId: incomingId
			};

			Emails.receive(email);

			// deleting the message ensures it won't be sent twice, even if we
			// process emails on two different servers.
			// (it's still possible to write code which will process these
			//	emails twice if they don't share the same db.)
			HTTP.del(callbackUrl, {
				auth: Mailgun.config.auth
			});

		} catch (e) {
			console.log(e);
		}
	}
	, processQueue: function () {
		var response = HTTP.get("https://api.mailgun.net/v2/" + Mailgun.config.domain + "/events?event=stored", {
			auth: Mailgun.config.auth
		});
		var queue = response.data.items;

		_.each(queue, function (message) {
			Mailgun.processEmail(message.storage.url);
		});
	}
	, send: function (email, updates) {
		var emailToSend = _.pick(email
			, 'from'
			, 'to'
			, 'cc'
			, 'bcc'
			, 'subject'
			, 'text'
			, 'html'
			, 'attachement'
			, 'inline'
			);

		var result = HTTP.post(
			"https://api.mailgun.net/v2/" + Mailgun.config.domain + "/messages"
			, {
				auth: Mailgun.config.auth
				, params: emailToSend
			}
			);

		// The emails package will save any keys on the updates object
		// to the database.
		updates.outgoingId = result.id;
	}
};

Meteor.startup(function () {
	if (Meteor.settings && Meteor.settings.mailgun) {
		Mailgun.init(Meteor.settings.mailgun);
	}
});