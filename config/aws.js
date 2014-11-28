/**
 * Created by Jordan on 11/28/2014.
 */

var aws = require('aws-sdk'),
    parameters = require('../parameters');

aws.config.update({
    accessKeyId: parameters.aws.accessKey,
    secretAccessKey: parameters.aws.secretKey
});