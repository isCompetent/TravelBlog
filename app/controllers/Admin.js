var BaseController = require("./Base"),
	View = require("../views/Base"),
	model = new (require("../models/ContentModel")),
	crypto = require("crypto"),
	fs = require("fs");
var self;

var TYPES = ["blog", "about", "contacts"];
var TYPES_WITH_HOME = ["blog", "about", "contacts", 'home'];

module.exports = BaseController.extend({ 
	name: "Admin",
	username: "admin",
	password: "admin",
	run: function(req, res, next) {
		self = this;
		if(this.authorize(req)) {
			model.setDB(req.db);
			req.session.fastdelivery = true;
			req.session.save();
			var v = new View(res, 'admin');
			self.del(req, function() {
				self.form(req, res, function(formMarkup) {
					self.list(function(listMarkup) {
						v.render({
							title: 'Administration',
							content: 'welcome to the control panel',
							list: listMarkup,
							form: formMarkup
						});
					});
				});
			});
		} else {
			var v = new View(res, 'admin-login');
			v.render({
				title: 'Please login'
			});
		}		
	},
	authorize: function(req) {
		return (
			req.session && 
			req.session.fastdelivery && 
			req.session.fastdelivery === true
		) || (
			req.body && 
			req.body.username === this.username && 
			req.body.password === this.password
		);
	},
	list: function(callback) {
		model.getlist(function(err, records) {
			var markup = '<table>';
			markup += '\
				<tr>\
					<td><strong>type</strong></td>\
					<td><strong>title</strong></td>\
					<td><strong>picture</strong></td>\
					<td><strong>delete</strong></td>\
					<td><strong>edit</strong></td>\
				</tr>\
			';
			for(var i=0; record = records[i]; i++) {
				markup += '\
				<tr>\
					<td>' + record.type + '</td>\
					<td>' + record.title + '</td>\
					<td><img class="list-picture" src="' + record.picture + '" /></td>\
					<td><a href="/admin?action=delete&id=' + record.ID + '">&#10006;</a>&nbsp;&nbsp;</td>\
					<td><a href="/admin?action=edit&id=' + record.ID + '">&#9997;</a></td>\
				</tr>\
			';
			}
			markup += '</table>';
			callback(markup);
		})
	},
	form: function(req, res, callback) {
		var returnTheForm = function() {
			if(req.query && req.query.action === "edit" && req.query.id) {
				self.checkForHomeAndRetrieve(function(types, err, records) {
					if(records.length > 0) {
						var record = records[0];
						res.render('admin-record', {
							ID: record.ID,
							text: record.text,
							title: record.title,
							type: record.type,
							picture: record.picture,
							pictureTag: record.picture != '' ? '<img class="list-picture" src="' + record.picture + '" />' : '',
							types: self.getTypes(types, record.type)
						}, function(err, html) {
							callback(html);
						});
					} else {
						res.render('admin-record', {types:self.getTypes(types)}, function(err, html) {
							callback(html);
						});
					}
				}, {ID: req.query.id});
			} else {
			  self.checkForHomeAndRetrieve(function(types, err, records){
			    res.render('admin-record', {types:self.getTypes(types)}, function(err, html) {
				callback(html);
			    });
			  });
			}
		}
		if(req.body && req.body.formsubmitted && req.body.formsubmitted === 'yes') {
			var data = {
				title: req.body.title,
				text: req.body.text,
				type: req.body.type,
				picture: this.handleFileUpload(req),
				ID: req.body.ID
			}
			model[req.body.ID != '' ? 'update' : 'insert'](data, function(err, objects) {
				returnTheForm();
			});
		} else {
			returnTheForm();
		}
	},
	checkForHomeAndRetrieve: function(callback, query) {
	  var homeIsPresent = false;
	  model.getlist(function(err, records) {
	      var isHomePresent = records && records.length > 0;
	      model.getlist(function(err, records) {
	        var types = isHomePresent? TYPES: TYPES_WITH_HOME;
	        if (records && records.length == 1 && records[0].type === 'home') {
	            // in this case we try to edit the home page
	            // so we need to include this type
	            console.log(TYPES_WITH_HOME);
	            types = TYPES_WITH_HOME;
	        }
	        callback(types, err, records);
	      }, query);
	  }, {type:'home'});
	},
	
	del: function(req, callback) {
		if(req.query && req.query.action === "delete" && req.query.id) {
			model.remove(req.query.id, callback);
		} else {
			callback();
		}
	},
	handleFileUpload: function(req) {
		if(!req.files || !req.files.picture || !req.files.picture.name) {
			return req.body.currentPicture || '';
		}
		var data = fs.readFileSync(req.files.picture.path);
		var fileName = req.files.picture.name;
		var uid = crypto.randomBytes(10).toString('hex');
		var dir = __dirname + "/../public/uploads/" + uid;
		fs.mkdirSync(dir, '0777');
		fs.writeFileSync(dir + "/" + fileName, data);
		return '/uploads/' + uid + "/" + fileName;
	},
	getTypes: function(types, type) {
        var typesAsHtml = [];
        console.log(types);
        for (var i = 0; i < types.length; i++) {
            var currentType = types[i];
            if (currentType === type) {
                typesAsHtml.push('<option selected value="' + currentType + '">' + currentType + '</option>');
            } else {
                typesAsHtml.push('<option value="' + currentType + '">' + currentType + '</option>')
            }
        }

            console.log(typesAsHtml);
            return typesAsHtml;
    }
});