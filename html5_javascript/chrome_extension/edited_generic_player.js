// (c) 2016 Roger Pack released under LGPL
// for non chrome browser: copy and paste all of this text (including this line) into the "developer tools javascript console" ">" prompt, and hit enter:
// if you have the chrome plugin, it automatically should do all this for you, you should not need to do anything here...just install the plugin.

if (typeof clean_stream_timer !== 'undefined') {
  alert("play it my way: already loaded...not loading it again...please use the on screen links for it"); // hope we never get here :|
  throw "dont know how to load it twice"; // in case they click a plugin button twice, or load it twice (too hard to reload, doesn't work that way anymore)
}

// var request_host="localhost:3000"; // dev
// var editorExtensionId = "ogneemgeahimaaefffhfkeeakkjajenb";

var request_host="playitmyway.inet2.org"; // prod
var editorExtensionId = "ionkpaepibbmmhcijkhmamakpeclkdml";

function inIframe() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

function isGoogleIframe() {
  return inIframe() && /google.com/.test(window.location.hostname); 
}

function currentUrlNotIframe() { // hopefully better alternate to window.location.href, though somehow this doesn't always work still [ex: netflix.com iframes?]
  return (window.location != window.parent.location) ? document.referrer : document.location.href;
} 

function isAmazon() {
  return currentUrlNotIframe().includes("amazon.com");
}

function getStandardizedCurrentUrl() {
  var current_url = currentUrlNotIframe();
  if (isAmazon() && document.querySelector('link[rel="canonical"]') != null) {
		// -> canonical, the crystal code does this for everything so guess we should do here as well...ex youtube it strips off &t=2 or something...
    current_url = document.querySelector('link[rel="canonical"]').href; // seems to always convert from "/gp/" to "/dp/" and sometimes even change the ID :|
  }
	// else don't get canonical here or youtube will not track its move from one to another right, canonical retains the old one apparently hrm...
  // standardize
  current_url = current_url.replace("smile.amazon.com", "www.amazon.com");
  if (current_url.includes("amazon.com")) { // known to want to strip off cruft here
    current_url = current_url.split("?")[0];
  }
  current_url = current_url.split('#')[0]; // https://www.youtube.com/watch?v=LXSj1y9kl2Y# -> https://www.youtube.com/watch?v=LXSj1y9kl2Y since we don't do hashes
  return current_url;
}

function liveEpisodeName() {
  if (isAmazon() && document.getElementsByClassName("subtitle").length > 0) {
    split = document.getElementsByClassName("subtitle")[0].innerHTML.split(/Ep. \d+/); // like "Season 3, Ep. 3 The Painted Lady"
    if(split.length == 2)
      return split[1].trim();
    else
      return split[0].trim();
  }
  else
    if (isGoogleIframe()) {
      var numberNameDiv = window.parent.document.querySelectorAll('.epname-number')[0]; // apparently I have backward but not forward visibility. phew.
      if (numberNameDiv) {
        var numberName = numberNameDiv.innerHTML; // like " 3. Return to Omashu "
        var numberName = numberName.trim();
        var regex =  /(\d+)\. /; 
        if (regex.test(numberName)) {
          return numberName.split(regex)[2];
        }
        // ??
        return numberName;
     }
    }
    return "";
  end
}

function liveEpisodeNumber() {
  if (isGoogleIframe()) {
    var numberNameDiv = window.parent.document.querySelectorAll('.epname-number')[0]; // apparently I have backward but not forward visibility. phew.
    if (numberNameDiv) {
      var numberName = numberNameDiv.innerHTML; // like " 3. Return to Omashu "
      var numberName = numberName.trim();
      var regex =  /(\d+)\. /;
      if (regex.test(numberName)) {
        return /(\d+)\. /.exec(numberName)[1];
      }
      else {
        return "0";
      }
    }
  }
  if (isAmazon()) {
    var subtitle = document.getElementsByClassName("subtitle")[0];
    if (subtitle && subtitle.innerHTML.match(/Ep. (\d+)/)) {
      var out = /Ep. (\d+)/.exec(subtitle.innerHTML)[1];
			return out;
    }
		else {
			return "0";
		}
  }
  else {
    return "0"; // anything else...
  }
}

