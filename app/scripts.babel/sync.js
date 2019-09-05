import _ from 'lodash';
import { publish, directMessage } from './sns';
import { store, load } from './storage';

export const getSyncedAt = () => load('synced_at', 0);
export const setSyncedAt = (time) => store('synced_at', time);

const visitedAfter = (syncedAt) => new Promise((resolve) => {
  chrome.history.search({ text: '', startTime: syncedAt, maxResults: 1000 * 1000 }, (histories) => {
    resolve(histories);
  });
});

const requestSyncFrom = (syncedAt) => {
  console.log('send sync request:', { afetr: syncedAt });
  publish({ action: 'sync', syncedAt });
};

export const requestSyncAll = () => requestSyncFrom(0);
export const requestSync = () => getSyncedAt().then(requestSyncFrom);

export const responseSync = (t, targetArn) => {
  const bulkSize = 5;
  console.log('receive sync request:', { from: targetArn, after: t });
  visitedAfter(t).then((histories) => {
    const urls = _.chain(histories)
      .filter((history) => history.visitCount === 1)
      .map((history) => history.url)
      .uniq()
      .value();
    console.log('send urls:', urls.length);
    const bulkResponse = (argUrls) => {
      if (urls.length > 0) {
        directMessage(targetArn, { action: 'visit', urls: _.slice(argUrls, 0, bulkSize) });
        setTimeout(() => bulkResponse(_.slice(argUrls, bulkSize)), 200);
      }
    };

    bulkResponse(urls);
  });
};
