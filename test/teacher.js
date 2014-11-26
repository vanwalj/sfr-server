/**
 * Created by Jordan on 25/11/14.
 */

var expect      = require('chai').expect,
    request     = require('request'),
    winston     = require('winston'),
    parameters  = require('../parameters');

process.env.PORT = 4545;
process.env.WINSTON_LVL = winston.level = 'no';
process.env.MONGO_DB = 'mongodb://localhost/mocha';
process.env.FLUSH_DB = true;

// Launch the app
require('../app');

var host = 'http://localhost:' + parameters.server.port;

describe('User', function () {

    var newTeacher = {
        login: 'john@gmail.com',
        password: '123123'
    };

    describe('Register', function () {

        it('should throw an error since login and passwords are missing.', function (done) {
            request.post(host + '/teacher/register', function (err, response, body) {
                console.log(err);
                expect(response.statusCode).to.equal(400);
                expect(JSON.parse(body).clientError).to.equal('Missing login or password.');
                done();
            });
        });

        it('should throw an error since login is missing.', function (done) {
            request.post({
                url: host + '/teacher/register',
                form: {
                    login: newTeacher.login
                }
            }, function (err, response, body) {
                expect(response.statusCode).to.equal(400);
                expect(JSON.parse(body).clientError).to.equal('Missing login or password.');
                done();
            });
        });

        it('should throw an error since password is missing.', function (done) {
            request.post({
                url: host + '/teacher/register',
                form: {
                    password: newTeacher.password
                }
            }, function (err, response, body) {
                expect(response.statusCode).to.equal(400);
                expect(JSON.parse(body).clientError).to.equal('Missing login or password.');
                done();
            });
        });

        it('should register a new user', function (done) {
            request.post({
                url: host + '/teacher/register',
                form: {
                    login: newTeacher.login,
                    password: newTeacher.password
                }
            }, function (err, response, body) {
                expect(response.statusCode).to.equal(200);
                expect(JSON.parse(body).success).to.equal('OK');
                done();
            });
        });

        it('should throw an error since the login already exist.', function (done) {
            request.post({
                url: host + '/teacher/register',
                form: {
                    login: newTeacher.login,
                    password: newTeacher.password
                }
            }, function (err, response, body) {
                expect(response.statusCode).to.equal(409);
                expect(JSON.parse(body).clientError).to.equal('Login already exist.');
                done();
            });
        });

    });
});