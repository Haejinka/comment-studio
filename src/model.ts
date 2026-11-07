export type Platform = "tiktok" | "instagram" | "youtube" | "x";
export type Mark = "bold" | "highlight" | "strike" | "redact" | "blur";
export interface TextMark {
  start: number;
  end: number;
  type: Mark;
}
export interface Comment {
  id: string;
  platform: Platform;
  template: string;
  username: string;
  handle: string;
  text: string;
  avatar: string;
  avatarColor: string;
  verified: boolean;
  time: string;
  unit: string;
  likes: string;
  replies: string;
  reposts: string;
  marks: TextMark[];
  views?: string;
  showProfile?: boolean;
  showTime?: boolean;
  showLikes?: boolean;
  showReplies?: boolean;
  showReposts?: boolean;
  showViews?: boolean;
}
export interface Settings {
  theme: "light" | "dark";
  scale: number;
  background: "transparent" | "solid";
  color: string;
  padding: number;
}
export const platforms: Platform[] = ["tiktok", "instagram", "youtube", "x"];
export const labels: Record<Platform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  x: "X / Twitter",
};
export const templates: Record<Platform, string[]> = {
  tiktok: ["Comment Reply", "Video Comment"],
  instagram: ["Post Comment", "Reels Comment"],
  youtube: ["Video Comment", "Shorts Comment"],
  x: ["Post Comment"],
};
export const freshComment = (): Comment => ({
  id: crypto.randomUUID(),
  platform: "tiktok",
  template: "Comment Reply",
  username: "alex.creates",
  handle: "alexcreates",
  text: "How do you make your videos look so good? 👀",
  avatar: "",
  avatarColor: "#cbd6dc",
  verified: false,
  time: "2",
  unit: "h",
  likes: "128",
  replies: "3",
  reposts: "12",
  marks: [],
  views: "12K",
  showProfile: true,
  showTime: true,
  showLikes: true,
  showReplies: true,
  showReposts: true,
  showViews: true,
});
export const defaultSettings: Settings = {
  theme: "light",
  scale: 2,
  background: "transparent",
  color: "#ffffff",
  padding: 24,
};
export const STORAGE_KEY = "comment-studio-v1";
export function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (
      d?.comments?.length &&
      d.comments.every(
        (c: Comment) =>
          platforms.includes(c.platform) &&
          typeof c.text === "string" &&
          Array.isArray(c.marks),
      )
    )
      return {
        ...d,
        comments: d.comments.map((c: Comment) => ({
          ...c,
          template: c.platform === "x" ? "Post Comment" : c.template,
        })),
      };
  } catch {}
  return null;
}
/** Keep range formatting anchored when text is inserted, replaced, or deleted. */
export function rebaseMarks(comment: Comment, next: string): TextMark[] {
  const previous = comment.text;
  let prefix = 0;
  while (
    prefix < previous.length &&
    prefix < next.length &&
    previous[prefix] === next[prefix]
  )
    prefix++;
  let suffix = 0;
  while (
    suffix < previous.length - prefix &&
    suffix < next.length - prefix &&
    previous[previous.length - suffix - 1] === next[next.length - suffix - 1]
  )
    suffix++;
  const oldEnd = previous.length - suffix;
  const newEnd = next.length - suffix;
  const delta = next.length - previous.length;
  return comment.marks
    .map((mark) => ({
      ...mark,
      start:
        mark.start >= oldEnd
          ? mark.start + delta
          : mark.start > prefix
            ? prefix
            : mark.start,
      end:
        mark.end >= oldEnd
          ? mark.end + delta
          : mark.end > prefix
            ? newEnd
            : mark.end,
    }))
    .filter((mark) => mark.start < mark.end && mark.start >= 0);
}
