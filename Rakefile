require 'active_support/core_ext'
require 'dotenv'
require 'json'
require 'fileutils'
Dotenv.load

task :stack do
  sh "aws cloudformation update-stack --stack-name #{ENV['STACK_NAME']} --template-body file://template.yaml --parameters ParameterKey=ApplicationArn,ParameterValue=#{ENV['AWS_APPLICATION_ARN']} --capabilities CAPABILITY_IAM"
end

task '.env.aws' do |task|
  response = `aws cloudformation describe-stacks --stack-name #{ENV['STACK_NAME']}`
  stack = JSON.parse(response)['Stacks'][0]
  envs = stack['Outputs'].map {|x| "#{x['OutputKey'].underscore.upcase}=#{x['OutputValue']}" }
  File.write(task.name, envs.join("\n"))
end

task build: '.env.aws'  do
  sh "yarn build --mode production"
end

task dist: :build do
  FileUtils.mkdir 'dist' unless File.exist? 'dist'
  ['app/manifest.json', 'app/_locales', 'app/scripts'].each do |path|
    FileUtils.cp_r path, 'dist'
  end
end

task deploy: :dist do
  return unless ENV['DEPLOY_PATH']
  path = File.join(ENV['DEPLOY_PATH'], 'sync-visited')
  FileUtils.mkdir path unless File.exist? path
  FileUtils.cp_r Dir.glob('dist/*'), path
end
