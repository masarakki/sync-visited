'use strict';

chrome.runtime.onInstalled.addListener(details => {
  console.log('previousVersion', details.previousVersion);
});

let _ = require('underscore');
let AWS = require('aws-sdk');
let senderId = '894495215557';
let applicationArn = 'arn:aws:sns:us-east-1:009775665146:app/GCM/sync-visited';

AWS.config.update({
  accessKeyId: 'AKIAI3FCUINQCGGJL2RA',
  secretAccessKey: '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',
  region: 'us-east-1'
});


let get_synced_at = (callback) => {
  chrome.storage.local.get('synced_at', item => {
    if (chrome.runtime.lastError) {
      callback(0);
    } else {
      callback(item.synced_at);
    }
  });
};

let set_synced_at = (time) => {
  chrome.storage.local.set({synced_at: time}, () => {});
}

let requestVisits = () => {
  if (enable) {
    get_synced_at(time => {
      visitedAfter(time, histories => {
        console.log(histories.length);
      });
    });
  }
};

let getDevice = (callback) => {
  chrome.storage.local.get('device', result => {
    if (result.device) {
      callback(result.device);
      return;
    }

    chrome.gcm.register([senderId], device => {
      let sns = new AWS.SNS();
      sns.createPlatformEndpoint({
        PlatformApplicationArn: applicationArn,
        Token: device
      }, (err, data) => {
        let token = null;
        if (err) {
          console.log(err);
          return;
        } else {
          chrome.storage.local.set({device: data.EndpointArn});
          registerDevice(data.EndpointArn);
          callback(data.EndpointArn);
        }
      });
    });
  });
};

let registerDevice = (deviceArn) => {
  chrome.storage.sync.get({devices: []}, (result) => {
    let devices = result.devices;
    devices.push(deviceArn);
    chrome.storage.sync.set({devices: devices}, () => {});
  });
};

let sendMessage = (subject, message) => {
  let sns = new AWS.SNS();

  chrome.storage.sync.get('devices', result => {
    result.devices.forEach(device => {
      sns.publish({Subject: subject, TargetArn: device, Message: message}, (err, data) => {
        console.log(err);
        console.log(data);
      });
    });
  });
};

chrome.runtime.onStartup.addListener(requestVisits);

chrome.runtime.onInstalled.addListener(details => {
  getDevice(device => { console.log(device); });
});


let visitedAfter = (from, callback) => {
  chrome.history.search({text: '', startTime: from, maxResults: 1000 * 1000}, (histories) => {
    callback(histories);
  });
};


let ignoreUrls = [];

chrome.history.onVisited.addListener(item => {
  if (_.contains(ignoreUrls, item.url)) {
    ignoreUrls = _.reject(ignoreUrls, url => {
      return url === item.url;
    });
    return;
  }
  if (item.visitCount === 1) {
    sendMessage('url', item.url);
  }
});

chrome.gcm.onMessage.addListener(message => {
  let url = message.data.default;
  chrome.history.getVisits({ url: url }, res => {
    if (res.length === 0) {
      chrome.history.addUrl({ url: url }, () => {
        ignoreUrls.push(url);
      });
    }
  });
});
