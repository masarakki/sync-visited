const get = (key) => new Promise((resolve, reject) => {
  chrome.storage.local.get(key, (items) => {
    const item = items[key];
    if (item) {
      resolve(item);
    } else {
      reject(key);
    }
  });
});

export const store = (key, value) => new Promise((resolve) => {
  chrome.storage.local.set({ [key]: value }, () => {
    resolve(value);
  });
});

const onFailure = (defaultValue = null) => {
  if (defaultValue == null) {
    return () => null;
  }
  if (typeof defaultValue === 'function') {
    return (key) => defaultValue().then((val) => store(key, val));
  }
  return (key) => store(key, defaultValue);
};


export const load = (key, defaultValue = null) => get(key).catch(onFailure(defaultValue));

export const clear = () => new Promise((resolve) => {
  chrome.storage.local.clear(resolve);
});
