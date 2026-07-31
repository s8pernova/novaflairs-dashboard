# Production deployment

NOVAflair deploys `main` to the single production VM through GitHub Actions,
Tailscale, SSH, and Docker Compose. This runbook documents the current
build-on-VM process. The immutable release-manifest design is intentionally
deferred to the `release/transactional-deployment` branch.

This is operational documentation rather than an ADR: `/srv` is the correct
service-data location on this host, and this change aligns deployment mechanics
with the existing server.

## Host layout

| Path or resource | Purpose |
| --- | --- |
| `/srv/novaflairs-dashboard` | Git checkout owned by `deploy` |
| `/srv/novaflairs-deploy/deploy.sh` | Stable deployment entrypoint |
| `/srv/novaflairs-deploy/backups` | Rootless, mode-`0700` pre-deploy backups |
| `/etc/novaflairs/compose.env` | Production environment, `root:deploy 0640` |
| `/etc/novaflairs/supabase-ca.pem` | Database CA certificate |
| `novaflairs_nodered_data` | Mutable Node-RED runtime data |
| `infra_metabase_data` | Existing production Metabase database |

The Compose project remains `infra` for this release so Docker reconciles the
containers already running under that project. Renaming the project or the
Metabase volume would create parallel empty state instead of migrating the
live services.

## Bootstrap before merging

Run from the repository checkout:

```bash
rsync infra/deploy/deploy.sh \
  kiddo@100.115.196.122:/tmp/novaflairs-deploy.sh

ssh kiddo@100.115.196.122
sudo install -o deploy -g deploy -m 0755 \
  /tmp/novaflairs-deploy.sh /srv/novaflairs-deploy/deploy.sh
sudo -iu deploy
/srv/novaflairs-deploy/deploy.sh preflight
```

Automation logs in as `kiddo` and uses the narrowly scoped sudoers rule:

```sudoers
kiddo ALL=(deploy) NOPASSWD: /usr/bin/bash /srv/novaflairs-deploy/deploy.sh *
```

The GitHub `production` environment is restricted to `main`. Repository
secrets provide `VM_HOST`, `VM_SSH_KEY`, `TS_OAUTH_CLIENT_ID`, and
`TS_OAUTH_SECRET`; the non-secret SSH username is fixed in the workflow.

## Deployment sequence

1. GitHub queues production runs rather than cancelling an in-progress deploy.
2. The server acquires a `flock`, validates Docker and required environment
   keys, then prints and creates a timestamped backup.
3. The requested commit must be a 40-character SHA reachable from
   `origin/main`.
4. Existing UI and Node-RED images receive local `rollback` tags.
5. The checkout resets to the requested commit and builds SHA-tagged UI and
   Node-RED images.
6. On the first run, the live Node-RED bind-mounted `/data` is copied into
   `novaflairs_nodered_data`. Metabase continues using
   `infra_metabase_data`.
7. Compose waits for service health, then the script smoke-tests UI, Node-RED,
   and Metabase over their localhost endpoints.

Node-RED credentials, sessions, and context survive the migration. Tracked
flows, settings, and dependencies come from the image and are refreshed on
every start.

## Rollback

If checkout, build, startup, health, or smoke validation fails, the script:

1. stops the attempted release if cutover began;
2. restores the previous Git checkout;
3. restores the original Node-RED bind mount from its pre-deploy archive during
   the first migration;
4. recreates UI and Node-RED from the images tagged `rollback`; and
5. re-runs all three smoke tests.

The original deployment still exits unsuccessfully so GitHub records the
incident. Every attempt prints its backup path for manual recovery.

This is a pragmatic rollback for the current build-on-VM architecture. It does
not provide immutable registry artifacts, a release manifest, or arbitrary
historical rollback; those belong to the deferred transactional release work.

## Local verification

```bash
bash -n infra/deploy/deploy.sh
sh -n nodered/docker/entrypoint.sh
docker compose \
  --env-file .env \
  --env-file nodered/.env \
  config --quiet
git diff --check
```
