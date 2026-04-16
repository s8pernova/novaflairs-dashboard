FROM nodered/node-red:4.1.1-20

USER root

COPY nodered/package.json nodered/package-lock.json /data/

RUN chown -R node-red:node-red /data

USER node-red
WORKDIR /data

RUN npm ci --omit=dev && npm cache clean --force