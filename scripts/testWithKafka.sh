#!/bin/bash -ex

testCommand="$1"
extraArgs="$2"

export HOST_IP=$(ifconfig | grep -E "([0-9]{1,3}\.){3}[0-9]{1,3}" | grep -v 127.0.0.1 | awk '{ print $2 }' | cut -f2 -d: | head -n1)

find_container_id() {
  echo $(docker ps \
    --filter "status=running" \
    --filter "label=com.docker.compose.project=kafkajs-dlq" \
    --filter "label=com.docker.compose.service=kafka" \
    --no-trunc \
    -q)
}

quit() {
  docker-compose down --remove-orphans
  exit 1
}

if [ -z ${DO_NOT_STOP} ]; then
  trap quit ERR
fi

if [ -z "$(find_container_id)" ]; then
  echo -e "Start kafka docker container"
  NO_LOGS=1 $PWD/scripts/dockerComposeUp.sh
  if [ "1" = "$?" ]; then
    echo -e "Failed to start kafka image"
    exit 1
  fi
fi

$PWD/scripts/waitForKafka.js

eval "${testCommand} ${extraArgs}"
TEST_EXIT=$?
echo

if [ -z ${DO_NOT_STOP} ]; then
  docker-compose down --remove-orphans
fi
exit ${TEST_EXIT}