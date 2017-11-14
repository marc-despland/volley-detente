'use strict';
var database = require('modules/database');
var utils = require('modules/common');
const crypto = require('crypto');
var session = require('controllers/session');

module.exports = {
	createUser:createUser,
	listUsers:listUsers,
	getUser:getUser,
	updateUser:updateUser,
	deleteUser:deleteUser,
	getUserMe:getUserMe,
	updateUserMe:updateUserMe
};



function createUser(req, res) {
	database.connect()
	.then(function(db) {
		session.checkSessionUserIsAdmin(db, utils.ADMINKEY, req.swagger.params.session.value).then(function(isAdmin) {
			if (!isAdmin) {
				console.log("Not an admin");
				res.statusCode=403;
				var message={'code': 403, 'message': 'You are not allowed to execute this request'};
				res.json(message);
			} else {
				var user={};
				user.login=req.body.login;
				db.collection('users').count({"login": user.login}).then(function(count){
					if (count==0) {
						//No user exists with this login
						if (req.body.firstname!==undefined) user.firstname=req.body.firstname;
						if (req.body.lastname!==undefined) user.lastname=req.body.lastname;
						if (req.body.email!==undefined) user.email=req.body.email;
						if (req.body.phone!==undefined) user.phone=req.body.phone;
						if (req.body.licence!==undefined) user.licence=req.body.licence;
						if (req.body.match!==undefined) user.match=req.body.match;
						if (req.body.admin!==undefined) user.admin=req.body.admin;
						if (req.body.password!==undefined) user.password=utils.passwd(req.body.password);

						db.collection('users').insertOne(user)
						.then(function(result) {
							db.close();
							res.statusCode=201;
							res.contentType("application/json");
							console.log('saved to database');
							res.end();
						})
						.catch(function(err) {
							db.close();
							console.log(err);
							res.statusCode=500;
							var message={'code': 500, 'message': err};
							res.json(message);
						});

					} else {
						res.statusCode=500;
						var message={'code': 500, 'message': 'login already exists'};
						res.json(message);
					}
				}, function(error) {
					db.close();
					console.log("Failed to count users with login "+user.login);
					console.log(err);
					res.statusCode=500;
					var message={'code': 500, 'message': 'Internal error'};
					res.json(message);
				});
			}
		})
		.catch(function(err) {
			console.log(err);
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


function listUsers(req, res) {
	database.connect()
	.then(function(db) {
		session.checkSession(db, req.swagger.params.session.value).then(function(currentLogin) {
			var result=new Array();
			db.collection('users').find().forEach(function(user) {
				delete user._id;
				delete user.id;
				delete user.password
				result.push(user);
				console.log("Adding an user : "+ user.userid);
			}, function(error) {
				console.log("End of forEach");
				db.close();
				console.log(JSON.stringify(result));
				res.statusCode=200;
				res.json(result);
			});
		})
		.catch(function(err) {
			console.log(err);
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

function getUser(req, res) {
	database.connect()
	.then(function(db) {
		session.checkSession(db, req.swagger.params.session.value).then(function(login) {
			db.collection('users').findOne({"login": req.swagger.params.userid.value}).then(function(user) {
				if ((user===null) || (user === undefined)) {
					res.statusCode=404;
					var message={'code': 404, 'message': 'User not found'};
					res.json(message);
				} else {
					delete user._id;
					delete user.password;
					db.close();
					console.log(JSON.stringify(user));
					res.statusCode=200;
					res.json(user);
				}
			}).catch(function(err) {
				console.log(err);
				res.statusCode=500;
				var message={'code': 500, 'message': 'We have a database issue'};
				res.json(message);
			});

		})
		.catch(function(err) {
			console.log(err);
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

function getUserMe(req, res) {
	database.connect()
	.then(function(db) {
		session.checkSession(db, req.swagger.params.session.value).then(function(login) {
			console.log("Session : "+req.swagger.params.session.value+"  -  Login: "+login);
			db.collection('users').findOne({"login": login}).then(function(user) {
				if ((user===null) || (user === undefined)) {
					res.statusCode=404;
					var message={'code': 404, 'message': 'User not found'};
					res.json(message);
				} else {
					delete user._id;
					delete user.password;
					db.close();
					console.log(JSON.stringify(user));
					res.statusCode=200;
					res.json(user);
				}
			}).catch(function(err) {
				console.log(err);
				res.statusCode=500;
				var message={'code': 500, 'message': 'We have a database issue'};
				res.json(message);
			});
		})
		.catch(function(err) {
			console.log(err);
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

function deleteUser(req, res) {
	if (req.swagger.params.AdminKey.value===utils.ADMINKEY) {
		database.connect()
		.then(function(db) {
			db.collection('users').deleteMany({"login": req.swagger.params.userid.value}).then(function() {
				db.close();
				res.statusCode=200;
				res.contentType("application/json");
				res.end();
			}).catch(function(err) {
				console.log(err);
				res.statusCode=500;
				var message={'code': 500, 'message': 'We have a database issue'};
				res.json(message);
			});
		})
		.catch(function(err) {
			console.log(err);
			res.statusCode=500;
			var message={'code': 500, 'message': 'We have a database issue'};
			res.json(message);
		});
	} else {
			res.statusCode=403;
			var message={'code': 403, 'message': 'You are not allowed to execute this request'};
			res.json(message);		
	}

}

function updateUser(req, res) {
	database.connect()
	.then(function(db) {
		session.checkSessionUserIsAdmin(db, req.swagger.params.session.value).then(function(isAdmin) {
			if (!isAdmin) {
				console.log("Not an admin");
				res.statusCode=403;
				var message={'code': 403, 'message': 'You are not allowed to execute this request'};
				res.json(message);
			} else {
				var user={};
				if (req.body.firstname!==undefined) user.firstname=req.body.firstname;
				if (req.body.lastname!==undefined) user.lastname=req.body.lastname;
				if (req.body.email!==undefined) user.email=req.body.email;
				if (req.body.phone!==undefined) user.phone=req.body.phone;
				if (req.body.licence!==undefined) user.licence=req.body.licence;
				if (req.body.match!==undefined) user.match=req.body.match;
				if (req.body.admin!==undefined) user.admin=req.body.admin;
				if (req.body.password!==undefined) user.password=utils.passwd(req.body.password);
				db.collection('users').findAndModify({"login": req.swagger.params.userid.value},{},{$set: user}).then(function(result){
					db.collection('users').findOne({"login": req.swagger.params.userid.value}).then(function(user) {
						if ((user===null) || (user === undefined)) {
							res.statusCode=404;
							var message={'code': 404, 'message': 'User not found'};
							res.json(message);
						} else {
							delete user._id;
							delete user.password;
							db.close();
							console.log(JSON.stringify(user));
							res.statusCode=200;
							res.json(user);
						}
					}).catch(function(err) {
						console.log(err);
						res.statusCode=500;
						var message={'code': 500, 'message': 'We have a database issue'};
						res.json(message);
					});
				}).catch(function(err) {
					console.log(err);
					res.statusCode=500;
					var message={'code': 500, 'message': 'We have a database issue'};
					res.json(message);
				});
			}
		}).catch(function(err) {
			console.log(err);
			res.statusCode=403;
			var message={'code': 403, 'message': 'You are not allowed to execute this request'};
			res.json(message);
		});
	}).catch(function(err) {
		console.log(err);
		res.statusCode=500;
		var message={'code': 500, 'message': 'We have a database issue'};
		res.json(message);
	});
}

function updateUserMe(req, res) {
	database.connect()
	.then(function(db) {
		session.checkSession(db, req.swagger.params.session.value).then(function(login) {
			console.log("Session : "+req.swagger.params.session.value+"  -  Login: "+login);
			var user={};
			if (req.body.firstname!==undefined) user.firstname=req.body.firstname;
			if (req.body.lastname!==undefined) user.lastname=req.body.lastname;
			if (req.body.email!==undefined) user.email=req.body.email;
			if (req.body.phone!==undefined) user.phone=req.body.phone;
			if (req.body.licence!==undefined) user.licence=req.body.licence;
			if (req.body.match!==undefined) user.match=req.body.match;
			if (req.body.password!==undefined) user.password=utils.passwd(req.body.password);
			db.collection('users').findAndModify({"login": login},{},{$set: user}).then(function(result){
				db.collection('users').findOne({"login": login}).then(function(user) {
					if ((user===null) || (user === undefined)) {
						res.statusCode=404;
						var message={'code': 404, 'message': 'User not found'};
						res.json(message);
					} else {
						delete user._id;
						delete user.password;
						db.close();
						console.log(JSON.stringify(user));
						res.statusCode=200;
						res.json(user);
					}
				}).catch(function(err) {
					console.log(err);
					res.statusCode=500;
					var message={'code': 500, 'message': 'We have a database issue'};
					res.json(message);
				});
			}).catch(function(err) {
				console.log(err);
				res.statusCode=500;
				var message={'code': 500, 'message': 'We have a database issue'};
				res.json(message);
			});
		}).catch(function(err) {
			console.log(err);
			res.statusCode=403;
			var message={'code': 403, 'message': 'You are not allowed to execute this request'};
			res.json(message);
		});
	}).catch(function(err) {
		console.log(err);
		res.statusCode=500;
		var message={'code': 500, 'message': 'We have a database issue'};
		res.json(message);
	});

}
