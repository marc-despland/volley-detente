'use strict';
var util = require('util');
var database = require('modules/database');
const crypto = require('crypto');

//Be careful, if you change the password key, the existing user password will become invalid
var PASSWORD_KEY=process.env.PASSWORD_KEY || "258fea80f3331b0";


module.exports = {
	signin:signin,
	signout:signout,
	checksession:checksession,
	passwd:passwd
};

function sha256(source) {
	var hash = crypto.createHash('sha256');
	hash.update(source);
	return (hash.digest('base64'));
}

function passwd(source) {
	return (sha256(source+PASSWORD_KEY));
}
