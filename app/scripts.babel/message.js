import { getEndpointArn } from './sns';
import { visit } from './history';
import { responseSync } from './sync';

const handleMessage = (message) => {
  const data = JSON.parse(message.data.default);
  getEndpointArn().then((endpointArn) => {
    if (data.from !== endpointArn) {
      switch (data.action) {
        case 'visit':
          return visit(data.urls);
        case 'sync':
          return responseSync(data.syncedAt, data.from);
        default:
          console.log('unknown command', message);
      }
    }
    return false;
  });
};

export const startMessageListener = () => chrome.gcm.onMessage.addListener(handleMessage);
export default startMessageListener;
