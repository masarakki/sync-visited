import { load } from './storage';

export const gcmSenderId = process.env.GCM_SENDER_ID;
export const getGcmDeviceId = () => load('gcmDeviceId', () => new Promise((resolve) => {
  chrome.gcm.register([gcmSenderId], resolve);
})).then((gcmDeviceId) => ({ gcmSenderId, gcmDeviceId }));
