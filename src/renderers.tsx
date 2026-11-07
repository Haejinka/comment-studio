import {
  BadgeCheck,
  Heart,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  MessageSquareText,
  Repeat2,
  BarChart2,
  MoreHorizontal,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Bookmark,
  Upload,
  BellOff,
} from "lucide-react";
import type { Comment, Settings } from "./model";
export function RichText({ comment: c }: { comment: Comment }) {
  const bounds = [
    ...new Set([
      0,
      c.text.length,
      ...c.marks.flatMap((m) => [
        Math.min(m.start, c.text.length),
        Math.min(m.end, c.text.length),
      ]),
    ]),
  ].sort((a, b) => a - b);
  return (
    <>
      {bounds.slice(0, -1).map((start, i) => {
        const end = bounds[i + 1];
        const marks = c.marks
          .filter((m) => m.start <= start && m.end >= end)
          .map((m) => m.type);
        return (
          <span key={start} className={marks.join(" ")}>
            {marks.includes("redact")
              ? c.text.slice(start, end).replace(/[^\s]/gu, "█")
              : c.text.slice(start, end)}
          </span>
        );
      })}
    </>
  );
}
export function Avatar({ comment: c }: { comment: Comment }) {
  return (
    <div className="avatar" style={{ background: c.avatarColor }}>
      {c.avatar ? (
        <img src={c.avatar} alt="Profile" />
      ) : (
        <svg
          className="placeholder-avatar"
          viewBox="0 0 64 64"
          aria-hidden="true"
        >
          <rect
            x="20"
            y="14"
            width="24"
            height="27"
            rx="11"
            fill="currentColor"
          />
          <path d="M10 64v-3c0-20 44-20 44 0v3Z" fill="currentColor" />
        </svg>
      )}
    </div>
  );
}
function TikTokBadge({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="badge tiktok-verified-badge"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-label="Verified"
    >
      <circle cx="12" cy="12" r="12" fill="#25c7de" />
      <path
        d="m6.5 12 3.5 3.5 7.5-7.5"
        fill="none"
        stroke="white"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function Name({ c }: { c: Comment }) {
  return (
    <span className="render-name">
      {c.username}
      {c.verified &&
        (c.platform === "tiktok" ? (
          <TikTokBadge size={18} />
        ) : (
          <BadgeCheck
            className="badge"
            size={16}
            fill="#359cf5"
            color="white"
          />
        ))}
    </span>
  );
}
export function cardWidth(c: Comment) {
  return c.platform === "instagram" && c.template === "Reels Comment"
    ? 319
    : c.platform === "youtube" && c.template === "Shorts Comment"
      ? 381
      : 525;
}
export function CommentRenderer({
  comment: c,
  theme,
}: {
  comment: Comment;
  theme: Settings["theme"];
}) {
  const body = (
    <div className="comment-body">
      <RichText comment={c} />
    </div>
  );
  const profile = c.showProfile !== false,
    time = c.showTime !== false,
    likes = c.showLikes !== false,
    replies = c.showReplies !== false && c.replies !== "0";
  const relative = `${c.time}${c.unit}`;
  const timeUnits: Record<string, string> = {
    s: "second",
    m: "minute",
    h: "hour",
    d: "day",
    w: "week",
    mo: "month",
    y: "year",
  };
  const longTime = `${c.time} ${timeUnits[c.unit] || c.unit}${c.time === "1" ? "" : "s"} ago`;
  const avatar = profile && <Avatar comment={c} />;
  const cls = (variant: string) =>
    `comment-card ${variant} ${theme} ${profile ? "" : "profile-hidden"}`;
  if (c.platform === "tiktok" && c.template === "Comment Reply")
    return (
      <div className={`tiktok-asset ${theme}`}>
        <article data-testid="comment-card" className={cls("tiktok-reply")}>
          {avatar}
          <div className="reply-content">
            {profile && (
              <div className="reply-heading">
                Reply to {c.username}'s
                {c.verified && (
                  <>
                    {"\u00a0"}
                    <TikTokBadge />
                  </>
                )}{" "}
                comment
              </div>
            )}
            {body}
          </div>
        </article>
        <svg className="bubble-tail" viewBox="0 0 35 30" aria-hidden="true">
          <path
            d="M0 0H35L8 27C4 31 0 30 0 24Z"
            fill={theme === "dark" ? "#171719" : "#ffffff"}
          />
        </svg>
      </div>
    );
  if (c.platform === "instagram" && c.template === "Reels Comment")
    return (
      <article data-testid="comment-card" className={cls("instagram reels")}>
        {avatar}
        <div className="comment-main">
          {body}
          {profile && (
            <div className="sticker-caption">Replying to {c.username}</div>
          )}
        </div>
      </article>
    );
  if (c.platform === "youtube" && c.template === "Shorts Comment")
    return (
      <article data-testid="comment-card" className={cls("youtube shorts")}>
        {avatar}
        <div className="comment-main">
          {profile && (
            <div className="shorts-heading">
              Comment from @{c.username.replace(/^@/, "")}
            </div>
          )}
          {body}
        </div>
      </article>
    );
  if (c.platform === "instagram")
    return (
      <article
        data-testid="comment-card"
        className={cls("instagram instagram-post")}
      >
        {avatar}
        <div className="comment-main">
          {profile && (
            <div className="name-line">
              <Name c={c} />
              {time && <span className="muted">{relative}</span>}
            </div>
          )}
          {body}
          <div className="instagram-reply-label">Reply</div>
          {replies && (
            <div className="thread">
              <span className="thread-line" />
              View {c.replies} more replies
            </div>
          )}
        </div>
        {likes && (
          <div className="side-like">
            <Heart size={19} />
            <span>{c.likes}</span>
          </div>
        )}
      </article>
    );
  if (c.platform === "youtube")
    return (
      <article
        data-testid="comment-card"
        className={cls("youtube youtube-video")}
      >
        {avatar}
        <div className="comment-main">
          {profile && (
            <div className="name-line">
              <Name c={c} />
              {time && (
                <>
                  <span className="time-dot">•</span>
                  <span className="muted">{longTime}</span>
                </>
              )}
            </div>
          )}
          {body}
          <div className="youtube-actions">
            {likes && (
              <>
                <ThumbsUp size={20} />
                <span>{c.likes}</span>
                <ThumbsDown size={20} />
              </>
            )}
            <MessageSquareText className="youtube-reply-icon" size={20} />
          </div>
          {replies && (
            <div className="youtube-thread">
              {c.replies} replies
              <ChevronRight size={19} />
            </div>
          )}
        </div>
        <MoreVertical className="youtube-more" size={18} />
        {replies && profile && <span className="youtube-connector" />}
      </article>
    );
  if (c.platform === "x")
    return (
      <article data-testid="comment-card" className={cls("twitter")}>
        {avatar}
        <div className="comment-main">
          {profile && (
            <div className="name-line">
              <Name c={c} />
              <span className="muted x-handle">@{c.handle}</span>
              {time && <span className="muted">· {relative}</span>}
              <span className="x-more">
                <BellOff size={17} />
                <MoreHorizontal size={19} />
              </span>
            </div>
          )}
          {body}
          <div className="x-actions">
            {c.showReplies !== false && (
              <span>
                <MessageCircle />
                {c.replies}
              </span>
            )}
            {c.showReposts !== false && (
              <span>
                <Repeat2 />
                {c.reposts}
              </span>
            )}
            {likes && (
              <span>
                <Heart />
                {c.likes}
              </span>
            )}
            {c.showViews !== false && (
              <span>
                <BarChart2 />
                {c.views || "12K"}
              </span>
            )}
            <span className="x-utility">
              <Bookmark />
              <Upload />
            </span>
          </div>
        </div>
      </article>
    );
  return (
    <article data-testid="comment-card" className={cls("tiktok-video")}>
      {avatar}
      <div className="comment-main">
        {profile && <Name c={c} />} {body}
        <div className="tiktok-actions">
          {time && <span>{relative}</span>}
          <b>Reply</b>
          {likes && (
            <span className="tiktok-reactions">
              <Heart size={20} />
              <span>{c.likes}</span>
              <ThumbsDown size={21} />
            </span>
          )}
        </div>
        {replies && (
          <div className="thread">
            <span className="thread-line" />
            <b>View {c.replies} replies</b>
            <ChevronDown size={14} />
          </div>
        )}
      </div>
    </article>
  );
}
export function ExportAsset({
  comment,
  settings,
}: {
  comment: Comment;
  settings: Settings;
}) {
  return (
    <div
      className="export-asset"
      style={{
        padding: settings.padding,
        background:
          settings.background === "solid" ? settings.color : "transparent",
      }}
    >
      <CommentRenderer comment={comment} theme={settings.theme} />
    </div>
  );
}