function findFirstVideoTagOrNull() {
  var all = document.getElementsByTagName("video");
  // search iframes in case people try to load it manually, non plugin, and we happen to have access to iframes, which will be about never
  // it hopefully won't hurt anything tho...since with the plugin way and most pages "can't access child iframes" the content script injected into all iframes will take care of business instead.
  var i, frames;
  frames = document.getElementsByTagName("iframe");
  for (i = 0; i < frames.length; ++i) {
    try { var childDocument = frame.contentDocument } catch (e) { continue }; // skip ones we can't access :|
    all.concat(frames[i].contentDocument.document.getElementsByTagName("video"));
  }
  for(var i = 0, len = all.length; i < len; i++) {
    if (all[i].currentTime > 0) {
      return all[i];
    }
  }
  return null;
}

function decodeHTMLEntities(text) {
   	// I guess there's an HTML way to do this, but this way looked funner! :)
    var entities = [
        ['amp', '&'], ['apos', '\''], ['#x27', '\''], ['#x2F', '/'], ['#39', '\''], ['#47', '/'], ['lt', '<'], ['gt', '>'], ['nbsp', ' '], ['quot', '"']
    ];
    for (var i = 0, max = entities.length; i < max; ++i) {
        text = text.replace(new RegExp('&'+entities[i][0]+';', 'g'), entities[i][1]);
    }
    return text;
}

function areWeWithin(thisArray, cur_time) {
  for (key in thisArray) {
    var item = thisArray[key];
    var start_time = item[0];
    var end_time = item[1];
    if(cur_time > start_time && cur_time < end_time) {
      return item;
    }
  }
  return [false];
}

extra_message = "";

function checkIfShouldDoActionAndUpdateUI() {
	var cur_time = video_element.currentTime;
	var [last_start, last_end] = areWeWithin(mutes, cur_time);
	if (last_start) {
	  if (!video_element.muted) {
	    video_element.muted = true;
	    timestamp_log("muting", cur_time, last_start, last_end);
	    extra_message = "muted";
	  }
	}
	else {
	  if (video_element.muted) {
	    video_element.muted = false;
	    console.log("unmuted at=" + cur_time);
	    extra_message = "";
	  }
	}
	[last_start, last_end] = areWeWithin(skips, cur_time);
	if (last_start) {
	  timestamp_log("seeking to " + last_end, cur_time, last_start, last_end);
	  seekToTime(last_end);
	}
	[last_start, last_end] = areWeWithin(yes_audio_no_videos, cur_time);
	if (last_start) {
		// use style.visibility here so it retains the space it would have otherwise used
	  if (video_element.style.visibility != "hidden") {
	    console.log("hiding video leaving audio ", cur_time, last_start, last_end);
	    extra_message = "no video yes audio";
	    video_element.style.visibility="hidden";
	  }
	}
	else {
	  if (video_element.style.visibility != "") {
	    video_element.style.visibility=""; // non hidden :)
	    console.log("unhiding video with left audio" + cur_time);
	    extra_message = "";
	  }
	}

	document.getElementById('tag_layer_top_line').innerHTML = "Create a new tag by entering the timestamp, testing it, then saving it: <br/>current time=" + timeStampToHuman(cur_time);
	document.getElementById("add_edit_span_id_for_extra_message").innerHTML = extra_message;
	document.getElementById("playback_rate").innerHTML = video_element.playbackRate.toFixed(2) + "x";
}

function withinDelta(first, second, delta) {
	var diff = Math.abs(first - second);
	return diff < delta;
}

function checkStatus() {
	// we call this on the big 3 even if there's not one being edited...
  if (url_id != 0) { // avoid unmuting videos playing that we don't even control [like youtube main page LOL]
		if (current_json.url.total_time > 0 && !withinDelta(current_json.url.total_time, video_element.duration, 2)) {
			console.log("watching add?");
		}
		else {
      checkIfShouldDoActionAndUpdateUI();
		}
	}
  checkIfEpisodeChanged();
  video_element = findFirstVideoTagOrNull() || video_element; // refresh it in case changed, but don't switch to null :|
	setEditedControlsToTopLeft(); // in case something changed [i.e. amazon moved their video element into "on screen" :| ]
//	console.log("done checking status");
}

function liveEpisodeString() {
  if (liveEpisodeNumber() != "0")
    return " episode:" + liveEpisodeNumber() + " " + liveEpisodeName();
  else
    return "";
  end
}

