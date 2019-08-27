import AWS from 'aws-sdk';
import { getGcmDeviceId } from './gcm';

AWS.config.credentials = new AWS.Credentials(
  process.env.AWS_ACCESS_KEY_ID,
  process.env.AWS_SECRET_ACCESS_KEY,
);
AWS.config.region = 'us-east-1';

const sns = new AWS.SNS();
const topicArn = process.env.AWS_TOPIC_ARN;
const applicationArn = process.env.AWS_APPLICATION_ARN;

const getEndpointArn = (deviceId) => new Promise((resolve, reject) => {
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

const subscribe = (endpointArn) => new Promise((resolve, reject) => {
  sns.subscribe({
    TopicArn: topicArn,
    Protocol: 'application',
    Endpoint: endpointArn,
  }, (err, data) => {
    if (err) {
      reject(err);
    } else {
      resolve(data);
    }
  });
});

export function publish(message) {
  return new Promise((resolve, reject) => {
    sns.publish({
      TopicArn: topicArn,
      Message: JSON.stringify(message),
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

export function subscribeTopic() {
  return getGcmDeviceId().then(getEndpointArn).then(subscribe);
}

export function unsubscribeTopic() {
}
