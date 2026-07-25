/** Extract a YouTube video id from watch / shorts / embed / youtu.be URLs. */
export function youtubeVideoId(url: string): string | null {
  const raw = String(url ?? "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/")[2] || null;
      }
      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.split("/")[2] || null;
      }
      const v = u.searchParams.get("v");
      if (v) return v;
    }
  } catch {
    return null;
  }
  return null;
}

export function isYouTubeUrl(url: string): boolean {
  return Boolean(youtubeVideoId(url));
}

/** Ambient hero embed: autoplay, muted, loop, minimal chrome. */
export function youtubeEmbedUrl(url: string): string | null {
  const id = youtubeVideoId(url);
  if (!id) return null;
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    loop: "1",
    playlist: id,
    playsinline: "1",
    controls: "0",
    rel: "0",
    modestbranding: "1",
    iv_load_policy: "3",
    fs: "0",
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}
