#!/bin/bash

branch=$(git branch | sed -n -e 's/^\* \(.*\)/\1/p')
git pull origin $branch
pm2 restart smart-builder-backend
