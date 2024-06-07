#!/bin/bash

cd /home/ubuntu/Smart-Builder-Back-End
branch=$(git branch | sed -n -e 's/^\* \(.*\)/\1/p')
git pull origin $branch

cd /home/ubuntu/Smart-Builder-Back-End
pm2 restart smart-builder-backend
