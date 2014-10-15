Package.describe({
  name: 'mailgun-emails',
  summary: ' /* Fill me in! */ ',
  version: '1.0.0',
  git: ' /* Fill me in! */ '
});

Package.onUse(function(api) {
  api.versionsFrom('0.9.3');
  
  api.use('cwohlman:emails');
  api.use('http');
  api.use('sha');
  api.use('iron:router');

  api.addFiles('mailgun-emails.js');

  api.export('Mailgun');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('mailgun-emails');
  api.use('iron:router');
  api.addFiles('mailgun-emails-tests-key.js');
  api.addFiles('mailgun-emails-tests.js');
});
