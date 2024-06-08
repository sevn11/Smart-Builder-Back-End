#!/bin/bash

# Source the user's profile to ensure environment variables are loaded
source /home/ubuntu/.profile

# Explicitly set the path to include the Node and pm2 binaries
export PATH=$PATH:/home/ubuntu/.nvm/versions/node/v18.17.0/bin

# Navigate to the application directory
cd /home/ubuntu/Smart-Builder-Back-End

git clean -fd
git stash

# Get the current branch name
branch=$(git branch | sed -n -e 's/^\* \(.*\)/\1/p')

# Pull the latest changes from the repository
git pull origin $branch

# build application
pnpm build
# Restart the application using pm2
pm2 restart smart-builder-backend
