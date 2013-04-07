$(function() {
	var memberController = {
		__name: "MemberController",
		memberLogic: new MemberLogic(),
		
		"#regist_form submit": function(context) {
			context.event.preventDefault();
			var name = $("#name").val();
			var location = $("#location").val();
			
			this.memberLogic.regist(name, location).done(function() {
				alert("success");
			}).fail(function(errMsg) {
				alert(errMsg);
			});
		}
	};
	
	h5.core.controller("#main", memberController);
});