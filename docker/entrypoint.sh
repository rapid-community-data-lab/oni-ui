#!/bin/sh
# oni-ui container entrypoint.
set -e

: "${BACKEND_URL:=http://api:8080}"
export BACKEND_URL

envsubst '${BACKEND_URL}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "[entrypoint] nginx will proxy /api -> ${BACKEND_URL}"

# Check if configuration file exists
if [ ! -f "/configuration.json" ]; then
  echo "Error: Configuration file not found"
  echo "Please mount your configuration.json file to /configuration.json"
  exit 1
fi

exec "$@"
