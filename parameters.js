/**
 * Created by Jordan on 21/11/14.
 */

module.exports = {
    server: {
        port: process.env.PORT || 7070
    },
    mongodb: {
        host: process.env.MONGOLAB_URI || process.env.MONGO_DB || process.env.TRAVIS_DATABASE_URL || 'mongodb://localhost/sfr'
    },
    aws: {
        accessKey: 'AKIAJ3S2MG2WZW4JYCCQ',
        secretKey: '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',
        s3Bucket: 'subfeed-reloaded'
    }
};