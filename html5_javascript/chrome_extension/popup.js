// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function renderStatus(statusText) {
  document.getElementById('status').textContent = statusText;
}


function findFirstVideoTag(node) {
    // there's probably a jquery way to do this easier :)
    if (node.nodeType == 1) {
        if (node.tagName.toUpperCase() == 'VIDEO') { // assume html 5 <VIDEO  ...
            return node;
        }
        node = node.firstChild;

        while (node) {
            if ((out = findFirstVideoTag(node)) != null) {
                return out;
            }
            node = node.nextSibling;
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
  // only enters here after they click on the icon
  var h=document.getElementById("edited_requested");
  h.addEventListener("click", loadEditedPlayback());
});

function loadEditedPlayback() {
  var s = document.createElement('script');
  s.src = chrome.extension.getURL('bootloader_dev.js');
  s.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(s);

  alert('attempted something' + s);
};

