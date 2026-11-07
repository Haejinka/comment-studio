import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Image, Expand } from "lucide-react";
import { labels, type Comment, type Settings } from "./model";
import { ExportAsset, cardWidth } from "./renderers";
export function PreviewWorkspace({
  c,
  settings,
  setting,
}: {
  c: Comment;
  settings: Settings;
  setting: (value: Partial<Settings>) => void;
}) {
  const [zoom, setZoom] = useState("fit");
  const [checker, setChecker] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const [assetHeight, setAssetHeight] = useState(200);
  useEffect(() => {
    const el = stageRef.current;
    const asset = previewRef.current;
    if (!el || !asset) return;
    const resize = () => {
      setAssetHeight(asset.offsetHeight);
      setFit(
        Math.max(
          0.05,
          Math.min(
            1,
            (el.clientWidth - 64) / asset.offsetWidth,
            (el.clientHeight - 120) / asset.offsetHeight,
          ),
        ),
      );
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    observer.observe(asset);
    resize();
    return () => observer.disconnect();
  }, [settings.padding, c.template]);
  const scale = zoom === "fit" ? fit : Number(zoom);
  return (
    <main className="workspace">
      <div className="workspace-toolbar">
        <div>
          <span className="workspace-title">Live preview</span>
          <span className="preview-tag">
            {labels[c.platform]} <span>/</span> {c.template}
          </span>
        </div>
        <div className="theme-switch" aria-label="Comment theme">
          <button
            title="Light theme"
            aria-label="Light theme"
            className={settings.theme === "light" ? "active" : ""}
            onClick={() => setting({ theme: "light" })}
          >
            <Sun size={15} />
          </button>
          <button
            title="Dark theme"
            aria-label="Dark theme"
            className={settings.theme === "dark" ? "active" : ""}
            onClick={() => setting({ theme: "dark" })}
          >
            <Moon size={15} />
          </button>
        </div>
      </div>
      <div
        className={`preview-stage ${checker ? "checker-enabled" : ""}`}
        ref={stageRef}
      >
        <div className="preview-caption">
          <span className="live-dot" />
          YOUR COMMENT, READY FOR ITS CLOSE-UP
        </div>
        <div
          className="preview-fit"
          style={{
            width: (cardWidth(c) + settings.padding * 2) * scale,
            height: assetHeight * scale,
            maxWidth: "none",
            flexShrink: 0,
          }}
        >
          <div
            ref={previewRef}
            className="preview-scaled"
            data-testid="preview"
            style={{ transform: `scale(${scale})`, width: "max-content" }}
          >
            <ExportAsset comment={c} settings={settings} />
          </div>
        </div>
        <div className="asset-caption">
          <Image size={13} />
          <span>
            {settings.background === "transparent"
              ? "Transparent PNG"
              : "Solid background PNG"}
          </span>
          <span>·</span>
          <span>{settings.scale}× resolution</span>
          <span>·</span>
          <span>Auto-sized to your comment</span>
        </div>
      </div>
      <div className="workspace-bottom">
        <div className="workspace-tip">
          <span className="keycap">↵</span>Made for your next great video.
        </div>
        <div className="zoom-controls">
          <button
            className={checker ? "active" : ""}
            title="Toggle transparency grid"
            aria-label="Toggle transparency grid"
            onClick={() => setChecker(!checker)}
          >
            <span className="checker-icon" />
          </button>
          <span className="toolbar-separator" />
          {["fit", "1", "1.5", "2"].map((z) => (
            <button
              className={zoom === z ? "active" : ""}
              key={z}
              onClick={() => setZoom(z)}
            >
              {z === "fit" ? (
                <>
                  <Expand size={12} />
                  Fit
                </>
              ) : (
                `${Number(z) * 100}%`
              )}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
