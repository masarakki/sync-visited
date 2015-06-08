var senderId = "894495215557";
var apiHost = "https://sync-visited.herokuapp.com";
var waitingForGcmCallback = false;

AWS.config.region = "us-east-1";

function signIn(callback) {
  if (waitingForGcmCallback) {
    return callback(false);
  }
  if (navigator.onLine) {
    chrome.identity.getAuthToken({interactive: true}, function(token) {
      if (token) {
        waitingForGcmCallback = true;

        chrome.gcm.register([senderId], function(device) {
          waitingForGcmCallback = false;
          if (chrome.runtime.lastError) {
            return callback(false);
          }
          $.post(apiHost + "/device", {
            device: device,
            token: token
          }).done(function(res) {
            callback(true);
          });
        });
      } else {
        callback(false);
      }
    });
  }
}

chrome.runtime.onInstalled.addListener(function(details) {
  signIn(function(result) {
  });
});

var ignoreUrls = [];

chrome.history.onVisited.addListener(function(item) {
  if(_.contains(ignoreUrls, item.url)) {
    ignoreUrls = _.reject(ignoreUrls, function(url) {
                   return url === item.url
                 });
    return;
  }
  if(item.visitCount === 1) {
    sendMessage(item.url);
  }
});

chrome.gcm.onMessage.addListener(function(message) {
  var url = message.data.default;
  chrome.history.getVisits({url: url}, function(res) {
    if (res.length === 0) {
      chrome.history.addUrl({url :url}, function() {
        ignoreUrls.push(url);
      });
    }
  });
});

chrome.gcm.onSendError.addListener(function(error) {
  console.log(error);
});

function sendMessage(url) {
  chrome.identity.getAuthToken(function(token) {
    if (token) {
      $.post(apiHost + "/url", {
        token: token,
        url: url
      }).done(function(res) {
      });
    }
  });
}

chrome.runtime.onMessage.addListener(function(message, sender, response) {
  var action = message.action;
  switch (action) {
    case "sign_in":
    signIn(function(result) {
      response(result);
    });
  }
  return true;
});
