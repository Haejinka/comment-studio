import {
  isDesktop,
  copyImage,
  copyText,
  setAppTheme as setNativeAppTheme,
} from "./native";
import { makeBackup, parseBackup } from "./backups";
import { useDraftPersistence } from "./storage";
import { PlatformSelector } from "./PlatformSelector";
import { ProfileEditor } from "./ProfileEditor";
import { CommentForm } from "./CommentForm";
import { PreviewWorkspace } from "./PreviewWorkspace";
import { exportBatch } from "./bulkExport";
import { useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Download,
  Copy,
  ChevronDown,
  Upload,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  RotateCcw,
  CheckCheck,
  FileDown,
  Bookmark,
  ShieldCheck,
  Settings2,
  X,
  Sun,
  Moon,
} from "lucide-react";
import Papa from "papaparse";
import {
  freshComment,
  defaultSettings,
  loadDraft,
  STORAGE_KEY,
  platforms,
  labels,
  templates,
  type Comment,
  type Settings,
  type Platform,
} from "./model";
import { ExportAsset } from "./renderers";
import { capture, download, filename } from "./export";
const initial = loadDraft();
export default function App() {
  const [comments, setComments] = useState<Comment[]>(
    initial?.comments || [freshComment()],
  );
  const [active, setActive] = useState<string>(initial?.active || "");
  const [settings, setSettings] = useState<Settings>({
    ...defaultSettings,
    ...initial?.settings,
  });
  const [appTheme, setAppTheme] = useState<"light" | "dark">(() => {
    try {
      return localStorage.getItem("comment-studio-ui-theme") === "light"
        ? "light"
        : "dark";
    } catch {
      return "dark";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("comment-studio-ui-theme", appTheme);
    } catch {}
    void setNativeAppTheme(appTheme).catch(() => {});
  }, [appTheme]);
  const [bulk, setBulk] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [presets, setPresets] = useState<Comment[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("comment-presets") || "[]");
    } catch {
      return [];
    }
  });
  const [history, setHistory] = useState<Comment[][]>([]);
  const [future, setFuture] = useState<Comment[][]>([]);
  const exportRef = useRef<HTMLDivElement>(null);
  const c = comments.find((x) => x.id === active) || comments[0];
  function commit(next: Comment[]) {
    setHistory((h) => [...h.slice(-79), comments]);
    setFuture([]);
    setComments(next);
  }
  function update(p: Partial<Comment>) {
    commit(comments.map((x) => (x.id === c.id ? { ...x, ...p } : x)));
  }
  function setting(p: Partial<Settings>) {
    setSettings((s) => ({ ...s, ...p }));
  }
  function undo() {
    if (!history.length) return;
    setFuture((f) => [comments, ...f]);
    setComments(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  }
  function redo() {
    if (!future.length) return;
    setHistory((h) => [...h, comments]);
    setComments(future[0]);
    setFuture((f) => f.slice(1));
  }
  const saved = useDraftPersistence(comments, c.id, settings, setStatus);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "z" &&
        !(
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLInputElement
        )
      ) {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [history, future, comments]);
  async function runExport(copy = false) {
    setBusy(true);
    setStatus("Rendering your PNG…");
    try {
      const blob = await capture(exportRef.current!, settings);
      if (copy) {
        try {
          await copyImage(blob);
          setStatus("PNG copied to clipboard.");
        } catch {
          const saved = await download(blob, filename(c));
          setStatus(
            saved
              ? isDesktop
                ? "Clipboard unavailable. Saved the PNG instead."
                : "Clipboard unavailable or denied. Downloaded the PNG instead."
              : "Clipboard unavailable. Save cancelled.",
          );
        }
      } else {
        const saved = await download(blob, filename(c));
        setStatus(
          saved
            ? isDesktop
              ? "PNG saved."
              : "PNG generated and download started."
            : "Save cancelled.",
        );
      }
    } catch (e) {
      setStatus(`Export failed: ${(e as Error).message} You can retry.`);
    } finally {
      setBusy(false);
    }
  }
  async function bulkExport(onlySelected: boolean) {
    const list = onlySelected
      ? comments.filter((x) => selected.includes(x.id))
      : comments;
    if (!list.length) {
      setStatus("Select at least one comment to export.");
      return;
    }
    setBusy(true);
    try {
      setStatus(await exportBatch(list, settings, setStatus));
    } catch (e) {
      setStatus("Bulk export failed: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function add(source?: Comment) {
    const next = source
      ? { ...source, id: crypto.randomUUID() }
      : freshComment();
    commit([...comments, next]);
    setActive(next.id);
  }
  function move(id: string, by: number) {
    const list = [...comments];
    const i = list.findIndex((x) => x.id === id);
    if (i + by < 0 || i + by >= list.length) return;
    [list[i], list[i + by]] = [list[i + by], list[i]];
    commit(list);
  }
  async function importCSV(file?: File) {
    if (!file) return;
    const result = Papa.parse<Record<string, string>>(await file.text(), {
      header: true,
      skipEmptyLines: true,
    });
    if (result.errors.length) {
      setStatus(`CSV error: ${result.errors[0].message}`);
      return;
    }
    if (!result.meta.fields?.includes("text")) {
      setStatus(
        "CSV needs a text column. Download the sample for the supported format.",
      );
      return;
    }
    const imported = result.data.slice(0, 500).map((row) => {
      const base = freshComment();
      const p = platforms.includes(row.platform as Platform)
        ? (row.platform as Platform)
        : base.platform;
      return {
        ...base,
        platform: p,
        template: templates[p].includes(row.template)
          ? row.template
          : templates[p][0],
        username: row.username || base.username,
        text: row.text || "",
        handle: row.handle || base.handle,
        likes: row.likes || "0",
        replies: row.replies || "0",
        time: row.time || "1",
        unit: row.unit || "h",
        verified: row.verified === "true",
      };
    });
    if (!imported.length) return setStatus("No comments found in CSV.");
    commit([...comments, ...imported]);
    setActive(imported[0].id);
    setStatus(
      `Imported ${imported.length} comments${result.data.length > 500 ? " (500-row limit)" : ""}.`,
    );
  }
  async function exportBackup() {
    try {
      const saved = await download(
        makeBackup(comments, presets, settings),
        "comment-studio-drafts.json",
      );
      setStatus(saved ? "Draft backup exported." : "Save cancelled.");
    } catch (error) {
      setStatus("Backup failed: " + (error as Error).message);
    }
  }
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 30000000)
        throw new Error("Backup must be smaller than 30 MB.");
      const backup = parseBackup(JSON.parse(await file.text()));
      commit(backup.comments);
      setActive(backup.comments[0].id);
      setSettings(backup.settings);
      setPresets(backup.presets);
      localStorage.setItem("comment-presets", JSON.stringify(backup.presets));
      setStatus("Draft backup imported.");
    } catch (error) {
      setStatus("Import failed: " + (error as Error).message);
    }
  }
  function resetAll() {
    const item = freshComment();
    commit([item]);
    setActive(item.id);
    setSettings(defaultSettings);
    setSelected([]);
    setPresets([]);
    localStorage.removeItem("comment-presets");
    localStorage.removeItem(STORAGE_KEY);
    setStatus("Saved state cleared; a fresh draft is ready.");
  }
  return (
    <div className={`app-shell ui-${appTheme}`}>
      <header className="app-header">
        <div className="wordmark">
          <span className="logo">
            <MessageSquare size={20} />
          </span>
          comment<span className="wordmark-light">studio</span>
        </div>
        <div className="header-right">
          <div
            className="app-theme-control"
            role="group"
            aria-label="App appearance"
          >
            <button
              aria-label="Light app mode"
              aria-pressed={appTheme === "light"}
              className={appTheme === "light" ? "active" : ""}
              onClick={() => setAppTheme("light")}
            >
              <Sun size={14} />
              Light
            </button>
            <button
              aria-label="Dark app mode"
              aria-pressed={appTheme === "dark"}
              className={appTheme === "dark" ? "active" : ""}
              onClick={() => setAppTheme("dark")}
            >
              <Moon size={14} />
              Dark
            </button>
          </div>
          <span className="save-state">
            <span />
            {saved ? "All changes saved" : "Saving…"}
          </span>
        </div>
      </header>
      <div className="editor-layout">
        <aside className="sidebar">
          <div className="sidebar-scroll">
            <div className="section-intro">
              <div>
                <h1>Comment editor</h1>
                <p>A little comment. A big conversation.</p>
              </div>
              <span className="version">01</span>
            </div>
            <div className="mode-switch">
              <button
                className={!bulk ? "active" : ""}
                onClick={() => setBulk(false)}
              >
                <MessageSquare size={15} />
                Single mode
              </button>
              <button
                className={bulk ? "active" : ""}
                onClick={() => setBulk(true)}
              >
                <Layers size={15} />
                Bulk mode <span className="count">{comments.length}</span>
              </button>
            </div>
            {bulk && (
              <section className="bulk-panel">
                <div className="section-label">
                  YOUR COMMENTS{" "}
                  <button title="Add comment" onClick={() => add()}>
                    <Plus size={17} />
                  </button>
                </div>
                <div className="bulk-list">
                  {comments.map((item, i) => (
                    <div
                      className={`bulk-row ${c.id === item.id ? "current" : ""}`}
                      key={item.id}
                    >
                      <input
                        aria-label={`Select comment ${i + 1}`}
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={(e) =>
                          setSelected((s) =>
                            e.target.checked
                              ? [...s, item.id]
                              : s.filter((id) => id !== item.id),
                          )
                        }
                      />
                      <button
                        className="bulk-name"
                        onClick={() => setActive(item.id)}
                      >
                        {item.username}
                        <small>{item.text}</small>
                      </button>
                      <button
                        title="Move up"
                        onClick={() => move(item.id, -1)}
                        disabled={i === 0}
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        title="Move down"
                        onClick={() => move(item.id, 1)}
                        disabled={i === comments.length - 1}
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        title="Duplicate comment"
                        onClick={() => add(item)}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        title="Remove comment"
                        disabled={comments.length === 1}
                        onClick={() => {
                          commit(comments.filter((x) => x.id !== item.id));
                          setSelected((s) => s.filter((id) => id !== item.id));
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="bulk-tools">
                  <label className="small-button">
                    <Upload size={13} />
                    Import CSV
                    <input
                      type="file"
                      accept=".csv"
                      hidden
                      onChange={(e) => {
                        void importCSV(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    className="small-button"
                    onClick={async () => {
                      try {
                        const saved = await download(
                          new Blob(
                            [
                              Papa.unparse([
                                {
                                  platform: "tiktok",
                                  template: "Comment Reply",
                                  username: "alex.creates",
                                  text: "This is your first comment 👋",
                                  likes: "128",
                                  replies: "3",
                                  time: "2",
                                  unit: "h",
                                  verified: "false",
                                },
                                {
                                  platform: "instagram",
                                  template: "Post Comment",
                                  username: "sam",
                                  text: "Another comment",
                                  likes: "42",
                                  replies: "2",
                                  time: "1",
                                  unit: "d",
                                  verified: "true",
                                },
                              ]),
                            ],
                            { type: "text/csv" },
                          ),
                          "sample-comments.csv",
                        );
                        setStatus(
                          saved ? "Sample CSV exported." : "Save cancelled.",
                        );
                      } catch (error) {
                        setStatus(
                          "CSV export failed: " + (error as Error).message,
                        );
                      }
                    }}
                  >
                    <FileDown size={13} />
                    Sample CSV
                  </button>
                </div>
              </section>
            )}
            <PlatformSelector c={c} update={update} />
            <ProfileEditor c={c} update={update} onError={setStatus} />
            <CommentForm
              c={c}
              update={update}
              canUndo={!!history.length}
              canRedo={!!future.length}
              undo={undo}
              redo={redo}
            />
            <details className="export-settings">
              <summary>
                <Settings2 size={15} />
                Export settings
                <ChevronDown size={14} />
              </summary>
              <div className="settings-content">
                <label>
                  Resolution
                  <select
                    aria-label="Resolution"
                    value={settings.scale}
                    onChange={(e) => setting({ scale: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}× {n === 2 ? "(recommended)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Background
                  <select
                    aria-label="Background"
                    value={settings.background}
                    onChange={(e) =>
                      setting({
                        background: e.target.value as Settings["background"],
                      })
                    }
                  >
                    <option value="transparent">Transparent</option>
                    <option value="solid">Solid color</option>
                  </select>
                </label>
                {settings.background === "solid" && (
                  <label>
                    Background color
                    <input
                      aria-label="Background color"
                      type="color"
                      value={settings.color}
                      onChange={(e) => setting({ color: e.target.value })}
                    />
                  </label>
                )}
                <label>
                  Padding (px)
                  <input
                    aria-label="Padding"
                    type="number"
                    min={0}
                    max={120}
                    value={settings.padding}
                    onChange={(e) =>
                      setting({
                        padding: Math.max(
                          0,
                          Math.min(120, Number(e.target.value)),
                        ),
                      })
                    }
                  />
                </label>
              </div>
            </details>
            <details className="presets">
              <summary>
                <Bookmark size={15} />
                Saved presets
                <ChevronDown size={14} />
              </summary>
              <button
                className="small-button"
                onClick={() => {
                  const next = [...presets, { ...c, id: crypto.randomUUID() }];
                  setPresets(next);
                  localStorage.setItem("comment-presets", JSON.stringify(next));
                }}
              >
                <Plus size={13} />
                Save current comment
              </button>
              {presets.map((p) => (
                <div className="preset-row" key={p.id}>
                  <button onClick={() => update({ ...p, id: c.id })}>
                    {p.username} · {p.text.slice(0, 28)}
                  </button>
                  <button
                    title="Delete preset"
                    onClick={() => {
                      const next = presets.filter((x) => x.id !== p.id);
                      setPresets(next);
                      localStorage.setItem(
                        "comment-presets",
                        JSON.stringify(next),
                      );
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </details>
            <details className="presets draft-backups">
              <summary>
                <FileDown size={15} />
                Draft backups
                <ChevronDown size={14} />
              </summary>
              <p className="backup-help">
                Move drafts between the browser and Windows app. Import replaces
                current drafts.
              </p>
              <div className="bulk-tools">
                <button
                  className="small-button"
                  onClick={() => void exportBackup()}
                >
                  <Download size={13} />
                  Export backup
                </button>
                <label className="small-button">
                  <Upload size={13} />
                  Import backup
                  <input
                    aria-label="Import draft backup"
                    type="file"
                    accept=".json,application/json"
                    hidden
                    onChange={(e) => {
                      void importBackup(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </details>
            <div className="reset-row">
              <button onClick={() => update({ ...freshComment(), id: c.id })}>
                <RotateCcw size={13} />
                Reset draft
              </button>
              <button onClick={resetAll}>Clear saved state</button>
            </div>
          </div>
          <div className="export-footer">
            {bulk ? (
              <>
                <button
                  className="primary-button"
                  disabled={busy}
                  onClick={() => void bulkExport(false)}
                >
                  <Download size={17} />
                  {busy ? "Exporting…" : `Export all ${comments.length} as ZIP`}
                </button>
                <button
                  className="secondary-button"
                  disabled={busy || !selected.length}
                  onClick={() => void bulkExport(true)}
                >
                  Export selected ({selected.length})
                </button>
              </>
            ) : (
              <>
                <button
                  className="primary-button"
                  disabled={busy}
                  onClick={() => void runExport()}
                >
                  <Download size={17} />
                  {busy ? "Rendering…" : "Export image"}
                  <span>PNG</span>
                </button>
                <div className="export-secondary">
                  <button
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => void runExport(true)}
                  >
                    <Copy size={14} />
                    Copy image
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      copyText(c.text)
                        .then(() => setStatus("Comment text copied."))
                        .catch(() =>
                          setStatus(
                            "Clipboard permission denied. Select and copy text from the editor.",
                          ),
                        );
                    }}
                  >
                    Copy text
                  </button>
                </div>
              </>
            )}
            <p>
              <ShieldCheck size={11} />
              Everything stays on your device
            </p>
          </div>
        </aside>
        <PreviewWorkspace c={c} settings={settings} setting={setting} />
      </div>
      <div className="capture-host" aria-hidden="true">
        <div ref={exportRef} style={{ width: "max-content" }}>
          <ExportAsset comment={c} settings={settings} />
        </div>
      </div>
      {status && (
        <div className="toast" role="status">
          <CheckCheck size={17} />
          <span>{status}</span>
          <button title="Dismiss notification" onClick={() => setStatus("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
