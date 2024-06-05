#!/bin/bash

#pm2 stop smart-builder-backend
#pm2 start smart-builder-backend
git pull origin main
pm2 restart smart-builder-backend
