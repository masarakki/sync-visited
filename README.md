# sync-visited chrome extension

Sync your visited sites to all your computers via (your) Amazon SNS.
It means **it makes links purple!**

## Required

- aws account
- ruby
- node
- pip install awscli

## Build

    bundle install
    yarn install
    cp .env.sample .env
    (edit .env)
    rake stack  ## update stack
    rake deploy

## Install

Chrome -> More tools -> Extensions -> Load uppacked -> select `$DEPLOY_PATH/sync-visited`
