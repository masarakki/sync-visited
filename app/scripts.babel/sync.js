import { store, load } from './storage';

export const getSyncedAt = () => load('synced_at', 0);
export const setSyncedAt = (time) => store('synced_at', time);

/*
const visitedAfter = (syncedAt) => new Promise((resolve) => {
  chrome.history.search({ text: '', startTime: syncedAt, maxResults: 1000 * 1000 }, (histories) => {
    resolve(histories);
  });
});
*/

const requestSyncFrom = (t) => {
  console.log('request sync from', t);
};

export const requestSyncAll = () => requestSyncFrom(0);
export const requestSync = () => getSyncedAt().then(requestSyncFrom);

export const responseSync = (t) => {
  console.log('response sync from', t);
/*
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
*/
};
