import { VisibilityToggle, RandomMetrics } from "./CommentControls";
import { useRef } from "react";
import {
  Bold,
  Highlighter,
  Strikethrough,
  EyeOff,
  Blend,
  Scissors,
  RotateCcw,
  Undo2,
  Redo2,
} from "lucide-react";
import { rebaseMarks, type Mark } from "./model";
import type { Comment } from "./model";
type Props = { c: Comment; update: (value: Partial<Comment>) => void };

export function CommentForm({
  c,
  update,
  canUndo,
  canRedo,
  undo,
  redo,
}: Props & {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  function format(type: Mark) {
    const input = textRef.current;
    const hasSelection = input && input.selectionStart !== input.selectionEnd;
    const start = hasSelection ? input.selectionStart : 0;
    const end = hasSelection ? input.selectionEnd : c.text.length;
    const exists = c.marks.some(
      (m) => m.type === type && m.start === start && m.end === end,
    );
    update({
      marks: exists
        ? c.marks.filter(
            (m) => !(m.type === type && m.start === start && m.end === end),
          )
        : [...c.marks, { start, end, type }],
    });
    input?.focus();
    input?.setSelectionRange(start, end);
  }
  return (
    <section>
      <div className="section-label">
        COMMENT <span>03</span>
      </div>
      <div className="text-editor">
        <div className="format-toolbar">
          {[
            { type: "bold", icon: Bold, label: "Bold" },
            {
              type: "highlight",
              icon: Highlighter,
              label: "Highlight",
            },
            {
              type: "strike",
              icon: Strikethrough,
              label: "Strikethrough",
            },
            { type: "redact", icon: EyeOff, label: "Redact" },
            { type: "blur", icon: Blend, label: "Blur" },
          ].map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              title={`${label} selected text (or all text)`}
              aria-label={label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => format(type as Mark)}
            >
              <Icon size={15} />
            </button>
          ))}
          <button
            title="Remove selected text"
            aria-label="Remove selected text"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const input = textRef.current;
              if (!input || input.selectionStart === input.selectionEnd) return;
              const next =
                c.text.slice(0, input.selectionStart) +
                c.text.slice(input.selectionEnd);
              update({ text: next, marks: rebaseMarks(c, next) });
              input.focus();
            }}
          >
            <Scissors size={14} />
          </button>
          <span className="toolbar-separator" />
          <button
            title="Reset formatting"
            onClick={() => update({ marks: [] })}
          >
            <RotateCcw size={14} />
          </button>
          <div className="toolbar-spacer" />
          <button title="Undo" disabled={!canUndo} onClick={undo}>
            <Undo2 size={15} />
          </button>
          <button title="Redo" disabled={!canRedo} onClick={redo}>
            <Redo2 size={15} />
          </button>
        </div>
        <textarea
          ref={textRef}
          aria-label="Comment text"
          value={c.text}
          maxLength={10000}
          onChange={(e) =>
            update({
              text: e.target.value,
              marks: rebaseMarks(c, e.target.value),
            })
          }
        />
        <div className="text-footer">
          <span>Select text to add formatting</span>
          <span>{c.text.length.toLocaleString()} / 10,000</span>
        </div>
      </div>
      {!(
        c.template === "Comment Reply" ||
        c.template === "Reels Comment" ||
        c.template === "Shorts Comment"
      ) && (
        <>
          <div className="metadata-grid">
            <label>
              <span className="metric-label">
                Timestamp
                <VisibilityToggle
                  c={c}
                  field="showTime"
                  label="Timestamp"
                  update={update}
                />
              </span>
              <div className="time-input">
                <input
                  aria-label="Timestamp"
                  value={c.time}
                  onChange={(e) => update({ time: e.target.value })}
                />
                <select
                  aria-label="Time unit"
                  value={c.unit}
                  onChange={(e) => update({ unit: e.target.value })}
                >
                  {["s", "m", "h", "d", "w", "mo", "y"].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
            </label>
            <label>
              <span className="metric-label">
                Likes
                <VisibilityToggle
                  c={c}
                  field="showLikes"
                  label="Likes"
                  update={update}
                />
              </span>
              <input
                aria-label="Like count"
                value={c.likes}
                onChange={(e) => update({ likes: e.target.value })}
              />
            </label>
            <label>
              <span className="metric-label">
                Replies
                <VisibilityToggle
                  c={c}
                  field="showReplies"
                  label="Replies"
                  update={update}
                />
              </span>
              <input
                aria-label="Reply count"
                value={c.replies}
                onChange={(e) => update({ replies: e.target.value })}
              />
            </label>
          </div>
          {c.platform === "x" && (
            <label className="field-label">
              <span className="metric-label">
                Reposts
                <VisibilityToggle
                  c={c}
                  field="showReposts"
                  label="Reposts"
                  update={update}
                />
              </span>
              <input
                aria-label="Reposts"
                value={c.reposts}
                onChange={(e) => update({ reposts: e.target.value })}
              />
            </label>
          )}
          {c.platform === "x" && (
            <label className="field-label">
              <span className="metric-label">
                Views
                <VisibilityToggle
                  c={c}
                  field="showViews"
                  label="Views"
                  update={update}
                />
              </span>
              <input
                aria-label="View count"
                value={c.views || "12K"}
                onChange={(e) => update({ views: e.target.value })}
              />
            </label>
          )}
          <div className="random-metrics">
            <RandomMetrics update={update} />
          </div>
        </>
      )}
    </section>
  );
}
