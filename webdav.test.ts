import { createWebDavHandler } from "./webdav.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

Deno.test("WebDAV supports unauthenticated reading, writing, and discovery", async () => {
  const originalDirectory = Deno.cwd();
  const temporaryDirectory = await Deno.makeTempDir();

  Deno.chdir(temporaryDirectory);

  try {
    const handler = createWebDavHandler({ editorFile: "notes.txt" });
    const url = "http://127.0.0.1/dav/notes.txt";
    const initialRead = await handler(new Request(url));
    assert(initialRead.status === 200, "The file should load without credentials.");
    assert((await initialRead.text()) === "", "The new file should be empty.");

    const write = await handler(new Request(url, { method: "PUT", body: "A note" }));
    assert(write.status === 204, "A successful write should return 204.");

    const read = await handler(new Request(url));
    assert((await read.text()) === "A note", "The written content should be readable.");

    const propfind = await handler(new Request(url, { method: "PROPFIND" }));
    assert(propfind.status === 207, "PROPFIND should return a multistatus response.");
    assert(
      (await propfind.text()).includes("<D:displayname>notes.txt</D:displayname>"),
      "PROPFIND should identify the configured file.",
    );
  } finally {
    Deno.chdir(originalDirectory);
    await Deno.remove(temporaryDirectory, { recursive: true });
  }
});

Deno.test("WebDAV only accepts a simple filename", () => {
  let thrown = false;
  try {
    createWebDavHandler({ editorFile: "../secrets.txt" });
  } catch (error) {
    thrown = error instanceof Error && error.message.includes("EDITOR_FILE must be a simple filename");
  }
  assert(thrown, "Path components must be rejected.");
});
