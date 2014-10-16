Package.describe({
  name: 'cwohlman:mailgun-emails',
  summary: 'Send and recieve emails via mailgun',
  version: '1.0.0',
  git: 'git@github.com:cwohlman/meteor-mailgun-emails.git'
});

Package.onUse(function(api) {
  api.versionsFrom('0.9.3');
  
  api.use('cwohlman:emails@0.2.0');
  api.imply('cwohlman:emails');

  api.use('http');
  api.use('sha');
  api.use('iron:router@0.9.3');

  api.addFiles('mailgun-emails.js');

  api.export('Mailgun');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('cwohlman:mailgun-emails');
  api.use('iron:router');
  api.addFiles('mailgun-emails-tests-key.js');
  api.addFiles('mailgun-emails-tests.js');
});
