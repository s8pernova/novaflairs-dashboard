FROM nodered/node-red:4.1.1-20

USER root

COPY nodered/package.json nodered/package-lock.json /data/

RUN chown -R node-red:node-red /data

USER node-red

RUN cd /data && npm ci --omit=dev && npm cache clean --force

WORKDIR /usr/src/node-red