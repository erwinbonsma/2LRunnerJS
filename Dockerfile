# Minifies the 2L Runner code.
#
# Usage:
#   docker build -t builder -f Dockerfile .
#   docker create --name builder builder
#   docker cp builder:/work/2LRunner.min.js .
#   docker rm builder

FROM node:16

RUN npm install terser -g

WORKDIR /work
COPY 2LRunner.js .
RUN terser --toplevel -c passes=2 -m --mangle-props keep_quoted -- 2LRunner.js > 2LRunner.min.js
