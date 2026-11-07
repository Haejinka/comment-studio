import { Eye, EyeOff, Shuffle } from "lucide-react";
import type { Comment } from "./model";
export type VisibilityKey =
  | "showProfile"
  | "showTime"
  | "showLikes"
  | "showReplies"
  | "showReposts"
  | "showViews";
export function VisibilityToggle({
  c,
  field,
  label,
  update,
}: {
  c: Comment;
  field: VisibilityKey;
  label: string;
  update: (value: Partial<Comment>) => void;
}) {
  const on = c[field] !== false;
  return (
    <button
      type="button"
      className={`visibility-toggle ${on ? "visible" : ""}`}
      title={`${on ? "Hide" : "Show"} ${label.toLowerCase()}`}
      aria-label={`Show ${label.toLowerCase()}`}
      role="switch"
      aria-checked={on}
      onClick={() => update({ [field]: !on })}
    >
      {on ? <Eye size={13} /> : <EyeOff size={13} />}
    </button>
  );
}
export function RandomIdentity({
  update,
}: {
  update: (value: Partial<Comment>) => void;
}) {
  return (
    <button
      className="small-button"
      title="Generate random identity"
      onClick={() => {
        const first = [
          "Alex",
          "Jordan",
          "Sam",
          "Morgan",
          "Taylor",
          "Jamie",
          "Casey",
          "Riley",
        ][Math.floor(Math.random() * 8)];
        const suffix = ["creates", "designs", "films", "studio", "makes"][
          Math.floor(Math.random() * 5)
        ];
        const n = Math.floor(Math.random() * 900) + 100;
        update({
          username: `${first.toLowerCase()}.${suffix}${n}`,
          handle: `${first.toLowerCase()}${n}`,
          avatar: "",
          avatarColor: ["#cbd6dc", "#d7c8f6", "#b9dcd1", "#f1c7a6", "#b9d0ec"][
            Math.floor(Math.random() * 5)
          ],
        });
      }}
    >
      <Shuffle size={13} />
      Random identity
    </button>
  );
}
export function RandomMetrics({
  update,
}: {
  update: (value: Partial<Comment>) => void;
}) {
  return (
    <button
      className="small-button"
      title="Generate random engagement metrics"
      onClick={() =>
        update({
          likes: (Math.floor(Math.random() * 9900) + 100).toLocaleString(
            "en-US",
          ),
          replies: String(Math.floor(Math.random() * 99) + 1),
          reposts: String(Math.floor(Math.random() * 50) + 1),
          views: `${Math.floor(Math.random() * 99) + 1}K`,
          time: String(Math.floor(Math.random() * 23) + 1),
        })
      }
    >
      <Shuffle size={13} />
      Randomize metrics
    </button>
  );
}
