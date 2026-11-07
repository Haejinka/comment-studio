import { useRef, useState } from "react";
import { VisibilityToggle, RandomIdentity } from "./CommentControls";
import { X, Upload, Camera } from "lucide-react";
import { Avatar } from "./renderers";
import type { Comment } from "./model";
type Props = { c: Comment; update: (value: Partial<Comment>) => void };

export function ProfileEditor({
  c,
  update,
  onError,
}: Props & { onError: (message: string) => void }) {
  const imageInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  async function avatar(file?: File) {
    if (!file) return;
    try {
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type))
        throw new Error("Choose a PNG, JPEG, WebP, or GIF avatar.");
      if (file.size > 15000000)
        throw new Error("Avatar must be smaller than 15 MB.");
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d")!;
      const side = Math.min(bitmap.width, bitmap.height);
      ctx.drawImage(
        bitmap,
        (bitmap.width - side) / 2,
        (bitmap.height - side) / 2,
        side,
        side,
        0,
        0,
        256,
        256,
      );
      bitmap.close();
      update({ avatar: canvas.toDataURL("image/png"), showProfile: true });
    } catch (e) {
      onError((e as Error).message);
    }
  }
  return (
    <section>
      <div className="section-label">
        PROFILE{" "}
        <VisibilityToggle
          c={c}
          field="showProfile"
          label="Profile"
          update={update}
        />
      </div>
      <div
        className={`profile-upload image-upload-card ${dragging ? "dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void avatar(e.dataTransfer.files[0]);
        }}
      >
        <button
          type="button"
          className="avatar-image-button"
          aria-label="Change profile image"
          title="Choose a profile image"
          onClick={() => imageInput.current?.click()}
        >
          <Avatar comment={c} />
          <span className="avatar-camera">
            <Camera size={12} />
          </span>
        </button>
        <div>
          <button
            type="button"
            className="profile-image-action"
            onClick={() => imageInput.current?.click()}
          >
            <Upload size={14} />
            {c.avatar ? "Replace image" : "Upload image"}
          </button>
          <input
            ref={imageInput}
            aria-label="Upload avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={(e) => {
              void avatar(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <small>or drag a photo here · PNG, JPG, WebP, GIF</small>
        </div>
        {c.avatar && (
          <button
            className="icon-button"
            title="Remove avatar"
            aria-label="Remove profile image"
            onClick={() => update({ avatar: "" })}
          >
            <X size={15} />
          </button>
        )}
      </div>
      <div className="avatar-swatches">
        <span>Or choose a color</span>
        {["#d7c8f6", "#b9dcd1", "#f1c7a6", "#b9d0ec", "#ddd6d0"].map(
          (color) => (
            <button
              key={color}
              title={`Avatar color ${color}`}
              className={c.avatarColor === color ? "chosen" : ""}
              style={{ background: color }}
              onClick={() => update({ avatar: "", avatarColor: color })}
            />
          ),
        )}
      </div>
      <div className="identity-tools">
        <RandomIdentity update={update} />
      </div>
      <div className="username-row">
        <label className="grow">
          {c.platform === "x" ? "Display name" : "Username"}
          <input
            aria-label="Username"
            value={c.username}
            maxLength={100}
            onChange={(e) => update({ username: e.target.value })}
          />
        </label>
        {!(
          c.template === "Reels Comment" || c.template === "Shorts Comment"
        ) && (
          <label className="verified-control">
            Verified
            <button
              role="switch"
              aria-label="Verified badge"
              aria-checked={c.verified}
              className={`switch ${c.verified ? "on" : ""}`}
              onClick={() => update({ verified: !c.verified })}
            >
              <span />
            </button>
          </label>
        )}
      </div>
      {c.platform === "x" && (
        <label className="field-label">
          Handle
          <input
            aria-label="Handle"
            value={c.handle}
            onChange={(e) => update({ handle: e.target.value })}
          />
        </label>
      )}
    </section>
  );
}
