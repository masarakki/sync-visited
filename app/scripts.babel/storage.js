export const store = (object) => new Promise((resolve) => {
  chrome.storage.local.set(object, () => {
    resolve(object);
  });
});

export const load = (key, val = null) => new Promise((resolve) => {
  chrome.storage.local.get({ [key]: val }, (item) => {
    resolve(item);
  });
});
