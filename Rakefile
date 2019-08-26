require 'active_support/core_ext'
require 'time'
require 'dotenv'
require 'json'
require 'pathname'
require 'fileutils'
require 'zip'
Dotenv.load

task :stack do
  sh "aws cloudformation update-stack --stack-name #{ENV['STACK_NAME']} --template-body file://template.yaml --capabilities CAPABILITY_IAM"
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

task deploy: :build do
  dir = ENV['DEPLOY_PATH'] || '.'
  path = File.join(dir, 'sync-visited.zip')
  FileUtils.rm path, force: true

  Zip::File.open(path, Zip::File::CREATE) do |zip|
    zip.add('manifest.json', 'app/manifest.json')
    ['app/_locales/**/*', 'app/scripts/**/*'].each do |path|
      Dir.glob(path) do |f|
        pathname = Pathname.new(f)
        zip.add(pathname.relative_path_from('app').to_s, f)
      end
    end
  end
end