function youtubeChannelName() {
    var all = document.getElementsByTagName("img");
    var arrayLength = all.length;
    for (var i = 0; i < arrayLength; i++) {
        if (all[i].alt != "") {
          return all[i].alt + " "; // "Studio C" channel name, but hacky...
        }
    }
    return "";
}
function liveTitleNoEpisode() {
  var title = "unknown title";
  if (document.getElementsByTagName("title")[0]) {
    title = document.getElementsByTagName("title")[0].innerHTML;
  } // some might not have it [iframes?]
  if (isGoogleIframe()) {
    title = window.parent.document.getElementsByTagName("title")[0].innerHTML; // always there :) "Avatar Extras - Movies &amp; TV on Google Play"
    var season_episode = window.parent.document.querySelectorAll('.title-season-episode-num')[0];
    if (season_episode) {
      title += season_episode.innerHTML.split(",")[0]; // like " Season 2, Episode 2 "
    }
    // don't add episode name
  }
  if (currentUrlNotIframe().includes("youtube.com")) {
    title = youtubeChannelName() + title; 
  }
  return title;
}

function liveFullNameEpisode() {
  return liveTitleNoEpisode() + liveEpisodeString(); 
}

function timestamp_log(message, cur_time, last_start, last_end) {
  local_message = message + " at " + cur_time + " start:" + last_start + " will_end:" + last_end + " in " + (last_end - cur_time)+ "s";;
  console.log(local_message);
}

function addEditUi() {
	
	allEditStuffDiv = document.createElement('div');
	allEditStuffDiv.id = "all_edit_stuff";
	allEditStuffDiv.innerHTML = `
	<style>
	  #all_edit_stuff a:link { color: rgb(255,228,181); text-shadow: 0px 0px 5px black;} 
		#all_edit_stuff a:visited { color: rgb(255,228,181); text-shadow: 0px 0px 5px black;}
	</style>;`
  allEditStuffDiv.style.color = "white";
  allEditStuffDiv.style.background = '#000000';
  allEditStuffDiv.style.backgroundColor = "rgba(0,0,0,0)"; // still see the video, but also see the text :)
  allEditStuffDiv.style.fontSize = "15px";
  allEditStuffDiv.style.textShadow="2px 1px 1px black";
  document.body.appendChild(allEditStuffDiv);
	
  currentlyEditingDiv = document.createElement('div');
  currentlyEditingDiv.style.position = 'absolute';
  currentlyEditingDiv.style.height = '30px';
  currentlyEditingDiv.style.zIndex = "99999999"; // doesn't inherit? gah
	currentlyEditingDiv.id = "top_left";
  currentlyEditingDiv.innerHTML = 
	` <div id=currently_filtering_id style='display: none;'>
	    Success! Currently editing: <select id='tag_edit_list_dropdown' onChange='getEditsFromTagListAndAlert();'></select>
	  </div>
	  <div id=loading_div_id>Loading...</div>
	  <span id=add_edit_span_id_for_extra_message></span><!-- purposefully left blank, filled in later with 'muted'-->
	  <br/><a href=# onclick="addForNewEditToScreen(); return false;" id="add_edit_or_add_movie_link_id"><!-- will be filled in --></a>`;
  // and stay visible
  allEditStuffDiv.appendChild(currentlyEditingDiv);

  tagLayer = document.createElement('div');
	tagLayer.id = "tagLayer";
  tagLayer.style.position = 'absolute';
  tagLayer.style.width = '500px';
  tagLayer.style.height = '30px';
  tagLayer.style.display = 'none';
  tagLayer.style.zIndex = "99999999";
		
  allEditStuffDiv.appendChild(tagLayer);
  
  tagLayer.innerHTML = `
  <div class="moccasin">
	<div id='tag_layer_top_right'><!-- filled in later mutes=2 skips=... --></div>
	<br/>
	<div id='tag_layer_top_line'><!-- filled in later "create a new tag...current_time=" --></div>
	from:<textarea name='start' rows='1' cols='20' style='width: 150px; font-size: 12pt; font-family: Arial;' id='start'>0m 0.00s</textarea>
  <input id='clickMe' type='button' value='<--set to current time' onclick="document.getElementById('start').value = getCurrentVideoTimestampHuman();" />
  <br/>
  to:<textarea name='endy' rows='1' cols='20' style='width: 150px; font-size: 12pt; font-family: Arial;' id='endy'>0m 0.00s</textarea>
  <input id='clickMe' type='button' value='<--set to current time' onclick="document.getElementById('endy').value = getCurrentVideoTimestampHuman();" />
  <br/>
  action:
  <select name='default_action' id='new_action'>
    <option value='mute'>mute</option>
    <option value='skip'>skip</option>
    <option value='yes_audio_no_video'>yes_audio_no_video</option>
    <option value='do_nothing'>do_nothing</option>
  </select>
	<br/>
  <input type='submit' value='Test edit once' onclick="testCurrentFromUi();">
  <input type='submit' value='save edit' onclick="saveEditButton(); pauseVideo();">
  <br/>
  <br/>
  <input type='button' onclick="seekToTime(video_element.currentTime - 10); return false;" value='-10s'/>
  <input type='button' onclick="seekToTime(video_element.currentTime - 5); return false;" value='-5s'/>
  <input type='button' onclick="seekToTime(video_element.currentTime + 5); return false;" value='+5s'/>
  <input type='button' onclick="video_element.playbackRate -= 0.1; return false;" value='&lt;&lt;'/>
  <span id='playback_rate'>1.00x</span>
  <input type='button' onclick="video_element.playbackRate += 0.1; return false;" value='&gt;&gt;'/>
  <input type='button' onclick="stepFrame(); return false;" value='frame'/>
  <input type='button' onclick="video_element.play(); return false;" value='&#9654;'>
  <input type='button' onclick="pauseVideo(); return false;" value='&#9612;&#9612;'/>
	<br/>
  <a href=% onclick="showMoviePage(); return false;" </a>Movie edit page</a>
	<!-- broken br/>
  <a href="#" onclick="openEditMostRecentPassed(); return false;">re-edit just passed</a-->
	<br/>
  <input type='button' onclick="closeEditor(); return false;" value='✕ Hide editor'/>
	</div>
  `;
  
  // don't really need these anymore FWIW we call it once per frame
  addEvent(window, "resize", function(event) {
    setEditedControlsToTopLeft();
  });
  addEvent(window, "scroll", function(event) {
    setEditedControlsToTopLeft();
  });
  setEditedControlsToTopLeft(); // and call immediately :)
  addMouseAnythingListener(showEditLinkMouseJustMoved);
}

