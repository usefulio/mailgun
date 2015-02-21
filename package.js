Package.describe({
  name: 'cwohlman:mailgun-emails',
  summary: 'Send and recieve emails via mailgun',
  version: "1.1.1",
  git: 'git@github.com:cwohlman/meteor-mailgun-emails.git'
});

Package.onUse(function(api) {
  api.versionsFrom('0.9.3');
  
  api.use('cwohlman:emails@0.4.0');
  api.imply('cwohlman:emails');

  api.use('http');

  api.addFiles('mailgun-emails.js');

  api.export('Mailgun');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('http');
  api.use('cwohlman:mailgun-emails');

  api.addFiles('mailgun-emails-tests-key.js');
  api.addFiles('mailgun-emails-tests.js', ["server"]);
});
