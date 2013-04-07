function MemberLogic() {};

MemberLogic.prototype = {
	__name: "MemberLogic",
	
	regist: function(name, location) {
		var dfd = this.deferred();
		this._regist(name, location).done(function() {
			dfd.resolve();
		}).fail(function(error) {
			dfd.reject(error.message);
		});
		
		return dfd.promise();
	},
	
	_regist: function(name, location) {
		return $.ajax({
			type: "POST",
			data: {
				"name": name,
				"location": location
			},
			url: "../php/register.php"
		});
	}
};
