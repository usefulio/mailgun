testAndCleanup = function (testName, testFn) {
  Tinytest.add(testName, function (test) {
    var originalProvider = Emails.routes.provider.action;
    try {
      testFn(test);
    } finally {
      Emails.routes.provider.action = originalProvider;
    }
  });
};

testAndCleanup("Mailgun - send", function (test) {
  Emails.setProvider("mailgun");

  // We'd like to test that the email actually got sent, but unfortunately 
  // mailgun's event api isn't syncronous, so even if we check the api
  // we aren't garunteed to find an event, even if the email was sent.
  Emails.send({
    to: "joe@example.com"
    , from: "sam@example.com"
    , subject: "testing mailgun emails"
    , text: "this is a test"
    , html: "this is a test"
  });
});