function pauseVideo() {
	video_element.pause();
}

function sendMessageToPlugin(message) {
window.postMessage({ type: "FROM_PAGE_TO_CONTENT_SCRIPT", 
     payload: message }, "*");
		 console.log("sent message" + message);
}

// method to bind easily to resize event
var addEvent = function(object, type, callback) {
    if (object == null || typeof(object) == 'undefined') return;
    if (object.addEventListener) {
        object.addEventListener(type, callback, false);
    } else if (object.attachEvent) {
        object.attachEvent("on" + type, callback);
    } else {
        object["on"+type] = callback;
    }
};

function displayDiv(div) {
	div.style.display = "block";
}

function hideDiv(div) {
	div.style.display = "none";
}

function seekToTime(ts) {
  // try and avoid pauses after seeking
  video_element.pause();
  video_element.currentTime = ts; // if this is far enough away from current, it implies a "play" call...oddly. I mean seriously that is junk.
	// however if it close enough, then we need to call play
	// some shenanigans to pretend to know what is going on...
	var timer = setInterval(function() {
		if (video_element.paused && video_element.readyState ==4 || !video_element.paused) {
			video_element.play();
			clearInterval(timer);
		}		
	}, 50);
}


function addForNewEditToScreen() {
  if (url_id == 0) {
		// case "unedited click to add.."
    window.open("https://" + request_host + "/new_url_from_plugin?url=" + encodeURIComponent(getStandardizedCurrentUrl()) + "&episode_number=" + liveEpisodeNumber() + "&episode_name="  +
		      encodeURIComponent(liveEpisodeName()) + "&title=" + encodeURIComponent(liveTitleNoEpisode()) + "&duration=" + video_element.duration, "_blank");
		setTimeout(loadForNewUrl, 2000); // it should auto save so we should be live within 2s I hope...if not they'll get the same prompt [?] :|					
		pauseVideo();		
  }
	else {
		// case "Add new content tag" XXX this is screwy but...but...LOL
    document.getElementById("add_edit_or_add_movie_link_id").innerHTML = "";
		displayAddTagStuffIfInAddMode();
	}
}

function inAddMode() {
	return document.getElementById("add_edit_or_add_movie_link_id").innerHTML == "" ;
}

function displayAddTagStuffIfInAddMode() {
  if (inAddMode()){
    displayDiv(tagLayer);
	}
}

function hideAddTagStuff() {
  hideDiv(tagLayer);
}

function closeEditor() {
  document.getElementById("add_edit_or_add_movie_link_id").innerHTML = "Add new content edit tag click here";
	hideAddTagStuff();
}

