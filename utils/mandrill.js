/**
 * Created by Jordan on 28/12/14.
 */

var mandrill = require('mandrill-api');
var parameters = require('../parameters');
var winston = require('winston');

var mandrillClient = new mandrill.Mandrill(parameters.mandrill.apiKey);

var sender = {
    lostPassword: function (email, name, resetUrl) {
        var templateSlug = "lost-password",
            message = {
                to: [{
                    email: email,
                    name: name,
                    type: "to"
                }],
                merge: true,
                merge_language: "mailchimp",
                merge_vars: [{
                    rcpt: email,
                    vars: [{
                        name: "NAME",
                        content: name
                    },{
                        name: "RESET_URL",
                        content: resetUrl
                    }]
                }]
            };

        mandrillClient.messages.sendTemplate({
            templateSlug: templateSlug,
            message: message
        }, function (res) {
            winston.log('info', 'Reset email send', res);
        }, function (err) {
            winston.error('Reset email sending error', err);
        });
    }
};

module.exports = sender;