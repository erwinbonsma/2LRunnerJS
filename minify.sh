#!/bin/bash
set -euxo pipefail

docker build -t builder -f Dockerfile .
docker create --name builder builder
docker cp builder:/work/2LRunner.min.js .
docker rm builder