function getLocationOfElement(el) {
  el = el.getBoundingClientRect();
  return {
    left: el.left + window.scrollX,
    top: el.top + window.scrollY
  }
}

function setEditedControlsToTopLeft() {
  // discover where the "currently viewed" top left actually is (not always 0,0 apparently, it seems)
  var left = getLocationOfElement(video_element).left; 
  var top = getLocationOfElement(video_element).top;
  top += 85; // couldn't see it when at the very top youtube [XXXX why?] but just in case others are the same fix it this way LOL
	if (isAmazon()) {
		top += 35; // allow them to expand x-ray to disable it
	}
  currentlyEditingDiv.style.left = left + "px";
  currentlyEditingDiv.style.top = top + "px";
	top += 55; // put rest below the currentlyEditingDiv line
  tagLayer.style.left = left + "px";
  tagLayer.style.top = top + "px";
}

function addToCurrentEditArray() {
  start = humanToTimeStamp(document.getElementById('start').value);
  endy = humanToTimeStamp(document.getElementById('endy').value);
  if (endy <= start) {
    alert("seems your end is before your start, please fix then try again!");
    return; // abort
  } 
  currentEditArray().push([start, endy]);
  return [start, endy];
}

function currentTestAction() {
  return document.getElementById('new_action').value;
}

var inMiddleOfTestingEdit = false;

function testCurrentFromUi() {
  if (currentTestAction() == 'do_nothing') {
    alert('testing a do nothing is hard, please set it to yes_audio_no_video, test it, then set it back to do_nothing, before hitting save button');
    return; // abort
  }
	if (inMiddleOfTestingEdit) {
		alert('cant test two edits simultaneously, please wait for the first to finish first'); // otherwise I'm not sure what is going to happen to those arrays :|
	}
  inMiddleOfTestingEdit = true;
  var [start, endy] = addToCurrentEditArray();
  seekToTime(start - 1);
  length = endy - start;
  if (currentTestAction() == 'skip') {
    length = 0; // it skips it, so the amount of time before reverting is less it :)
	}
	// just in case the seek takes really really long...netflix used to once, who knows, maybe useful LOL
	var waitTillRewind = setInterval(function() {
		if (video_element.currentTime < endy && !video_element.paused) {
			clearInterval(waitTillRewind);
		  wait_time_millis = (length + 2 + 1)*1000; 
		  setTimeout(function() {
				console.log("assuming done with edit...");
		    currentEditArray().pop();
		    inMiddleOfTestingEdit = false;
		  }, wait_time_millis);
		}
	}, 50);
}

function currentEditArray() {
  switch (currentTestAction()) {
    case 'mute':
      return mutes;
    case 'skip':
      return skips;
    case 'yes_audio_no_video':
      return yes_audio_no_videos;
    case 'do_nothing':
      return do_nothings;
    default:
      alert('internal error 1...'); // hopefully never see this
  }
}

function getCurrentVideoTimestampHuman() {
  return timeStampToHuman(video_element.currentTime);
}

function timeStampToHuman(timestamp) {
  var hours = Math.floor(timestamp / 3600);
  timestamp -= hours * 3600;
  var minutes  = Math.floor(timestamp / 60);
  timestamp -= minutes * 60;
  var seconds = timestamp.toFixed(2); //  -> "12.30";
  // padding is "hard" apparently in javascript LOL
  if (hours > 0)
    return hours + "h " + minutes + "m " + seconds + "s";
  else
    return minutes + "m " + seconds + "s";
}

function removeFromArray(arr) {
    var what, a = arguments, L = a.length, ax;
    while (L > 1 && arr.length) {
        what = a[--L];
        while ((ax= arr.indexOf(what)) !== -1) {
            arr.splice(ax, 1);
        }
    }
    return arr;
}

function humanToTimeStamp(timestamp) {
  // 0h 17m 34.54s
  sum = 0.0
  split = timestamp.split(/[hms ]/)
  removeFromArray(split, "");
  split.reverse();
  for (var i = 0; i < split.length; i++) {
    sum += parseFloat(split[i]) * Math.pow(60, i);
  }
  return sum;
}

function saveEditButton() {
  var url = "https://" + request_host + "/add_tag_from_plugin/" + url_id + '?start=' + document.getElementById('start').value + 
            "&endy=" + document.getElementById('endy').value + "&default_action=" + currentTestAction();
  window.open(url, '_blank');
	document.getElementById('start').value = '0m 0.00s'; // reset so people don't think they can hit "test edit" again now :|
	// too disconcerting to see it all cleared :| document.getElementById('endy').value = '0m 0.00s';
  setTimeout(reloadForCurrentUrl, 5000); // reload to get it "back" from the server now
  //  setTimeout(reloadForCurrentUrl, 20000); // and get details :) but we don't use them today really :|
}

