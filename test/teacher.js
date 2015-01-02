/**
 * Created by Jordan on 25/11/14.
 */

var expect      = require('chai').expect,
    request     = require('request'),
    winston     = require('winston'),
    parameters  = require('../parameters');

//require('blanket')({
//    pattern: function (filename) {
//        return /routes/.test(filename) && !/routes\/index/.test(filename);
//    }
//});

process.env.PORT = 4545;
process.env.WINSTON_LVL = winston.level = 'no';
process.env.MONGO_DB = 'mongodb://localhost/mocha';
process.env.FLUSH_DB = true;
process.env.NODE_ENV = 'mocha-dg';

// Launch the app
require('../app');

var host    = 'http://localhost:' + parameters.server.port;
var route   = '/teacher';

/*
describe('Teacher', function () {


    describe('Register', function () {

        var newTeacher = {
            login: 'john@gmail.com',
            password: '123123'
        };

        var url = host + route + '/';

        after(function (done) {
            request.del({
                url: url,
                auth: {
                    user: newTeacher.login,
                    pass: newTeacher.password
                }
            }, function (err, response, body) {
                done();
            });
        });

        it('should throw an error since login and passwords are missing.', function (done) {
            request.post({
                url: url,
                json: true
            }, function (err, response, body) {
                expect(response.statusCode).to.equal(400);
                done();
            });
        });

        it('should throw an error since password is missing.', function (done) {
            request.post({
                url: url,
                json: true,
                body: {
                    login: newTeacher.login
                }
            }, function (err, response, body) {
                expect(response.statusCode).to.equal(400);
                done();
            });
        });

        it('should throw an error since login is missing.', function (done) {
            request.post({
                url: url,
                body: {
                    password: newTeacher.password
                },
                json: true
            }, function (err, response, body) {
                expect(response.statusCode).to.equal(400);
                done();
            });
        });

        it('should register a new user', function (done) {
            request.post({
                url: url,
                body: {
                    login: newTeacher.login,
                    password: newTeacher.password
                },
                json: true
            }, function (err, response, body) {
                expect(response.statusCode).to.equal(200);
                done();
            });
        });

        it('should throw an error since the login already exist.', function (done) {
            request.post({
                url: url,
                body: {
                    login: newTeacher.login,
                    password: newTeacher.password
                },
                json: true
            }, function (err, response, body) {
                expect(response.statusCode).to.equal(409);
                done();
            });
        });

    });

    describe('Delete', function () {
        var url = host + route + '/';

        var newTeacher = {
            login: 'john@gmail.com',
            password: '123123'
        };

        before(function (done) {
            request.post({
                url: url,
                body: newTeacher,
                json: true
            }, function () {
                done();
            })
        });

        it('should delete the account', function (done) {
            request.del({
                url: url,
                auth: {
                    user: newTeacher.login,
                    pass: newTeacher.password
                },
                json: true
            }, function (err, res, body) {
                expect(res.statusCode).to.equal(200);
                done();
            });
        });

    });

    describe('Login', function () {

        var url = host + route + '/token';
        var newTeacher = {
            login: 'john@gmail.com',
            password: '123123'
        };

        before(function (done) {
            request.post({
                url: host + route + '/',
                body: newTeacher,
                json: true
            }, function () {
                done();
            });
        });

        after(function (done) {
            request.del({
                url: host + route + '/',
                auth: {
                    user: newTeacher.login,
                    pass: newTeacher.password
                }
            }, function () {
                done();
            })
        });

        it('should throw an error since the connections info are missing', function (done) {
            request.get({
                url: url,
                json: true
            }, function (err, response, body) {
                expect(response.statusCode).to.equal(401);
                done();
            });
        });

        it('should throw an error since the connections info are wrongs', function (done) {
            request.get({
                url: url,
                json: true,
                auth: {
                    user: 'wrong',
                    pass: 'wrong'
                }
            }, function (err, response, body) {
                expect(response.statusCode).to.equal(401);
                done();
            });
        });

        it('should return a Bearer token', function (done) {
            request.get({
                url: url,
                json: true,
                auth: {
                    user: newTeacher.login,
                    pass: newTeacher.password
                }
            }, function (err, response, body) {
                expect(response.statusCode).to.equal(200);
                console.log(body);
                expect(body.Bearer).to.have.length(32);
                done();
            });
        });

    });

    describe('Course post', function () {

        var bearerToken;
        var url = host + route + '/course';
        var bearerUrl = host + route + '/token';
        var course = {
            name: 'bio',
            code: 'bio'
        };
        var courseId = null;

        var newTeacher = {
            login: 'john@gmail.com',
            password: '123123'
        };

        before(function (done) {
            request.post({
                url: host + route + '/',
                body: newTeacher,
                json: true
            }, function () {
                request.get({
                    url: bearerUrl,
                    json: true,
                    auth: {
                        user: newTeacher.login,
                        pass: newTeacher.password
                    }
                }, function (err, response, body) {
                    bearerToken = body.Bearer;
                    done();
                });
            });
        });

        after(function (done) {
            request.del({
                url: url + '/' + courseId,
                auth: {
                    bearer: bearerToken
                }
            }, function () {
                done();
            })
        });

        it('should throw an error since bearer token is not specified', function (done) {
            request.post({
                url: url,
                json: true
            }, function (err, res, body) {
                expect(res.statusCode).to.equal(401);
                done();
            });
        });

        it('should throw an error since info are not specified', function (done) {
            request.post({
                url: url,
                json: true,
                auth: {
                    bearer: bearerToken
                }
            }, function (err, res, body) {
                expect(res.statusCode).to.equal(400);
                done();
            });
        });

        it('should create a new course', function (done) {
            request.post({
                url: url,
                json: true,
                auth: {
                    bearer: bearerToken
                },
                body: course
            }, function (err, res, body) {
                expect(res.statusCode).to.equal(201);
                expect(body._id).to.have.length(24);
                courseId = body._id;
                done();
            });
        });

        it('should throw an error since a course with the same name already exist', function (done) {
            this.timeout(7000);
            request.post({
                url: url,
                json: true,
                auth: {
                    bearer: bearerToken
                },
                body: course
            }, function (err, res, body) {
                expect(res.statusCode).to.equal(409);
                done();
            });
        });

    });

});
    */