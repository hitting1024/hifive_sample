$(function() {
	var h1Controller = {
		__name: "H1Controller",
		"input[type=button] click": function(context) {alert("h1");}
	};
	
	var h2Controller = {
		__name: "H2Controller",
		
		__construct: function() {  
			alert('construct');  
		},  
		__init: function(context) {  
			alert('init');  
		},  
		__ready: function(context) {
			alert('ready: これだけ使えばよさげ');  
		},
		
		"{input[type=button]} click": function(context) {alert("h2");}
	};
	
	h5.core.controller(".div1", h1Controller);
	
	h5.core.controller(".div2", h2Controller);
});