# Plaintext Notes

A minimal React text editor served by Deno. It reads and writes one text file through rclone's WebDAV server running in the same devcontainer. The editor and WebDAV requests are unauthenticated for this local demo.

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
| `WEBDAV_PORT` | `8788` | Private rclone WebDAV service port (bound to loopback) |
| `EDITOR_FILE` | `notes.txt` | Single text filename stored under `data/` |

`EDITOR_FILE` must be a simple filename without directory components. The document is created as an empty file on first start. The `data/` directory is ignored by Git.

## Access and transport

This demo has no authentication. `deno task start` builds the app and runs the app and rclone tasks concurrently. The app waits for WebDAV to become available before serving requests. rclone is bound to loopback and filtered to `EDITOR_FILE`; the editor and its same-origin proxy are available on the forwarded app port. The app serves plain HTTP; use it only for local development or on a trusted network, and add authentication and TLS before exposing it elsewhere. The `serve:rclone` task requires rclone and a POSIX shell (`sh`) to be installed and on `PATH`.

## Validate

```sh
deno check main.ts src/main.tsx
```
