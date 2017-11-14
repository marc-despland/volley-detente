'use strict';
var database = require('modules/database');
var crypto = require('crypto');
var utils = require('modules/common');

module.exports = {
	signin:signin,
	signout:signout,
	checkSession:checkSession,
	checkAdminOrSession:checkAdminOrSession,
	checkSessionUserIsAdmin:checkSessionUserIsAdmin
};

function checkpasswd(db,login, password) {
	return new Promise(function(resolve, reject) {
		db.collection('users').findOne({"login": login}).then(function(user) {
			if ((user===null) || (user === undefined)) {
				reject();
			} else {
				if (user.password===utils.passwd(password)) {
					resolve();
				} else {
					reject();
				}
			}
		}).catch(function(err) {
			console.log(err);
			reject();
		});

	});
}


function checkSession(db,sessionid) {
	return new Promise(function(resolve, reject) {
		console.log("checkSession");
		db.collection('sessions').findOne({"session": sessionid}).then(function(session) {
			if ((session===null) || (session === undefined)) {
				reject("Unknown session");
			} else {
				console.log("checkSession found session ");
				var now=new Date();
				session.date=now.toISOString();
				delete session._id;
				console.log(JSON.stringify(session));
				db.collection('sessions').findAndModify({"session": sessionid},{},{$set: session}).then(function(result){
					//console.log(JSON.stringify(result));
					resolve(result.value.login);
				}).catch(function(err){
					console.log("Failed to update session "+err);
					reject(err);
				});
			}
		}).catch(function(err) {
			console.log(err);
			reject(err);
		});

	});
}


function checkSessionUserIsAdmin(db,adminkey,sessionid) {
	return new Promise(function(resolve, reject) {
		if (adminkey===utils.ADMINKEY) {
			resolve(true);
		} else {
			checkSession(db, sessionid).then(function(login) { 
				db.collection('users').findOne({"login": login}).then(function(user) {
					resolve(user.admin);
				}).catch(function(err) {
					console.log(err);
					reject(err);
				});
			}).catch(function(err) {
				console.log(err);
				reject(err);
			});
		}
	});
}

function checkAdminOrSession(db,adminkey, sessionid) {
	return new Promise(function(resolve, reject) {
		if (adminkey===utils.ADMINKEY) {
			resolve();
		} else {
			db.collection('sessions').findOne({"session": sessionid}).then(function(session) {
				if ((session===null) || (session === undefined)) {
					reject("Unknown session");
				} else {
					var now=new Date();
					session.date=now.toISOString();
					delete session._id;
					console.log(JSON.stringify(session));
					db.collection('sessions').findAndModify({"session": sessionid},{},{$set: session}).then(function(result){
						//console.log(JSON.stringify(result));
						resolve();
					}).catch(function(err){
						console.log("Failed to update session "+err);
						reject(err);
					});
				}
			}).catch(function(err) {
				console.log(err);
				reject(err);
			});
		}

	});
}

function createSession(db,login) {
	return new Promise(function(resolve, reject) {
		var now=new Date();
		var session=utils.sha256(now.toISOString()+login+(Math.random()*10000000));
		session=session.replace(/\//g,"E");
		session=session.replace(/\+/g,"K");
		session=session.replace(/=/g,"i");
		session=session.replace(/-/g,"a");
		session=session.replace(/_/g,"O");
		console.log("Generated session : "+ session)
		db.collection('sessions').count({"session": session}).then(function(count){
			if (count==0) {
				resolve(session);
			} else {
				createSession(db,login).then(function(session) {
					resolve(session);
				}).catch( function(err) {
					reject(err);
				});
			}
		}, function(error) {
			console.log("Failed to count session with "+session);
			reject(error);
		});
	});
}

function signin(req, res) {
	database.connect().then(function(db) {
		checkpasswd(db, req.body.login, req.body.password)
		.then(function () {
			db.collection('sessions').deleteMany({"login": req.body.login}).then(function() {
				var session={};
				session.login=req.body.login;
				var now=new Date();
				session.date=now.toISOString();
				createSession(db,session.login).then(function(sessionid) {
					session.session=sessionid;
					db.collection('sessions').insertOne(session)
					.then(function(result) {
						db.close();
						res.statusCode=200;
						res.contentType("application/json");
						result={};
						result.session=sessionid;
						res.json(result);
					})
					.catch(function(err) {
						db.close();
						console.log(err);
						res.statusCode=500;
						var message={'code': 500, 'message': err};
						res.json(message);
					});
				}).catch(function(err) {
					console.log(err);
					db.close();
					res.statusCode=500;
					var message={'code': 500, 'message': 'Internal error'};
					res.json(message);
				});

			}).catch(function(err) {
				console.log(err);
				db.close();
				res.statusCode=500;
				var message={'code': 500, 'message': 'We have a database issue'};
				res.json(message);
			});

		})
		.catch(function() {
			res.statusCode=403;
			var message={'code': 403, 'message': 'You are not allowed to execute this request'};
			res.json(message);		
		});
	})
	.catch(function(err) {
		console.log(err);
		res.statusCode=500;
		var message={'code': 500, 'message': 'We have a database issue'};
		res.json(message);
	});
}


function signout(req, res) {
	database.connect()
	.then(function(db) {
		var result=new Array();
		db.collection('sessions').deleteMany({"session": req.swagger.params.session.value}).then(function() {
			db.close();
			res.statusCode=200;
			res.contentType("application/json");
			res.end();
		}, function(error) {
			console.log("Failed to delete session");
			db.close();
			console.log(JSON.stringify(result));
			res.statusCode=500;
			var message={'code': 500, 'message': 'Failed to delete session'};
			res.json(message);
		});
	})
	.catch(function(err) {
		console.log(err);
		res.statusCode=500;
		var message={'code': 500, 'message': 'We have a database issue'};
		res.json(message);
	});
}
