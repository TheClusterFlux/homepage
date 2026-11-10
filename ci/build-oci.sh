#!/usr/bin/env bash
set -euo pipefail
work=$(mktemp -d)
trap 'if [[ -n ${server:-} ]]; then kill "$server" 2>/dev/null || true; fi; rm -rf "$work"' EXIT
app=$work/layer/app
mkdir -p "$app/src/data/thumbnails" "$app/uploads"
cp -a package.json package-lock.json src concepts CV-*.pdf "$app/"
npm --prefix "$app" ci --omit=dev --ignore-scripts --no-audit --no-fund
cd "$app"
PORT=18080 MONGODB_URI='mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=150' node src/server.js > "$work/app.log" 2>&1 &
server=$!
curl -fsS --retry 10 --retry-connrefused --retry-delay 1 http://127.0.0.1:18080/ -o "$work/page"
cmp src/index.html "$work/page"
curl -fsSL http://127.0.0.1:18080/cv/download -o "$work/cv.pdf"
test "$(head -c 4 "$work/cv.pdf")" = '%PDF'
test "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:18080/readyz)" = 503
kill "$server"; wait "$server" || true; server=
sha256sum "$work/page" | cut -d' ' -f1 > "$OUTPUT_DIR/page.sha256"
base=docker.io/library/node@sha256:aaa4b5baf1ecff3b283486bb1f90405cdda225a3e6f79660d2c559fa510a7292
layout=ocidir://$work/image
regctl image copy --platform linux/amd64 "$base" "$layout:base"
tar -C "$work/layer" --owner=1000 --group=1000 --numeric-owner -cf "$work/app.tar" app
regctl image mod "$layout:base" --create "$layout:release" --to-oci --layer-add "tar=$work/app.tar" \
  --user 1000:1000 --workdir /app --config-cmd '["node","src/server.js"]' --expose-add 8080/tcp \
  --label "org.opencontainers.image.revision=$SOURCE_SHA" --label "org.opencontainers.image.source=https://github.com/TheClusterFlux/homepage"
regctl image digest "$layout:release" > "$OUTPUT_DIR/image.digest"
regctl image export "$layout:release" "$OUTPUT_DIR/image.tar"
