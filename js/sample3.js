$(function() {
	var controller = {
		__name: "NumController",
		__templates: "view/sample3.ejs",
		"#update click": function(context) {
			var num = this.$find("#num").val();
			try {
				num = parseInt(num);
			} catch(e) {return;}
			this.view.append("#output", "list", {num: num});
		}
	};
	
	h5.core.controller("#main", controller);
});