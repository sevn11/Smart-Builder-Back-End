#!/bin/bash
source /home/ubuntu/.profile

cd /home/ubuntu/Smart-Builder-Back-End
branch=$(git branch | sed -n -e 's/^\* \(.*\)/\1/p')
git pull origin $branch
/home/ubuntu/.nvm/versions/node/v18.17.0/bin/pm2 ls
/home/ubuntu/.nvm/versions/node/v18.17.0/bin/pm2 restart smart-builder-backend
