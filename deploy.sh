#!/bin/bash

current_branch=$(git rev-parse --abbrev-ref HEAD)
git pull origin $current_branch
pm2 restart smart-builder-backend
