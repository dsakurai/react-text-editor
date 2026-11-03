const port = Number(Deno.env.get("APP_PORT") ?? "8000");
const webDavPort = Number(Deno.env.get("WEBDAV_PORT") ?? "8788");
const editorFile = Deno.env.get("EDITOR_FILE") ?? "notes.txt";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("APP_PORT must be a valid TCP port.");
}
if (!Number.isInteger(webDavPort) || webDavPort < 1 || webDavPort > 65535) {
  throw new Error("WEBDAV_PORT must be a valid TCP port.");
}
if (
  !/^[A-Za-z0-9._-]+$/.test(editorFile) || editorFile === "." ||
  editorFile === ".."
) {
  throw new Error(
    "EDITOR_FILE must be a simple filename without path components.",
  );
}

const script = await Deno.readTextFile("public/app.js");
const styles = await Deno.readTextFile("src/style.css");

await Deno.mkdir("./data", { recursive: true });

const webDavUrl = `http://127.0.0.1:${webDavPort}`;
console.log(`Waiting for WebDAV on 127.0.0.1:${webDavPort}`);
while (true) {
  try {
    await fetch(webDavUrl, {
      method: "OPTIONS",
      signal: AbortSignal.timeout(200),
    });
    break;
  } catch (error) {
    if (
      !(error instanceof TypeError) &&
      !(error instanceof DOMException && error.name === "TimeoutError")
    ) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
console.log(`WebDAV listening on 127.0.0.1:${webDavPort} (rclone)`);

function proxyToWebDav(request: Request): Promise<Response> {
  const headers = new Headers();
  for (const name of ["content-type", "depth"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const target = new URL(request.url);
  target.protocol = "http:";
  target.hostname = "127.0.0.1";
  target.port = String(webDavPort);
  target.pathname = target.pathname.slice("/dav".length);

  return fetch(target, {
    method: request.method,
    headers,
    body: request.method === "PUT" ? request.body : undefined,
    ...(request.method === "PUT" ? { duplex: "half" as const } : {}),
    redirect: "manual",
  }).then((response) => {
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("connection");
    responseHeaders.delete("transfer-encoding");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  });
}

const appServer = Deno.serve(
    {
      hostname: "0.0.0.0",
      port,
      onListen: ({ port }) =>
        console.log(`Editor listening on http://localhost:${port}`),
    },
    async (request) => {
      const url = new URL(request.url);

      if (url.pathname === "/") {
        return new Response(
          `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#f5f4f0">
    <title>Notes</title>
    <link rel="stylesheet" href="/style.css">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/app.js"></script>
  </body>
</html>`,
          { headers: { "content-type": "text/html; charset=utf-8" } },
        );
      }

      if (url.pathname === "/app.js") {
        return new Response(script, {
          headers: {
            "content-type": "text/javascript; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      }

      if (url.pathname === "/config") {
        return Response.json({ filename: editorFile }, {
          headers: { "cache-control": "no-store" },
        });
      }

      if (url.pathname === "/style.css") {
        return new Response(styles, {
          headers: { "content-type": "text/css; charset=utf-8" },
        });
      }

      if (url.pathname === `/dav/${encodeURIComponent(editorFile)}`) {
        if (
          !["GET", "HEAD", "PUT", "OPTIONS", "PROPFIND"].includes(
            request.method,
          )
        ) {
          return new Response("Method not allowed", {
            status: 405,
            headers: { allow: "GET, HEAD, PUT, OPTIONS, PROPFIND" },
          });
        }
        return await proxyToWebDav(request);
      }

      return new Response("Not found", { status: 404 });
    },
);
await appServer.finished;
