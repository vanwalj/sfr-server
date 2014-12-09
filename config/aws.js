/**
 * Created by Jordan on 11/28/2014.
 */

var AWS = require('aws-sdk'),
    parameters = require('../parameters');

AWS.config.update({
    accessKeyId: parameters.aws.accessKey,
    secretAccessKey: parameters.aws.secretKey
});