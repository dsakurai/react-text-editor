# Plaintext Notes

A minimal React text editor served by Deno. It reads and writes one text file directly through a same-origin Deno endpoint. The editor is unauthenticated for this local demo.

## Run in the devcontainer

```sh
deno task start
```

Open the **Notes editor** port (8000).

Edits are saved automatically after a short pause. The status indicator shows when changes are saving, saved, or need attention; a failed write can be retried.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `APP_PORT` | `8000` | Port for the editor and document API |
| `EDITOR_FILE` | `notes.txt` | Single text filename stored under `data/` |

`EDITOR_FILE` must be a simple filename without directory components. The document is created as an empty file on first start. The `data/` directory is ignored by Git.

## Access and transport

This demo has no authentication. `deno task start` builds and runs the app; Deno reads and writes only the configured file under `data/`. The app serves plain HTTP; use it only for local development or on a trusted network, and add authentication and TLS before exposing it elsewhere.

## Validate

```sh
deno check main.ts src/main.tsx
```
