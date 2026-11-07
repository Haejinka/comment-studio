import {
  freshComment,
  defaultSettings,
  platforms,
  templates,
  type Comment,
  type Settings,
  type Mark,
} from "./model";
export interface DraftBackup {
  format: "comment-studio-backup";
  version: 1;
  comments: Comment[];
  presets: Comment[];
  settings: Settings;
}
export function makeBackup(
  comments: Comment[],
  presets: Comment[],
  settings: Settings,
): Blob {
  return new Blob(
    [
      JSON.stringify(
        {
          format: "comment-studio-backup",
          version: 1,
          comments,
          presets,
          settings,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
}
export function parseBackup(raw: unknown): DraftBackup {
  if (!raw || typeof raw !== "object") throw new Error("Invalid backup file.");
  const data = raw as Record<string, unknown>;
  if (
    data.format !== "comment-studio-backup" ||
    data.version !== 1 ||
    !Array.isArray(data.comments) ||
    !data.comments.length ||
    data.comments.length > 500
  )
    throw new Error(
      "Choose a Comment Studio v1 backup containing 1–500 comments.",
    );
  function comment(raw: unknown): Comment {
    if (!raw || typeof raw !== "object")
      throw new Error("Invalid comment record.");
    const c = raw as Record<string, unknown>;
    if (
      !platforms.includes(c.platform as Comment["platform"]) ||
      typeof c.text !== "string" ||
      c.text.length > 10000
    )
      throw new Error("Backup contains an invalid platform or comment.");
    const next = freshComment();
    next.platform = c.platform as Comment["platform"];
    next.template = templates[next.platform].includes(String(c.template))
      ? String(c.template)
      : templates[next.platform][0];
    for (const key of [
      "username",
      "handle",
      "text",
      "time",
      "unit",
      "likes",
      "replies",
      "reposts",
      "views",
    ] as const)
      if (typeof c[key] === "string") next[key] = c[key] as string;
    if (
      typeof c.avatar === "string" &&
      c.avatar.length <= 5000000 &&
      (c.avatar === "" ||
        /^data:image\/(png|jpeg|webp|gif);base64,/.test(c.avatar))
    )
      next.avatar = c.avatar;
    if (
      typeof c.avatarColor === "string" &&
      /^#[\da-f]{6}$/i.test(c.avatarColor)
    )
      next.avatarColor = c.avatarColor;
    for (const key of [
      "verified",
      "showProfile",
      "showTime",
      "showLikes",
      "showReplies",
      "showReposts",
      "showViews",
    ] as const)
      if (typeof c[key] === "boolean") next[key] = c[key] as boolean;
    if (Array.isArray(c.marks))
      next.marks = c.marks.filter(
        (m): m is Comment["marks"][number] =>
          m &&
          typeof m === "object" &&
          ["bold", "highlight", "strike", "redact", "blur"].includes(
            m.type as Mark,
          ) &&
          Number.isInteger(m.start) &&
          Number.isInteger(m.end) &&
          m.start >= 0 &&
          m.end <= next.text.length &&
          m.start < m.end,
      );
    return next;
  }
  const settings = { ...defaultSettings };
  const s = (data.settings || {}) as Record<string, unknown>;
  if (s.theme === "dark" || s.theme === "light") settings.theme = s.theme;
  if ([1, 2, 3, 4].includes(Number(s.scale))) settings.scale = Number(s.scale);
  if (s.background === "solid" || s.background === "transparent")
    settings.background = s.background;
  if (typeof s.color === "string" && /^#[\da-f]{6}$/i.test(s.color))
    settings.color = s.color;
  if (typeof s.padding === "number" && Number.isFinite(s.padding))
    settings.padding = Math.max(0, Math.min(120, Math.round(s.padding)));
  return {
    format: "comment-studio-backup",
    version: 1,
    comments: data.comments.map(comment),
    presets: Array.isArray(data.presets)
      ? data.presets.slice(0, 100).map(comment)
      : [],
    settings,
  };
}
