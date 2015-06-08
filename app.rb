require 'sinatra'
require 'sinatra/cross_origin'
require 'faraday'
require 'faraday_middleware'
require 'aws-sdk'

configure do
  enable :cross_origin
end

begin
  require 'dotenv'
  Dotenv.load
rescue LoadError
end

def google_id(token)
  google = Faraday.new(url: 'https://www.googleapis.com') do |client|
    client.request :oauth2, token
    client.response :json
    client.adapter Faraday.default_adapter
  end
  google.get('/plus/v1/people/me').body['id']
end

def sns
  @sns ||= Aws::SNS::Client.new(region: 'us-east-1')
end

def arn
  @arn ||= 'arn:aws:sns:us-east-1:009775665146:app/GCM/sync-visited'
end

def topic(google_id)
  "sync-visited-#{google_id}"
end

get '/' do
  'https://chrome.google.com/webstore/detail/sync-visited/icmpnbfcobloimdfjpndodfnjmjlkkbn'
end

post '/device' do
  id = google_id(params[:token])
  halt 401 unless id
  topic = sns.create_topic(name: topic(id))
  device = params[:device]
  endpoint = sns.create_platform_endpoint(
    platform_application_arn: arn,
    token: device,
    custom_user_data: id
  )
  sns.subscribe(protocol: :application, endpoint: endpoint.endpoint_arn, topic_arn: topic.topic_arn)
  status 200
end

post '/url' do
  url = params[:url]
  id = google_id(params[:token])
  halt 401 unless id
  topic = sns.create_topic(name: topic(id))
  sns.publish(topic_arn: topic.topic_arn, message: url)
  status 200
end
