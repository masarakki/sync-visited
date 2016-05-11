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

let get_uuid = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get('uuid', item => {
      let uuid = item.uuid;
      if (!uuid) {
        uuid = require('node-uuid').v4();
        chrome.storage.sync.set({uuid: uuid}, () => {});
      }
      resolve(uuid);
    });
  });
};

let get_endpoint_arn = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('device', (item) => {
      if (item.device) {
        resolve(item.device);
      } else {
        reject();
      }
    });
  });
};

let set_endpoint_arn = (endpoint) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({device: endpoint}, () => {
      resolve(endpoint);
    });
  });
};

let register_endpoint = (device_id, uuid) => {
  return new Promise((resolve, reject) => {
    let sns = new AWS.SNS();

    let args = {
      PlatformApplicationArn: applicationArn,
      Token: device_id,
      CustomUserData: `${chrome.runtime.id}: ${uuid}`
    };

    sns.createPlatformEndpoint(args, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.EndpointArn);
      }
    });
  });
};

let get_devices = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get({devices: []}, item => {
      resolve(item.devices);
    });
  });
};

let get_device_id = () => {
  return new Promise((resolve, reject) => {
    chrome.gcm.register([senderId], device => {
      resolve(device);
    });
  });
};

let sync_endpoint = (endpoint) => {
  return new Promise((resolve, reject) => {
    get_devices().then(devices => {
      devices = _.union(devices, [endpoint]);
      chrome.storage.sync.set({devices: devices}, res => {
        resolve(devices);
      });
    });
  });
};

let reject_endpoint = (endpoint) => {
  return new Promise((resolve, reject) => {
    get_devices().then(devices => {
      devices = _.reject(devices, device => { return device == endpoint; });
      chrome.storage.sync.set({devices: devices}, res => {
        resolve(devices);
      });
    });
  });
};

let set_synced_at = (time) => {
  chrome.storage.local.set({synced_at: time}, () => {});
};

let requestVisits = () => {
  if (enable) {
    get_synced_at(time => {
      visitedAfter(time, histories => {
        console.log(histories.length);
      });
    });
  }
};

let send_message = (message) => {
  let sns = new AWS.SNS();

  Promise.all([get_devices(), get_endpoint_arn()]).then(result => {
    let endpoints = result[0];
    let myself = result[1];

    endpoints.filter(endpoint => {
      return endpoint != myself;
    }).forEach(endpoint => {
      sns.publish({TargetArn: endpoint, Message: JSON.stringify(message)}, (err, data) => {
        if (err && !err.retryable) {
          reject_endpoint(endpoint).then(endpoints => {
            console.log('rejected', endpoints);
          });
        } else {
          console.log('success', data);
        }
      });
    });
  });
};

chrome.runtime.onStartup.addListener(requestVisits);

let setup_device = () => {
  return new Promise((resolve, reject) => {
    get_endpoint_arn().then(endpoint => {
      resolve(endpoint);
    }).catch(() => {
      Promise.all([get_device_id(), get_uuid()]).then(res => {
        return register_endpoint(res[0], res[1]);
      }).then(endpoint => {
        return set_endpoint_arn(endpoint);
      }).then(endpoint => {
        resolve(endpoint);
      }).catch(err => {
        reject(err);
      });
    });
  });
};

chrome.runtime.onInstalled.addListener(details => {
  setup_device().then(sync_endpoint).then(devices => {
    console.log(devices);
  }).catch(err => {
    console.log('error in setup_device', err);
  });
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
    send_message({action: 'visit', url: item.url});
  }
});

let recieve_visited = (url) => {
  chrome.history.getVisits({ url: url }, res => {
    if (res.length === 0) {
      ignoreUrls.push(url);
      chrome.history.addUrl({ url: url }, () => {});
    }
  });
};

chrome.gcm.onMessage.addListener(message => {
  let data = JSON.parse(message.data.default);
  switch (data.action) {
  case 'visit':
    recieve_visited(data.url);
    break;
  }
});
