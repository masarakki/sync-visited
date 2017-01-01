'use strict';

chrome.runtime.onInstalled.addListener(details => {
  console.log('previousVersion', details.previousVersion);
});

const _ = require('lodash');
const AWS = require('aws-sdk');
const senderId = '894495215557';
const applicationArn = 'arn:aws:sns:us-east-1:009775665146:app/GCM/sync-visited';

AWS.config.update({
  accessKeyId: 'AKIAI3FCUINQCGGJL2RA',
  secretAccessKey: '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',
  region: 'us-east-1'
});

const get_synced_at = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get({synced_at: 0}, item => {
      resolve(item.synced_at);
    });
  });
};

const set_synced_at = (time) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({synced_at: time}, () => {
      resolve(time);
    });
  });
};

const get_uuid = () => {
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

const load_endpoint_arn = () => {
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


const get_endpoint_arn = () => {
  return load_endpoint_arn()
    .catch(() => {
      return Promise.all([get_device_id(), get_uuid()])
        .then(register_endpoint)
        .then(set_endpoint_arn);
    })
    .then(sync_endpoint);
};

const set_endpoint_arn = (endpoint) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({device: endpoint}, () => {
      resolve(endpoint);
    });
  });
};

const register_endpoint = (args) => {
  const [device_id, uuid] = args;

  return new Promise((resolve, reject) => {
    const sns = new AWS.SNS();
    const args = {
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

const get_devices = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get({devices: []}, item => {
      resolve(item.devices);
    });
  });
};

const get_device_id = () => {
  return new Promise((resolve, reject) => {
    chrome.gcm.register([senderId], device => {
      resolve(device);
    });
  });
};

const sync_endpoint = (endpoint) => {
  return new Promise((resolve, reject) => {
    get_devices().then(devices => {
      devices = _.union(devices, [endpoint]);
      chrome.storage.sync.set({devices: devices}, res => {
        resolve(endpoint);
      });
    });
  });
};

const reject_endpoint = (endpoint) => {
  return new Promise((resolve, reject) => {
    get_devices().then(devices => {
      devices = _.reject(devices, device => device == endpoint);
      chrome.storage.sync.set({devices: devices}, res => {
        resolve(devices);
      });
    });
  });
};

const visited_after = (synced_at) => {
  return new Promise((resolve, reject) => {
    chrome.history.search({text: '', startTime: synced_at, maxResults: 1000 * 1000}, histories => {
      resolve(histories);
    });
  });
};

const request_visits = () => {
  Promise.all([get_synced_at(), get_endpoint_arn()]).then(result => {
    const [synced_at, endpoint] = result;

    console.log('fetch request from', synced_at);
    send_message({action: 'sync', synced_at: synced_at, endpoint: endpoint});
  });
};

const send_message_to = (message, endpoint) => {
  const sns = new AWS.SNS();
  sns.publish({TargetArn: endpoint, Message: JSON.stringify(message)}, (err, data) => {
    if (err && !err.retryable) {
      reject_endpoint(endpoint).then(endpoints => {
        console.log(endpoint, 'is removed');
      });
    }
  });
};

const send_message = (message) => {
  const sns = new AWS.SNS();

  Promise.all([get_devices(), get_endpoint_arn()]).then(result => {
    const [endpoints, myself] = result;

    endpoints
      .filter(endpoint => endpoint != myself)
      .forEach(endpoint => send_message_to(message, endpoint));
  });
};

chrome.runtime.onInstalled.addListener(details => {
  get_endpoint_arn().catch(err => {
    console.log('error in setup_device', err);
  });
});

let ignoreUrls = [];

chrome.history.onVisited.addListener(item => {
  if (_.includes(ignoreUrls, item.url)) {
    ignoreUrls = _.reject(ignoreUrls, url => url === item.url);
    return;
  }
  if (item.visitCount === 1) {
    console.log('send:', item.url);
    send_message({action: 'visit', urls: [item.url]});
  }
});

const response_visits = (synced_at, endpoint) => {
  console.log('fetch response to', endpoint);
  visited_after(synced_at).then(histories => {
    const urls = _.chain(histories)
            .filter(history => history.visitCount == 1)
            .map(history => history.url)
            .uniq().value();
    _.each(_.chunk(urls, 10), urls => {
      send_message_to({action: 'visit', urls: urls}, endpoint);
    });
  });
};

const recieve_visited = (urls) => {
  const inner = (url) => {
    console.log('recieve:', url);
    chrome.history.getVisits({ url: url }, res => {
      if (res.length === 0) {
        ignoreUrls.push(url);
        chrome.history.addUrl({ url: url }, () => {});
      }
    });
  };
  _.each(urls, url => {
    inner(url);
  });
  set_synced_at(_.now());
};

chrome.gcm.onMessage.addListener(message => {
  const data = JSON.parse(message.data.default);
  switch (data.action) {
  case 'visit':
    recieve_visited(data.urls);
    break;
  case 'sync':
    response_visits(data.synced_at, data.endpoint);
  }
});

chrome.browserAction.onClicked.addListener(e => {
  request_visits();
});
