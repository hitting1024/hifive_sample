$(function() {
	function ItemSearchLogic() {};
	ItemSearchLogic.prototype = {
		__name: "ItemSearchLogic",
		
		getItemList: function(categoryId) {
			var dfd = this.deferred();
			
			this._getItemData(categoryId).done(function(data) {
				result = $.map(data, function(obj) {
					obj.price = Math.floor(obj.price * 1.05);
					return obj
				})
				dfd.resolve(result);
			}).fail(function(error) {
				dfd.reject(error.message);
			});
			
			return dfd.promise();
		},
		
		_getItemData: function(categoryId) {
			return $.ajax({
				type: "GET",
				dataType: "json",
				url: "../json/item.json",
				data: "categoryId="+categoryId
			});
		}
	};

	var itemController = {
		__name: "ItemController",
		__templates: "view/sample5.ejs",
		itemSearchLogic: new ItemSearchLogic(),

		"#search click": function(context) {
			var resultDiv = this.$find("#result");
			var that = this;
			// 初期化
			resultDiv.empty();
			var category = $("#catetgory option:selected").val();
			this.itemSearchLogic.getItemList(category).done(function(resultData) {
				that.view.append(resultDiv, "list", {list: resultData});
			}).fail(function(errMsg) {
				alert(errMsg);
			});
		}
	};
	
	h5.core.controller("#main", itemController);
});