function showMoviePage() {
  window.open("https://" + request_host + "/view_url/" + current_json.url.id);
}

function openEditMostRecentPassed() {
  var lastest = 0;
  var last_id = 0;
  var cur_time = video_element.currentTime;
  var tags = current_json.tags;
  for (var i = 0; i < tags.length; i++) {
    if (edits[i].endy < cur_time && tags[i].endy > lastest) {
      last_id = tags[i].id;
      lastest = tags[i].endy;
    }
  } 

  if (last_id > 0) {
    window.open("https://" + request_host + "/edit_tag/" + last_id);
  }
  else {
    alert("play it my way:\ncould not find one earlier than your currently playing back location");
  }
}

function stepFrame() {
  video_element.play();
  setTimeout(function() { 
    video_element.pause(); 
  }, 1/30*1000); // theoretically about an NTSC frame worth :)
}

function lookupUrl() {
  return '//' + request_host + '/for_current_just_settings_json?url=' + encodeURIComponent(getStandardizedCurrentUrl()) + '&episode_number=' + liveEpisodeNumber();
}

function loadForNewUrl() {
  getRequest(lookupUrl(), parseSuccessfulJsonNewUrl, loadFailed);
}

function reloadForCurrentUrl() {
  if (url_id != 0 && !inMiddleOfTestingEdit) {
		console.log("reloading...");
    getRequest(lookupUrl(), parseSuccessfulJsonReload, function() { console.log("huh wuh edits disappeared but used to be there??");  }); 
  }
	else {
		console.log("not reloading...?");
	}
}

function parseSuccessfulJsonReload(json_string) {
  parseSuccessfulJson(json_string);
	getEditsFromTagListAndAlert();
}

function parseSuccessfulJsonNewUrl(json_string) {
  parseSuccessfulJson(json_string);
	getEditsFromTagListAndAlert(); // alert was useful on amazon, but annoying when you create new movie [?]
  startWatcherTimerOnce();
  if (getStandardizedCurrentUrl() != expected_current_url && getStandardizedCurrentUrl() != amazon_second_url) {
    alert("play it my way:\ndanger: this may have been the wrong url? this_page=" + currentUrlNotIframe() + "(" + getStandardizedCurrentUrl() + ") edits expected from=" + expected_current_url + " or " + amazon_second_url);
  }
  old_current_url = getStandardizedCurrentUrl();
  if (liveEpisodeNumber() != expected_episode_number) {
    alert("play it my way\ndanger: may have gotten wrong episode expected=" + expected_episode_number + " got=" + liveEpisodeNumber());
  }
  old_episode = liveEpisodeNumber();
  var post_message = "This movie is currently marked as \"" + current_json.url.editing_status + "\" in our system, which means it is incomplete.  Please help us with it!";
  if (current_json.url.editing_status == "done") {
    post_message = "\nYou may sit back and relax while you enjoy it now!";
	}
	displayDiv(document.getElementById("currently_filtering_id"));
	hideDiv(document.getElementById("loading_div_id"));
  document.getElementById("add_edit_or_add_movie_link_id").innerHTML = "Add new content edit tag click here"; // in case it said unedited... before
	sendMessageToPlugin({text: "YES", color: "#008000", details: "Edited playback is enabled and fully operational"}); // green
}


function loadFailed(status) {
  mutes = skips = yes_audio_no_videos = []; // reset so it doesn't re-use last episode's edits for the current episode!
  // plus if they paste it in it gets here, so...basically load the no-op :|
  if (current_json != null) {
    current_json.tags = [];
  }
  name = liveFullNameEpisode();
  episode_name = liveEpisodeString();
  expected_episode_number = liveEpisodeNumber();
  url_id = 0; // reset
	closeEditor();
  document.getElementById("add_edit_or_add_movie_link_id").innerHTML = "Unedited, click to enable edited..."; // she's dead jim XX confirm prompt on it to create?
	hideDiv(document.getElementById("currently_filtering_id"));
	hideDiv(document.getElementById("loading_div_id"));
	
	removeAllOptions(document.getElementById("tag_edit_list_dropdown"));
  old_current_url = getStandardizedCurrentUrl();
  old_episode = liveEpisodeNumber(); 
  sendMessageToPlugin({color: "#A00000", text: "none", details: "No edited settings found for movie, not playing edited"}); // red
  if (status > 0) {
		// too annoying/frequent :|
		// setTimeout(alertHaveNoneClickOverThereToAddOne, 500); // do later so UI can update and not show behind this prompt as if loaded :|
  }
  else {
    alert("appears the play it my way server is currently down, please alert us! Edits disabled for now...");
		document.getElementById("add_edit_or_add_movie_link_id").innerHTML = "Play it my way Server down, try again later...";
  }
  startWatcherTimerOnce(); // so it can check if episode changes to one we like magically LOL [amazon...]
}


