"use client";

import { useEffect, useRef } from "react";

/**
 * The hero's background, played from an HLS stream.
 *
 * Two paths, because only Safari plays `.m3u8` on its own. Where it does, the
 * URL goes straight on the element and nothing else is downloaded. Everywhere
 * else hls.js is imported on demand, so the library is a chunk that Safari users
 * never fetch.
 *
 * `poster` carries the first frame from the file that used to be the background,
 * so the hero is never a blank rectangle while the manifest is still being
 * fetched.
 */
export default function HeroVideo({
  src,
  className,
  poster,
}: {
  src: string;
  className?: string;
  poster?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }

    let hls: { destroy(): void } | undefined;
    let cancelled = false;

    import("hls.js").then(({ default: Hls }) => {
      if (cancelled || !Hls.isSupported()) return;
      const instance = new Hls({ capLevelToPlayerSize: true });
      hls = instance;
      instance.loadSource(src);
      instance.attachMedia(video);
    });

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src]);

  return (
    // Muted, looping and inline: it is scenery, so it must never make noise or
    // take the screen. `muted` is also what lets it autoplay at all.
    <video ref={ref} className={className} poster={poster} autoPlay loop muted playsInline>
      <track kind="captions" />
    </video>
  );
}
