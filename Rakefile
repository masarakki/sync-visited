require 'active_support/core_ext'
require 'time'
require 'dotenv'
require 'json'
Dotenv.load

task :stack do
  sh "aws cloudformation update-stack --stack-name #{ENV['STACK_NAME']} --template-body file://template.yaml --capabilities CAPABILITY_IAM"
end

file '.env.aws' => 'template.yaml' do |task|
  response = `aws cloudformation describe-stacks --stack-name #{ENV['STACK_NAME']}`
  stack = JSON.parse(response)['Stacks'][0]
  updated_time = Time.parse(stack['LastUpdatedTime'])
  file_time = File.atime(task.source)
  raise 'stack is not updated. run rake stack' if updated_time < file_time
  envs = stack['Outputs'].map {|x| "#{x['OutputKey'].underscore.upcase}=#{x['OutputValue']}" }
  File.write(task.name, envs.join("\n"))
end

task build: '.env.aws' do
  sh "yarn build"
end