function alertEditorWorkingAfterTimeout(message) {
	setTimeout(function() {
    alert("Play it my way:\n" + decodeHTMLEntities("SUCCESS: Editing playback successfully enabled for\n"  + name + " " + episode_name + "\n" + message + 
	      "\n\nskips=" + skips.length + "\nmutes=" + mutes.length +"\nyes_audio_no_videos=" + yes_audio_no_videos.length +
		    "\n" + liveFullNameEpisode()));
			}, 100);
}

var current_json;

function removeAllOptions(selectbox)
{
  for(var i = selectbox.options.length - 1 ; i >= 0 ; i--) {
    selectbox.remove(i);
  }
}

function parseSuccessfulJson(json_string) {
  current_json = JSON.parse(json_string);
  var url = current_json.url;
  name = url.name;
  episode_name = url.episode_name;
  expected_current_url = current_json.expected_url_unescaped;
  amazon_second_url = current_json.url;
  expected_episode_number = url.episode_number;
  url_id = url.id;
	
	var dropdown = document.getElementById("tag_edit_list_dropdown");
	removeAllOptions(dropdown); // out with any old...	
	for (var i = 0; i < current_json.tag_edit_lists.length; i++) {
		var tag_edit_list_and_tags = current_json.tag_edit_lists[i];
		var option = document.createElement("option");
		option.text = tag_edit_list_and_tags[0].description;
		option.value = tag_edit_list_and_tags[0].id;
		dropdown.add(option, dropdown[0]); // put it at the top XX
	}
	var option = document.createElement("option");
	option.text = "all content tags (" + current_json.tags.length + ")"; // so they can go back to "all" if wanted :|
	option.value = "-1"; // special case :|
  option.setAttribute('selected', true); // default :| XXXX I bet if we add an edit we lose the right value :|
	dropdown.add(option, dropdown[0]);
	console.log("finished parsing response JSON");
}

function setTheseTagsAsTheOnesToUse(tags) {
	mutes = []
	skips = []
	yes_audio_no_videos = []
	do_nothings = [] // :|
	for (var i = 0; i < tags.length; i++) {
		var tag = tags[i];
		var push_to_array;
		if (tag.default_action == 'mute') {
      push_to_array = mutes;
		} else if (tag.default_action == 'skip') {
      push_to_array = skips;
		} else if (tag.default_action == 'yes_audio_no_video') {
      push_to_array = yes_audio_no_videos;
		} else {
      push_to_array = do_nothings;
		}
		push_to_array.push([tag.start, tag.endy]);
	}
	document.getElementById('tag_layer_top_right').innerHTML = "Current content edit list: skips=" + skips.length + " mutes=" + mutes.length +" yes_audio_no_videos=" + yes_audio_no_videos.length;
}

function getEditsFromTagListAndAlert() {
	var dropdown = document.getElementById("tag_edit_list_dropdown");
	var selected_edit_list_id = dropdown.value;
	if (selected_edit_list_id == "-1") {
		setTheseTagsAsTheOnesToUse(current_json.tags);
		return;
	}
	for (var i = 0; i < current_json.tag_edit_lists.length; i++) {
		var tag_edit_list_and_tags = current_json.tag_edit_lists[i];
		if (tag_edit_list_and_tags[0].id == selected_edit_list_id) {
			setTheseTagsAsTheOnesToUse(tag_edit_list_and_tags[1]);
			return;
		}		
	}
	alert("unable to select " + dropdown.value); // shouldn't get here ever LOL.
}

