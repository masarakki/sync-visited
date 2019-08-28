import { getGcmDeviceId } from './gcm';
import { visit } from './history';
import { responseSync } from './sync';

const handleMessage = (message) => {
  const data = JSON.parse(message.data.default);
  getGcmDeviceId().then((deviceId) => {
    if (data.from !== deviceId) {
      switch (data.action) {
        case 'visit':
          return visit(data.urls);
        case 'sync':
          return responseSync(data.synced_at, data.endpoint);
        default:
          console.log('unknown command', message);
      }
    }
    return false;
  });
};

export const startMessageListener = () => chrome.gcm.onMessage.addListener(handleMessage);
export default startMessageListener;
