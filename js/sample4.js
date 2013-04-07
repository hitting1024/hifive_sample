$(function() {
	function DateLogic() {};
	DateLogic.prototype = {
		__name: "DateLogic",
		dateFormat: "{0}年{1}月{2}日",
		// public
		getCurrent: function(time) {
			var year = time.getYear();
			var month = time.getMonth() + 1;
			var date = time.getDate();
			return this._format(year, month, date);
		},
		// private "_"で始まる
		_format: function(year, month, date) {
			return h5.u.str.format(this.dateFormat, year, month, date);
		}
	};

	var controller = {
		__name: "DateController",
		dateLogic: new DateLogic(),
		__ready: function(context) {
			var date = this.dateLogic.getCurrent(new Date());
			this.$find("#date p").text(date);
		}
	};
	
	h5.core.controller("#main", controller);
});