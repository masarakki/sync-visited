import _ from 'lodash';
import { subscribeTopic, publish } from './sns';
import { store, load } from './storage';

const getSyncedAt = async () => load({ synced_at: 0 });
const setSyncedAt = (time) => store({ synced_at: time });

const visitedAfter = (syncedAt) => new Promise((resolve) => {
  chrome.history.search({ text: '', startTime: syncedAt, maxResults: 1000 * 1000 }, (histories) => {
    resolve(histories);
  });
});

const requestVisits = async () => {
  const syncedAt = await getSyncedAt();
  console.log('fetch request from', syncedAt);
  // sendMessage({ action: 'sync', syncedAt, endpoint });
};

chrome.runtime.onInstalled.addListener(subscribeTopic);

let ignoreUrls = [];

chrome.history.onVisited.addListener((item) => {
  if (_.includes(ignoreUrls, item.url)) {
    ignoreUrls = _.reject(ignoreUrls, (url) => url === item.url);
    return;
  }
  if (item.visitCount === 1) {
    console.log('send:', item.url);
    publish({ action: 'visit', urls: [item.url] });
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
        publish({ action: 'visit', argUrls: _.slice(urls, 0, 10) }, endpoint);
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
  console.log(data);
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
