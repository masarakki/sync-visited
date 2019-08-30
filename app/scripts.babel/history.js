import _ from 'lodash';
import { publish } from './sns';
import { setSyncedAt } from './sync';
import { getGcmDeviceId } from './gcm';

const ignoreUrls = {};

export const visit = (urls) => {
  const inner = (url) => {
    console.log('recieve:', url);
    ignoreUrls[url] = 1;
    chrome.history.addUrl({ url }, () => {});
  };
  _.each(urls, (url) => {
    inner(url);
  });
  return setSyncedAt(_.now());
};

const handleVisited = (item) => {
  if (ignoreUrls[item.url]) {
    delete ignoreUrls[item.url];
    return;
  }
  if (item.visitCount === 1) {
    console.log('send:', item.url);
    getGcmDeviceId().then((deviceId) => {
      publish({ action: 'visit', urls: [item.url], from: deviceId });
    });
  }
};

export const startHistoryListener = () => chrome.history.onVisited.addListener(handleVisited);
