#!/bin/bash

# Source the user's profile to ensure environment variables are loaded
source /home/ubuntu/.profile

# Explicitly set the path to include the Node and pm2 binaries
export PATH=$PATH:/home/ubuntu/.nvm/versions/node/v18.17.0/bin
export NODE_OPTIONS=--max-old-space-size=6000

# Navigate to the application directory
cd /home/ubuntu/Smart-Builder-Back-End

git clean -fd
git stash

# Get the current branch name
branch=$(git branch | sed -n -e 's/^\* \(.*\)/\1/p')

# Pull the latest changes from the repository
git pull origin $branch
#stop app
pm2 stop smart-builder-backend
pm2 delete smart-builder-backend
pm2 save --force
# build application
pnpm install
pnpm build
# migrations 
if [ -z "$branch" ]; then
  echo "No branch found"
  exit 1
fi

if [[ "$branch" == "dev" ]]; then
  npx prisma migrate dev
  echo "migrating dev"
  pm2 start ecosystem-dev.config.js 
elif [[ "$branch" == "main" ]]; then
  npx prisma migrate deploy
  echo "migrating in prod"
  pm2 start ecosystem.config.js 

fi
# start the application using pm2
pm2 save
