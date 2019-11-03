import AWS from 'aws-sdk';
import { merge } from 'lodash';
import { getGcmDeviceId } from './gcm';
import { load } from './storage';

AWS.config.credentials = new AWS.Credentials(
  process.env.AWS_ACCESS_KEY_ID,
  process.env.AWS_SECRET_ACCESS_KEY,
);
AWS.config.region = 'us-east-1';

const sns = new AWS.SNS();
const topicArn = process.env.AWS_TOPIC_ARN;
const applicationArn = process.env.AWS_APPLICATION_ARN;

console.log('topic-arn', topicArn);

const createEndpointArn = (deviceId) => new Promise((resolve, reject) => {
  sns.createPlatformEndpoint({
    PlatformApplicationArn: applicationArn,
    Token: deviceId,
  }, (err, data) => {
    if (err) {
      reject(err);
    } else {
      resolve(data.EndpointArn);
    }
  });
});

export const getEndpointArn = () => load('endpointArn', () => getGcmDeviceId().then(createEndpointArn))
  .then((endpointArn) => ({ endpointArn }));

const subscribe = (args) => new Promise((resolve, reject) => {
  sns.subscribe({
    TopicArn: topicArn,
    Protocol: 'application',
    Endpoint: args.endpointArn,
  }, (err, data) => {
    if (err) {
      reject(err);
    } else {
      resolve(data);
    }
  });
});

const unsubscribe = (subscriptionArn) => new Promise((resolve, reject) => {
  sns.unsubscribe({ SubscriionArn: subscriptionArn }, (err, data) => {
    if (err) {
      reject(err);
    } else {
      resolve(data);
    }
  });
});

const withEndpoint = (message) => getEndpointArn()
  .then((args) => merge(message, { from: args.endpointArn }));

export const directMessage = (targetArn, message) => {
  withEndpoint(message).then((msg) => {
    sns.publish({
      TargetArn: targetArn,
      Message: JSON.stringify(msg),
    }, (err, data) => {
      if (err) {
        Promise.reject(err);
      } else {
        Promise.resolve(data);
      }
    });
  });
};

export const publish = (message) => {
  withEndpoint(message).then((msg) => {
    sns.publish({
      TopicArn: topicArn,
      Message: JSON.stringify(msg),
    }, (err, data) => {
      if (err) {
        Promise.reject(err);
      } else {
        Promise.resolve(data);
      }
    });
  });
};

export const subscribeTopic = () => getEndpointArn().then(subscribe);
export const getSubscriptionId = () => load('subscriptionId', subscribeTopic);
export const unsubscribeTopic = () => getSubscriptionId().then(unsubscribe);
