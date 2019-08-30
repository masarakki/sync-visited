import { load } from './storage';

export const senderId = process.env.GCM_SENDER_ID;
export const getGcmDeviceId = () => load('gcmDeviceId', () => new Promise((resolve) => {
  chrome.gcm.register([senderId], (device) => {
    resolve(device);
  });
}));
