import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

type SaveStatus = "loading" | "saved" | "saving" | "error";

function NotesEditor() {
  const [filename, setFilename] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const version = useRef(0);
  const lastSavedText = useRef("");
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;

    async function loadFile() {
      try {
        const configResponse = await fetch("/config", { cache: "no-store" });
        if (!configResponse.ok) throw new Error("Could not load editor settings.");
        const config: { filename: string } = await configResponse.json();
        const response = await fetch(`/dav/${encodeURIComponent(config.filename)}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) throw new Error(`Could not load ${config.filename} (HTTP ${response.status}).`);
        const contents = await response.text();

        if (active) {
          setFilename(config.filename);
          setText(contents);
          lastSavedText.current = contents;
          setLoaded(true);
          setStatus("saved");
        }
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Could not load the document.");
          setStatus("error");
        }
      }
    }

    void loadFile();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded || text === lastSavedText.current) return;

    const snapshot = text;
    const savedVersion = version.current;
    const timeout = setTimeout(() => {
      setStatus("saving");
      setError("");

      saveQueue.current = saveQueue.current.catch(() => {}).then(async () => {
        const response = await fetch(`/dav/${encodeURIComponent(filename)}`, {
          method: "PUT",
          headers: { "content-type": "text/plain; charset=utf-8" },
          body: snapshot,
          credentials: "same-origin",
        });
        if (!response.ok) {
          throw new Error(`Could not save ${filename} (HTTP ${response.status}).`);
        }
        lastSavedText.current = snapshot;
      }).then(() => {
        if (savedVersion === version.current) setStatus("saved");
      }).catch((cause: unknown) => {
        if (savedVersion === version.current) {
          setError(cause instanceof Error ? cause.message : "Could not save the document.");
          setStatus("error");
        }
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [filename, loaded, text]);

  function retrySave() {
    if (!loaded) return;
    setStatus("saving");
    setError("");
    const snapshot = text;
    const savedVersion = version.current;
    saveQueue.current = saveQueue.current.catch(() => {}).then(async () => {
      const response = await fetch(`/dav/${encodeURIComponent(filename)}`, {
        method: "PUT",
        headers: { "content-type": "text/plain; charset=utf-8" },
        body: snapshot,
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(`Could not save ${filename} (HTTP ${response.status}).`);
      lastSavedText.current = snapshot;
    }).then(() => {
      if (savedVersion === version.current) setStatus("saved");
    }).catch((cause: unknown) => {
      if (savedVersion === version.current) {
        setError(cause instanceof Error ? cause.message : "Could not save the document.");
        setStatus("error");
      }
    });
  }

  const statusLabel = {
    loading: "Opening document…",
    saving: "Saving…",
    saved: "All changes saved",
    error: "Save needs attention",
  }[status];

  return (
    <main className="workspace">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Notes home">
          <span className="wordmark-icon" aria-hidden="true">n.</span>
          <span>plaintext</span>
        </a>
        <div className={`save-status save-status--${status}`} aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          <span>{statusLabel}</span>
        </div>
      </header>

      <section className="editor-shell" aria-label="Text editor">
        <div className="document-heading">
          <div className="eyebrow">YOUR SPACE <span> / </span> DOCUMENT</div>
          <h1>{filename || "Opening document"}</h1>
          <p>Just you and the page.</p>
        </div>

        {error && (
          <div className="error-message" role="alert">
            <span>{error}</span>
            <button
              type="button"
              className="retry-button"
              onClick={loaded ? retrySave : () => window.location.reload()}
            >
              {loaded ? "Retry save" : "Retry loading"}
            </button>
          </div>
        )}

        <textarea
          aria-label="Document text"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          disabled={!loaded}
          onChange={(event) => {
            version.current += 1;
            setText(event.currentTarget.value);
          }}
          placeholder={loaded ? "Start writing…" : "Loading your document…"}
          spellCheck={false}
          value={text}
        />
        <footer className="editor-footer">
          <span>PLAIN TEXT</span>
          <span>{text.length.toLocaleString()} CHARACTERS</span>
        </footer>
      </section>

      <p className="footnote">Your words stay in your WebDAV space.</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<NotesEditor />);
