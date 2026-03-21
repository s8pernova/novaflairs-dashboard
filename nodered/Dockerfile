FROM nodered/node-red:4.1.1-20

USER root
WORKDIR /usr/src/node-red

COPY nodered/package.json nodered/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

RUN mkdir -p /opt/orbit-nodered
COPY nodered/flows.json /opt/orbit-nodered/flows.json
COPY nodered/flows_cred.json /opt/orbit-nodered/flows_cred.json
COPY nodered/settings.js /opt/orbit-nodered/settings.js
COPY nodered/lib /opt/orbit-nodered/lib
COPY nodered/docker/entrypoint.sh /usr/local/bin/orbit-entrypoint.sh

RUN chmod +x /usr/local/bin/orbit-entrypoint.sh \
 && chown -R node-red:root /opt/orbit-nodered /usr/local/bin/orbit-entrypoint.sh /usr/src/node-red

USER node-red
ENTRYPOINT ["/usr/local/bin/orbit-entrypoint.sh"]