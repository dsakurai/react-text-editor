const port = Number(Deno.env.get("APP_PORT") ?? "8000");
const editorFile = Deno.env.get("EDITOR_FILE") ?? "notes.txt";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("APP_PORT must be a valid TCP port.");
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
const documentPath = `./data/${editorFile}`;
try {
  await Deno.stat(documentPath);
} catch (error) {
  if (!(error instanceof Deno.errors.NotFound)) throw error;
  await Deno.writeTextFile(documentPath, "");
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

    if (url.pathname === "/document") {
      if (request.method === "GET") {
        const contents = await Deno.readTextFile(documentPath);
        return new Response(contents, {
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }
      if (request.method === "PUT") {
        await Deno.writeTextFile(documentPath, await request.text());
        return new Response(null, { status: 204 });
      }
      return new Response("Method not allowed", {
        status: 405,
        headers: { allow: "GET, PUT" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
);
await appServer.finished;
