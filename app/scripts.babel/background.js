import { startMessageListener } from './message';
import { startHistoryListener } from './history';
import { subscribeTopic, unsubscribeTopic } from './sns';
import { clear } from './storage';
import { requestSync, requestSyncAll } from './sync';

chrome.runtime.onInstalled.addListener(() => {
  startMessageListener();
  startHistoryListener();
  subscribeTopic()
    .then(requestSync);
});
chrome.runtime.onSuspend.addListener(() => {
  unsubscribeTopic().then(clear);
});
chrome.browserAction.onClicked.addListener(requestSyncAll);
