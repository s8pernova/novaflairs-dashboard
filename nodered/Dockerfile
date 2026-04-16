FROM nodered/node-red:4.1.1-20

USER root
WORKDIR /usr/src/node-red

COPY nodered/package.json nodered/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

RUN chown -R node-red:root /usr/src/node-red

USER node-red