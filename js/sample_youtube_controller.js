$(function() {
	var listController = {
		__name: "ListController",
		delay: 500,
		timer: null,
		"{document} [scroll]": function(context) {
			if(this.timer) {
				clearTimeout(this.timer);
			}
			this.timer = setTimeout(this.own(this.addPlayer), this.delay);
		},
	
		addPlayer: function() {
			var $players = $("div.video-frame:not(div.videoLoaded)");
			if(!$players.length) return;
			var that = this;
			
			$players.each(function() {
				var videoFrame = this;
				if(h5.ui.isInView(videoFrame)) {
					var $target = $(videoFrame);
					var $videoSrc = $target.find("input.videoSrc");
					if(!$videoSrc.length) return;
					that.view.update(videoFrame, "player", {
						player: $videoSrc.val()
					});
					$target.addClass("videoLoaded");
				}
			});
		}
	};
	
	var youtubeController = {
		__name: "YoutubeController",
		__templates: "view/sample_youtube.ejs",
		listController: listController,
		videoLogic: new VideoLogic(),
		maxResults: 6,
		scrollRemain: 50,
		keyword: "",
		offset: 0,
		totalCount: 0,
		searched: false,
		
		"#search submit": function(context) {
			$("#result_num").text(0);
			$("#result").empty();
			context.event.preventDefault();
			
			var keyword = this.$find("#keyword").val();
			if(!keyword || $.trim(keyword).length == 0) return;
			
			this.keyword = keyword;
			this.offset = this.maxResults + 1;
			var promise = this.videoLogic.search(keyword, 1, this.maxResults);
			
			var that = this;
			this.$find("#keyword").blur();
			
			promise.done(function(data) {
				that.totalCount = data.feed.openSearch$totalResults.$t;
				that.$find("#result_num").text(that.totalCount);
				that.view.update("#result", "list", {entry: data.feed.entry});
				
				that.trigger("scroll");
				if(that.totalCount > that.maxResults) {
					that.view.append("#result", "empty_list");
				}
				that.searched = true;
			});
			
			var indicator = this.indicator({
				target: window,
				message: "Searching...",
				promises: promise
			}).show({
				throbber: {
					size: 60
				}
			});
		},
		
		"{document} [scroll]": function(context) {
			if(!this.searched) return;
			
			var target = context.event.target;
			var scrollTop = $(target).scrollTop();
			var scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
			var clientHeight = window.innerHeight;
			var remain = scrollHeight - (scrollTop + clientHeight);
			if (remain > this.scrollRemain) return;
			
			var keyword = this.keyword;
			var offset = this.offset;
			this.offset = offset + this.maxResults;
			var promise = this.videoLogic.search(keyword, offset, this.maxResults);
			
			var that = this;
			promise.done(function(data) {
				that.$find("#result_num").text(data.feed.openSearch$totalResults.$t)
				that.view.append("#result", "list", {entry: data.feed.entry});
				var $emptyList = that.$find("#emptyList");
				if(that.totalCount == that.$find("li.list").length - 1) {
					$emptyList.remove();
				} else {
					that.$find("#result").append($emptyList);
				}
			});
			
			var indicator = this.indicator({
				target: "#emptyList",
				block: false,
				promises: promise
			}).show({
				showRound: false,
				throbber: {
					size: 48
				}
			});
		}
	};
	
	h5.core.controller("#main", youtubeController);
});