// Copyright (C) 2018 Richard Curtice, aka Cron Stardust. All rights reserved worldwide.

const gWhenPageLoaded = getLocalTime();
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjcm9uc3R2LnJ3Y3Byb2R1Y3Rpb25zLmNvbSIsImF1ZCI6ImNyb25zdHYiLCJzY29wZSI6Ii90aW1lIC9tZXRhZGF0YS95b3V0dWJlIC9tZXRhZGF0YS92aW1lbyIsImlhdCI6MTY0NjcwNzE4Nn0.1ELZm14Ndp3KJn3eRnhzySyrwvTe1-FNhhwlx-LZuPY";

let gPlayerStartPosition = 0;
let gVideoId = "";
let gIsPrim = false;

$(function () {
	var has_error = false;

	var buffer_time = 2; // seconds.  Guesswork.  Depends on ISP, network I/O, and much more that's really hard to typify or even detect.

	gIsPrim = getURLParameter("p");

	var service_id = getURLParameter("s") || "youtube";
	if (
		!(
			service_id == "youtube" ||
			service_id == "vimeo" ||
			service_id == "livestream"
		)
	) {
		$("body").append("<p>Error: service ID incorrect!</p>");
		has_error = true;
	}

	var liveStreamAccountId = "";
	var liveStreamEventId = "";
	if (service_id == "livestream") {
		liveStreamAccountId = getURLParameter("a");
		liveStreamEventId = getURLParameter("e");
	} else {
		// Everything else uses a single video ID.  LiveStream only uses the video ID for VOD playback, which I cannot yet support.
		gVideoId = getURLParameter("v");
		if (!gVideoId) {
			$("body").append("<p>Error: video ID missing!</p>");
			has_error = true;
		}
	}

	var time_started = getURLParameter("t");
	if (time_started) {
		time_started *= 1; // Already passed in as a "UNIX time" in seconds - should have been acquired from the same central time authority that this script uses.
	} else {
		time_started = getRemoteTime();
	}

	gPlayerStartPosition =
		getRemoteTime() -
		time_started +
		(getLocalTime() - gWhenPageLoaded) +
		buffer_time;

	if (has_error) {
		$("#player").remove();
		return;
	}

	if (service_id == "youtube") {
		// Load the YouTube iframe API script.
		var tag = document.createElement("script");
		tag.src = "https://www.youtube.com/iframe_api";
		$("head").append(tag);
	} else if (service_id == "vimeo") {
		// Load the Vimeo Player - the script is already loaded.
		$.ajax(
			"https://api1.cronstv.rwcproductions.com/metadata/vimeo?vid=" + gVideoId,
			{
				dataType: "text",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				success: function ytDataSucess(data) {
					var vid_data = data.split(/[\n=]/);
					var aspect_ratio_h_over_w = 1 * vid_data[3];

					var player = new Vimeo.Player("player", {
						height: 1024 * aspect_ratio_h_over_w,
						width: 1024,
						id: gVideoId,
						background: true,
						portrait: false,
						title: false,
					});

					player
						.setCurrentTime(gPlayerStartPosition)
						.then(function () {
							// seconds = the actual time that the player seeked to
						})
						.catch(function (error) {
							$("body").append(
								"<p>Error loading video: " + error.name + "</p>"
							);
							$("body").append("<p>" + error.message + "</p>");
							$("#player").remove();
						});

					player.on("loaded", function () {
						if (gIsPrim) {
							$("#player")
								.css(
									"transform",
									"translateY(" +
										(1024 - aspect_ratio_h_over_w * 1024) / 2 +
										"px) scale(1," +
										1 / aspect_ratio_h_over_w +
										")"
								)
								.attr("id", "primplayer");
						}
					});

					player.on("ended", function () {
						$("#player, #primplayer").remove();
					});

					$("#player p, #primplayer p").remove();

					console.log(aspect_ratio_h_over_w);
				},
			}
		);
	} else if (service_id == "livestream") {
		// At this time livestream does not have an open API, or any API, that can be used to gather aspect ratio information or duration.
		// Thus this only supports the active live stream embed operation.

		const aspect_ratio_h_over_w = 9 / 16;

		$("#player")
			.addClass("mask")
			.append(
				"<iframe\
	src='https://livestream.com/accounts/" +
					liveStreamAccountId +
					"/events/" +
					liveStreamEventId +
					"/player?width=1024&height=1024&enableInfoAndActivity=false&defaultDrawer=&autoPlay=true&mute=false'\
	width='1024'\
	height='1024'\
	frameborder='0'\
	scrolling='no'\
></iframe>"
			);

		if (gIsPrim) {
			$("#player")
				.css(
					"transform",
					"translateY(" +
						(1024 - aspect_ratio_h_over_w * 1024) / 2 +
						"px) scale(1," +
						1 / aspect_ratio_h_over_w +
						")"
				)
				.attr("id", "primplayer");
		}
	}
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * */
// YOUTUBE CALLBACKS
/* * * * * * * * * * * * * * * * * * * * * * * * * * * */

// eslint-disable-next-line no-unused-vars
function onYouTubeIframeAPIReady() {
	$.ajax(
		"https://api1.cronstv.rwcproductions.com/metadata/youtube?vid=" + gVideoId,
		{
			dataType: "text",
			headers: {
				Authorization: `Bearer ${token}`,
			},
			success: function ytDataSucess(data) {
				var vid_data = data.split(/[\n=]/);
				var aspect_ratio_h_over_w = 1 * vid_data[3];

				const player = new YT.Player("player", {
					height: 1024 * aspect_ratio_h_over_w,
					width: 1024,
					videoId: gVideoId,
					playerVars: {
						controls: 0,
						disablekb: 0,
						iv_load_policy: 3,
						rel: 0,
						showinfo: 0,
						modestbranding: 1,
						enablejsapi: 1,
						origin: "https://cronstv.rwcproductions.com",
						mute: 1, // https://developer.chrome.com/blog/autoplay/ Autoplay with sound is not allowed. Unless the site is a PWA, then it is: https://developer.chrome.com/blog/media-updates-in-chrome-73/#autoplay-pwa
					},
					suggestedQuality: "large",
					events: {
						onReady: onPlayerReady,
						onStateChange: onPlayerStateChange,
					},
				});

				const muteCtrl = document.querySelector("#unmutectrl");
				muteCtrl.addEventListener("click", () => {
					muteCtrl.style.display = "none";

					player.unMute();
					player.setVolume(100);
				});

				console.log({ aspect_ratio_h_over_w });

				if (gIsPrim) {
					$("#player")
						.css(
							"transform",
							"translateY(" +
								(1024 - aspect_ratio_h_over_w * 1024) / 2 +
								"px) scale(1," +
								1 / aspect_ratio_h_over_w +
								")"
						)
						.attr("id", "primplayer");
					$("#unmutectrl").css(
						"transform",
						"translateY(" +
							(1024 - aspect_ratio_h_over_w * 1024) / 2 +
							"px) scale(1," +
							1 / aspect_ratio_h_over_w +
							")"
					);
				}
			},
		}
	);
}

// *TODO: Detect the buffering state change and jump ahead...  Or find a way to tell YT to skip frames somehow...

function onPlayerStateChange(event) {
	console.log({ f: onPlayerStateChange.name, event });

	switch (event.data) {
		case 0 /*YT.PlayerState.ENDED*/:
			$("#player, #primplayer").remove();
			break;
		case 1 /*YT.PlayerState.PLAYING*/:
			if (event.target.isMuted()) {
				const muteCtrl = document.querySelector("#unmutectrl");
				muteCtrl.style.display = "block";
			}
			break;
	}
}

function onPlayerReady(event) {
	console.log({ f: onPlayerReady.name, event });

	event.target.seekTo(gPlayerStartPosition, true);
	// event.target.playVideo();
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * */
// FUNCTIONS
/* * * * * * * * * * * * * * * * * * * * * * * * * * * */

function getURLParameter(name) {
	return (
		decodeURIComponent(
			(new RegExp("[?|&]" + name + "=" + "([^&;]+?)(&|#|;|$)").exec(
				location.search
			) || [null, ""])[1].replace(/\+/g, "%20")
		) || null
	);
}

function getRemoteTime() {
	return (
		$.ajax({
			url: "https://api1.cronstv.rwcproductions.com/time",
			async: false,
			cache: false,
			dataType: "text",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		}).responseText * 1
	);
}

function getLocalTime() {
	return $.now() / 1000;
}