// http://stackoverflow.com/questions/1442425/detect-xhr-error-is-really-due-to-browser-stop-or-click-to-new-page
function getRequest (url, success, error) {  
  console.log("starting attempt GET download " + url);
  var xhr = XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP"); 
  xhr.open("GET", url); 
  xhr.onreadystatechange = function(){ 
    if ( xhr.readyState == 4 ) { 
      if ( xhr.status == 200 ) { 
        success(xhr.responseText); 
      } else { 
        error && error(xhr.status); 
        error = null;
      } 
    } 
  }; 
  xhr.onerror = function () { 
    error && error(xhr.status); 
    error = null;
  }; 
  xhr.send(); 
}

function checkIfEpisodeChanged() {
	var current_episode_number = liveEpisodeNumber();
  if (getStandardizedCurrentUrl() != old_current_url || current_episode_number != old_episode) {
		if (old_episode != "0" && current_episode_number == "0") {
			console.log("got change from an episode " + old_episode + " to non episode? ignoring..."); // amazon when you hit the x
			return;
		}
    console.log("detected move to another video, to\n" + getStandardizedCurrentUrl() + "\nep. " + liveEpisodeNumber() + "\nfrom\n" +
                 old_current_url + "\n ep. " + old_episode + "\nwill try to load its edited settings now for the new movie...");
    old_current_url = getStandardizedCurrentUrl(); // set them now so it doesn't re-get them next loop
    old_episode = liveEpisodeNumber(); 
    setTimeout(loadForNewUrl, 1000); // youtube has the "old name" still for awhile, so for the new prompt wait
  }
}

function alertHaveNoneClickOverThereToAddOne() {
  alert(decodeHTMLEntities("Play it my way:\nWe don't appear to have tags for\n\n" + liveFullNameEpisode() + "\n\n yet, you can add this movie to the system by clicking the 'Unedited, click to enable edited' link to the left"));
}

var clean_stream_timer;

function startWatcherTimerOnce() {
  clean_stream_timer = clean_stream_timer || setInterval(checkStatus, 1000 / 100 ); // 100 fps since that's the granularity of our time entries :|
  // guess we just never turn it off on purpose :)
}

function start() {
  video_element = findFirstVideoTagOrNull();

  if (video_element == null) {
    // this one's pretty serious, just let it die...
    // maybe could get here if they raw load the javascript?
    alert("play it my way:\nfailure: unable to find a video playing, not loading edited playback...possibly need to reload then hit a play button before loading edited playback?");
    return;
  }

  if (isGoogleIframe()) {
    if (!window.parent.location.pathname.startsWith("/store/movies/details") && !window.parent.location.pathname.startsWith("/store/tv/show")) {
      // iframe started from a non "details" page with full url
      alert('play it my way: failure: for google play movies, you need to right click on them and choosen "open in new tab" for it to work edited.');
      return; // avoid future prompts which don't matter anyway for now :|
    }
  }

  // ready to try and load the editor LOL
	console.log("adding edit UI, looking for URL");
  addEditUi(); // only do once...
  loadForNewUrl();
}

var mouse_move_timer;
function showEditLinkMouseJustMoved() {
	displayDiv(document.getElementById("top_left"));
	displayAddTagStuffIfInAddMode();
  clearTimeout(mouse_move_timer);
  mouse_move_timer = setTimeout(function() { hideDiv(document.getElementById("top_left")); hideAddTagStuff(); }, (inAddMode() ? 5000 : 2000)); // in add mode we ex: use the dropdown and it doesn't trigger this mousemove thing so when it comes off it it disappears and scares you, so 5000 here...
}

function addMouseAnythingListener(func) {
  // some "old IE" browser compat stuff :|
  var addListener, removeListener;
  if (document.addEventListener) {
		addListener = function (el, evt, f) { return el.addEventListener(evt, f, false); };
      removeListener = function (el, evt, f) { return el.removeEventListener(evt, f, false); };
  } else {
      addListener = function (el, evt, f) { return el.attachEvent('on' + evt, f); };
      removeListener = function (el, evt, f) { return el.detachEvent('on' + evt, f); };
  }

  addListener(document, 'mousemove', func);
  addListener(document, 'mouseup', func);
  addListener(document, 'mousedown', func);
}

function onReady(yourMethod) {
  if (document.readyState === 'complete') {
    setTimeout(yourMethod, 1); // schedule to run immediately
  }
  else {
    readyStateCheckInterval = setInterval(function() {
      if (document.readyState === 'complete') {
        clearInterval(readyStateCheckInterval);
        yourMethod();
     }
     }, 10);
  }
}

// no jquery since this page might already have it loaded, so don't load/use it to avoid any conflict.  [plus speedup load times :| ]
// on ready just in case here LOL
onReady(start);