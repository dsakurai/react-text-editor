import { join } from "node:path";

interface WebDavOptions {
  editorFile: string;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
  })[character]!);
}

export function createWebDavHandler({ editorFile }: WebDavOptions) {
  if (!/^[A-Za-z0-9._-]+$/.test(editorFile) || editorFile === "." || editorFile === "..") {
    throw new Error("EDITOR_FILE must be a simple filename without path components.");
  }

  const filePath = join(Deno.cwd(), "data", editorFile);
  const fileName = escapeXml(editorFile);
  const fileUrl = `/dav/${encodeURIComponent(editorFile)}`;
  const allowedMethods = "GET, HEAD, PUT, OPTIONS, PROPFIND";

  Deno.mkdirSync(join(Deno.cwd(), "data"), { recursive: true });

  try {
    Deno.statSync(filePath);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
    Deno.writeTextFileSync(filePath, "");
  }

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (url.pathname !== fileUrl) {
      return new Response("Not found", { status: 404 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: {
          allow: allowedMethods,
          dav: "1",
          "content-length": "0",
        },
      });
    }

    if (request.method === "PROPFIND") {
      const body = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>${fileUrl}</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>${fileName}</D:displayname>
        <D:resourcetype/>
        <D:getcontenttype>text/plain</D:getcontenttype>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`;
      return new Response(body, {
        status: 207,
        headers: { "content-type": "application/xml; charset=utf-8", dav: "1" },
      });
    }

    if (request.method === "PUT") {
      await Deno.writeFile(filePath, request.body ?? new Uint8Array());
      return new Response(null, { status: 204 });
    }

    if (request.method === "GET" || request.method === "HEAD") {
      const contents = await Deno.readFile(filePath);
      return new Response(request.method === "HEAD" ? null : contents, {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
          "content-length": String(contents.byteLength),
        },
      });
    }

    return new Response("Method not allowed", {
      status: 405,
      headers: { allow: allowedMethods },
    });
  };
}
