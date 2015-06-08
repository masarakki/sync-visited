require 'rake/clean'
require 'crxmake'
require 'coffee-script'

SRCS = FileList["src/*.coffee"]
OBJS = SRCS.ext('js')
CLEAN.include(OBJS)
CRX = 'sync-visited.crx'
ZIP = 'sync-visited.zip'

options = {ex_dir: './src', pkey: '~/Dropbox/crx_pem/sync-visited.pem', ignore: '.git' }

rule '.js' => '.coffee' do |t|
  sh "coffee --compile #{t.source}"
end

task CRX => OBJS + %w(src/manifest.json) do
  CrxMake.make(options.merge(crx_output: CRX))
end

task ZIP => OBJS + %w(src/manifest.json) do
  CrxMake.zip(options.merge(zip_output: ZIP))
end

desc 'create .crx file'
task :crx => CRX

desc 'create .zip file'
task :zip => ZIP

task default: :crx
