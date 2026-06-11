FROM nodered/node-red:4.1.1-20

USER root

WORKDIR /opt/novaflairs-nodered

COPY nodered/package.json nodered/package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY nodered/flows.json nodered/settings.js ./
COPY nodered/docker/entrypoint.sh /usr/local/bin/novaflairs-nodered-entrypoint

RUN chmod +x /usr/local/bin/novaflairs-nodered-entrypoint \
    && mkdir -p /data \
    && find /data -mindepth 1 -maxdepth 1 -exec rm -rf -- {} + \
    && chown -R node-red:node-red /opt/novaflairs-nodered /data

USER node-red

WORKDIR /usr/src/node-red

ENTRYPOINT ["novaflairs-nodered-entrypoint"]
