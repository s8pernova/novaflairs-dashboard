FROM nodered/node-red:4.1.1-20

USER root

WORKDIR /opt/novaflairs-nodered

COPY nodered/package.json nodered/package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY nodered/flows.json nodered/settings.js ./
COPY nodered/lib ./lib
COPY nodered/scenarios ./scenarios
COPY nodered/docker/entrypoint.sh /usr/local/bin/novaflairs-nodered-entrypoint

RUN find /opt/novaflairs-nodered \
      -path /opt/novaflairs-nodered/node_modules -prune \
      -o -type d -exec chmod 0755 {} + \
    && find /opt/novaflairs-nodered \
      -path /opt/novaflairs-nodered/node_modules -prune \
      -o -type f -exec chmod 0644 {} + \
    && chmod 0755 /usr/local/bin/novaflairs-nodered-entrypoint \
    && mkdir -p /data \
    && find /data -mindepth 1 -maxdepth 1 -exec rm -rf -- {} + \
    && chown -R node-red:node-red /data

USER node-red

WORKDIR /usr/src/node-red

ENTRYPOINT ["novaflairs-nodered-entrypoint"]
