# Plaintext Notes

A minimal React text editor served by Deno. It reads and writes one text file through a small WebDAV service running in the same devcontainer. The editor and WebDAV requests are unauthenticated for this local demo.

## Run in the devcontainer

```sh
deno task start
```

Open the **Notes editor** port (8000).

Edits are saved automatically after a short pause. The status indicator shows when changes are saving, saved, or need attention; a failed write can be retried.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `APP_PORT` | `8000` | Port for the editor and same-origin WebDAV proxy |
| `WEBDAV_PORT` | `8788` | Private WebDAV service port (bound to loopback) |
| `EDITOR_FILE` | `notes.txt` | Single text filename stored under `data/` |

`EDITOR_FILE` must be a simple filename without directory components. The document is created as an empty file on first start. The `data/` directory is ignored by Git.

## Access and transport

This demo has no authentication. The WebDAV service is bound to loopback, while the editor and its same-origin proxy are available on the forwarded app port. The app serves plain HTTP; use it only for local development or on a trusted network, and add authentication and TLS before exposing it elsewhere.

## Validate

```sh
deno task test
deno check main.ts webdav.ts webdav.test.ts src/main.tsx
```
