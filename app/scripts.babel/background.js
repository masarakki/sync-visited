import _ from 'lodash';
import AWS from 'aws-sdk';
import uuidv4 from 'uuid/v4';

chrome.runtime.onInstalled.addListener((details) => {
  console.log('previousVersion', details.previousVersion);
});

// AWS.config.credentials = new AWS.Credentials(process.env.AWS_ACCESS_KEY_ID,
//                                              process.env.AWS_SECRET_ACCESS_KEY);
// const topicArn = process.env.TOPIC_ARN;

const senderId = '894495215557';
const applicationArn = 'arn:aws:sns:us-east-1:009775665146:app/GCM/sync-visited';
const IdentityPoolId = 'us-east-1:eab1e8c8-b795-4782-879c-d6b9c9ef2edc';


AWS.config.region = 'us-east-1';
AWS.config.credentials = new AWS.CognitoIdentityCredentials({ IdentityPoolId });

const getSyncedAt = () => new Promise((resolve) => {
  chrome.storage.local.get({ synced_at: 0 }, (item) => {
    resolve(item.synced_at);
  });
});

const setSyncedAt = (time) => new Promise((resolve) => {
  chrome.storage.local.set({ synced_at: time }, () => {
    resolve(time);
  });
});

const getUuid = () => new Promise((resolve) => {
  chrome.storage.sync.get('uuid', (item) => {
    let { uuid } = item;
    if (!uuid) {
      uuid = uuidv4();
      chrome.storage.sync.set({ uuid }, () => {});
    }
    resolve(uuid);
  });
});

const loadEndpointArn = () => new Promise((resolve, reject) => {
  chrome.storage.local.get('device', (item) => {
    if (item.device) {
      resolve(item.device);
    } else {
      reject();
    }
  });
});

const getDevices = () => new Promise((resolve) => {
  chrome.storage.sync.get({ devices: [] }, (item) => {
    resolve(item.devices);
  });
});

const syncEndpoint = (endpoint) => new Promise((resolve) => {
  getDevices().then((_devices) => {
    const devices = _.union(_devices, [endpoint]);
    chrome.storage.sync.set({ devices }, () => {
      resolve(endpoint);
    });
  });
});

const getDeviceId = () => new Promise((resolve) => {
  chrome.gcm.register([senderId], (device) => {
    resolve(device);
  });
});

const registerEndpoint = (args) => {
  const [deviceId, uuid] = args;

  return new Promise((resolve, reject) => {
    const sns = new AWS.SNS();
    const snsArgs = {
      PlatformApplicationArn: applicationArn,
      Token: deviceId,
      CustomUserData: `${chrome.runtime.id}: ${uuid}`,
    };

    sns.createPlatformEndpoint(snsArgs, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.EndpointArn);
      }
    });
  });
};

const setEndpointArn = (endpoint) => new Promise((resolve) => {
  chrome.storage.local.set({ device: endpoint }, () => {
    resolve(endpoint);
  });
});

const getEndpointArn = () => loadEndpointArn()
  .catch(() => Promise.all([getDeviceId(), getUuid()])
    .then(registerEndpoint)
    .then(setEndpointArn))
  .then(syncEndpoint);

const rejectEndpoint = (endpoint) => new Promise((resolve) => {
  getDevices().then((_devices) => {
    const devices = _.reject(_devices, (device) => device === endpoint);
    chrome.storage.sync.set({ devices }, () => {
      resolve(devices);
    });
  });
});

const visitedAfter = (syncedAt) => new Promise((resolve) => {
  chrome.history.search({ text: '', startTime: syncedAt, maxResults: 1000 * 1000 }, (histories) => {
    resolve(histories);
  });
});

const sendMessageTo = (message, endpoint) => {
  const sns = new AWS.SNS();
  sns.publish({ TargetArn: endpoint, Message: JSON.stringify(message) }, (err) => {
    if (err && !err.retryable) {
      rejectEndpoint(endpoint).then(() => {
        console.log(endpoint, 'is removed');
      });
    }
  });
};

const sendMessage = (message) => {
  Promise.all([getDevices(), getEndpointArn()]).then((result) => {
    const [endpoints, myself] = result;

    endpoints
      .filter((endpoint) => endpoint !== myself)
      .forEach((endpoint) => sendMessageTo(message, endpoint));
  });
};

const requestVisits = () => {
  Promise.all([getSyncedAt(), getEndpointArn()]).then((result) => {
    const [syncedAt, endpoint] = result;

    console.log('fetch request from', syncedAt);
    sendMessage({ action: 'sync', syncedAt, endpoint });
  });
};


chrome.runtime.onInstalled.addListener(() => {
  getEndpointArn().catch((err) => {
    console.log('error in setup_device', err);
  });
});

let ignoreUrls = [];

chrome.history.onVisited.addListener((item) => {
  if (_.includes(ignoreUrls, item.url)) {
    ignoreUrls = _.reject(ignoreUrls, (url) => url === item.url);
    return;
  }
  if (item.visitCount === 1) {
    console.log('send:', item.url);
    sendMessage({ action: 'visit', urls: [item.url] });
  }
});

const responseVisits = (syncedAt, endpoint) => {
  console.log('fetch response to', endpoint);
  visitedAfter(syncedAt).then((histories) => {
    const urls = _.chain(histories)
      .filter((history) => history.visitCount === 1)
      .map((history) => history.url)
      .uniq()
      .value();

    const responseTen = (argUrls) => {
      if (urls.length > 0) {
        sendMessageTo({ action: 'visit', argUrls: _.slice(urls, 0, 10) }, endpoint);
        setTimeout(() => responseTen(_.slice(argUrls, 10)), 200);
      }
    };

    responseTen(urls);
  });
};

const recieveVisited = (urls) => {
  const inner = (url) => {
    console.log('recieve:', url);
    chrome.history.getVisits({ url }, (res) => {
      if (res.length === 0) {
        ignoreUrls.push(url);
        chrome.history.addUrl({ url }, () => {});
      }
    });
  };
  _.each(urls, (url) => {
    inner(url);
  });
  setSyncedAt(_.now());
};

chrome.gcm.onMessage.addListener((message) => {
  const data = JSON.parse(message.data.default);
  switch (data.action) {
    case 'visit':
      recieveVisited(data.urls);
      break;
    case 'sync':
      responseVisits(data.synced_at, data.endpoint);
      break;
    default:
      break;
  }
});

chrome.browserAction.onClicked.addListener(() => {
  requestVisits();
});
