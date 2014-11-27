/**
 * Created by Jordan on 25/11/14.
 */

var winston = require('winston'),
    Slack   = require('winston-slack-pls').Slack;

winston.setLevels(winston.config.npm.levels);

if (process.env.NODE_ENV == "production") {
    winston.add(Slack, {
        apiToken: "xoxp-3090809371-3090809375-3102462589-741246",
        channel: "C0331UB2C"
    });
}

//Add more logger