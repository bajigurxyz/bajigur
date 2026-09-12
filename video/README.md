# video

The 30 second opener, built with [Remotion](https://remotion.dev). It carries
the story so the demo recording can carry only the proof.

```bash
cd video
bun install
bun run dev      # remotion studio, scrub and edit live
bun run render   # out/opener.mp4, 1920x1080, 30fps
```

Six scenes, timed in `SCENES` at the top of `src/Opener.tsx`:

| From | Scene |
| --- | --- |
| 0.0s | the problem, stated once |
| 4.2s | the price climbing from $29 to $499 a month |
| 11.0s | you wanted one prompt, you paid for a year |
| 15.0s | the turn: the same number slot, now $0.20 once for one design prompt |
| 20.4s | the four rails, one line each |
| 26.2s | the end card, handing off to the recording |

It says "design prompt" in the first line and again at the turn, so nobody reads
it as paying per message in a chat. What is sold is the design prompt, once.

The look is the landing page's: Inter, white on black and black on white,
`-0.035em` tracking, the same rise-and-fade entrance, the same black to grey
gradient on the number that matters. The turn reuses the price slot on purpose,
so the two numbers land in the same place on screen and the cut does the
arguing.

Voiceover in [`../docs/demo/script.md`](../docs/demo/script.md). Renders are
gitignored; they belong on YouTube, not in the repository.
