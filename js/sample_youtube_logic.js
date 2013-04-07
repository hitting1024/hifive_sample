function VideoLogic() {};

VideoLogic.prototype = {			
	__name: "VideoLogic",
	search: function(keyword, offset, max) {
		return h5.ajax({
			dataType: "jsonp", // jsonpとは
			data: {
				"vq": keyword,
				"max-results": max,
				"alt": "json-in-script",
				"start-index": offset
			},
			cache: true,
			url: "http://gdata.youtube.com/feeds/api/videos"
		});
	}
};
