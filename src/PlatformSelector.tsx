import { Instagram, Youtube, ChevronDown } from "lucide-react";
import { platforms, labels, templates, type Platform } from "./model";
import type { Comment } from "./model";
type Props = { c: Comment; update: (value: Partial<Comment>) => void };
function PlatformIcon({ platform }: { platform: Platform }) {
  if (platform === "instagram") return <Instagram size={21} />;
  if (platform === "youtube") return <Youtube size={22} />;
  return (
    <span className="brand-glyph">{platform === "tiktok" ? "♪" : "𝕏"}</span>
  );
}

export function PlatformSelector({ c, update }: Props) {
  return (
    <section>
      <div className="section-label">
        PLATFORM <span>01</span>
      </div>
      <div className="platform-grid">
        {platforms.map((p) => (
          <button
            key={p}
            aria-label={labels[p]}
            className={c.platform === p ? "selected" : ""}
            onClick={() => update({ platform: p, template: templates[p][0] })}
          >
            <PlatformIcon platform={p} />
            <span>{labels[p]}</span>
            {c.platform === p && <span className="selected-dot" />}
          </button>
        ))}
      </div>
      <label className="field-label" htmlFor="template">
        Comment template
      </label>
      <div className="select-wrap">
        <select
          id="template"
          value={c.template}
          onChange={(e) => update({ template: e.target.value })}
        >
          {templates[c.platform].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <ChevronDown size={15} />
      </div>
    </section>
  );
}
