import { loadFont } from "@remotion/google-fonts/Inter";
import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const { fontFamily } = loadFont();

export const FPS = 30;
const s = (seconds: number) => Math.round(seconds * FPS);

/**
 * Scene boundaries in seconds. The turn at 15s is the middle of the clip on
 * purpose: half the time on what it costs today, half on what it costs here.
 */
const SCENES = {
  problem: [0, 4.2],
  price: [4.2, 11],
  sting: [11, 15],
  turn: [15, 20.4],
  rails: [20.4, 26.2],
  end: [26.2, 30],
} as const;

export const TOTAL = s(30);

const BLACK = "#000000";
const WHITE = "#ffffff";
const GRAY = "#6b7280";

const base: CSSProperties = {
  fontFamily,
  letterSpacing: "-0.035em",
  fontWeight: 400,
  WebkitFontSmoothing: "antialiased",
};

/** The landing page's own entrance: up thirty pixels, into place, once. */
const useRise = (delay = 0, distance = 30) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, mass: 0.6 },
    durationInFrames: 20,
  });
  return {
    opacity: progress,
    transform: `translateY(${interpolate(progress, [0, 1], [distance, 0])}px)`,
  };
};

const Stage = ({
  children,
  dark = false,
  style,
}: {
  children: ReactNode;
  dark?: boolean;
  style?: CSSProperties;
}) => (
  <AbsoluteFill
    style={{
      ...base,
      background: dark ? BLACK : WHITE,
      color: dark ? WHITE : BLACK,
      alignItems: "center",
      justifyContent: "center",
      padding: 120,
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
);

/** The hero's own eyebrow: a bordered glyph box and one line of small text. */
const Chip = ({ text, dark = false }: { text: string; dark?: boolean }) => {
  const rise = useRise(2);
  return (
    <div
      style={{
        ...rise,
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 40,
      }}
    >
      <span
        style={{
          display: "flex",
          height: 34,
          width: 34,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          border: `1px solid ${dark ? "#3f3f46" : "#d4d4d8"}`,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={dark ? WHITE : BLACK}
          role="img"
          aria-label="lightning"
        >
          <title>lightning</title>
          <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
        </svg>
      </span>
      <span style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.01em" }}>{text}</span>
    </div>
  );
};

const gradientText: CSSProperties = {
  backgroundImage: `linear-gradient(to right, ${BLACK}, ${GRAY}, #9ca3af)`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

const gradientOnDark: CSSProperties = {
  backgroundImage: `linear-gradient(to right, ${WHITE}, #d4d4d8, ${GRAY})`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

/** The same number slot the turn reuses, so the two prices land in one place. */
const PriceSlot = ({
  amount,
  unit,
  note,
  dark = false,
  scale = 1,
  shake = 0,
  label,
}: {
  amount: string;
  unit: string;
  note: string;
  dark?: boolean;
  scale?: number;
  shake?: number;
  label: string;
}) => (
  <div style={{ textAlign: "center" }}>
    <div
      style={{
        fontSize: 30,
        fontWeight: 500,
        color: dark ? "#71717a" : GRAY,
        marginBottom: 24,
        textTransform: "uppercase",
        letterSpacing: "0.18em",
      }}
    >
      {label}
    </div>
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "center",
        gap: 10,
        transform: `translateX(${shake}px) scale(${scale})`,
      }}
    >
      <span style={{ fontSize: 110, fontWeight: 500, lineHeight: 1 }}>$</span>
      <span
        style={{
          fontSize: 300,
          fontWeight: 600,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          ...(dark ? gradientOnDark : gradientText),
        }}
      >
        {amount}
      </span>
      <span style={{ fontSize: 68, fontWeight: 400, color: dark ? "#71717a" : GRAY }}>{unit}</span>
    </div>
    <div style={{ fontSize: 30, color: dark ? "#71717a" : GRAY, marginTop: 36 }}>{note}</div>
  </div>
);

/** Every subscription page, compressed into one number that keeps climbing. */
const PriceTicker = () => {
  const frame = useCurrentFrame();
  const tiers = [
    [19, "Starter"],
    [24, "Starter"],
    [29, "Pro"],
    [39, "Pro"],
    [49, "Team"],
    [59, "Team"],
    [79, "Studio"],
    [99, "Studio"],
    [129, "Business"],
    [159, "Business"],
    [199, "Enterprise"],
  ] as const;
  const climb = s(5.8);

  // Fast at first, then slower, the way a slot machine gives up.
  const eased = interpolate(frame, [0, climb], [0, 1], {
    extrapolateRight: "clamp",
    easing: (t) => 1 - (1 - t) ** 3,
  });
  const settled = frame > climb;
  const [price, plan] = tiers[Math.min(tiers.length - 1, Math.floor(eased * tiers.length))];
  const rise = useRise(0);

  return (
    <div style={rise}>
      <PriceSlot
        label={plan}
        amount={String(price)}
        unit="/ month"
        note={settled ? "billed annually, seat by seat" : "billed annually"}
        scale={1 + eased * 0.06}
        shake={settled ? 0 : Math.sin(frame * 1.9) * 2}
      />
    </div>
  );
};

const Line = ({
  children,
  size = 96,
  delay = 0,
  style,
}: {
  children: ReactNode;
  size?: number;
  delay?: number;
  style?: CSSProperties;
}) => {
  const rise = useRise(delay);
  return (
    <div style={{ ...rise, fontSize: size, lineHeight: 1.08, fontWeight: 400, ...style }}>
      {children}
    </div>
  );
};

/** One rail per row: what it is on the left, what it does on the right. */
const Rail = ({ name, does, delay }: { name: string; does: string; delay: number }) => {
  const rise = useRise(delay, 18);
  return (
    <div
      style={{
        ...rise,
        display: "flex",
        alignItems: "baseline",
        gap: 40,
        borderTop: "1px solid #27272a",
        paddingTop: 26,
        paddingBottom: 26,
        width: 1400,
      }}
    >
      <span style={{ fontSize: 46, fontWeight: 600, width: 360 }}>{name}</span>
      <span style={{ fontSize: 40, color: "#a1a1aa", fontWeight: 400 }}>{does}</span>
    </div>
  );
};

/** Black sliding up over white: the turn from what it costs to what it costs here. */
const Wipe = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 14 });
  return (
    <AbsoluteFill
      style={{
        background: BLACK,
        transform: `translateY(${interpolate(progress, [0, 1], [100, 0])}%)`,
      }}
    />
  );
};

export const Opener = () => {
  const scene = (key: keyof typeof SCENES) => {
    const [from, to] = SCENES[key];
    return { from: s(from), durationInFrames: s(to - from) };
  };

  return (
    <AbsoluteFill style={{ background: WHITE }}>
      <Sequence {...scene("problem")}>
        <Stage>
          <div style={{ textAlign: "center" }}>
            <Chip text="Every prompt library you have ever opened" />
            <Line size={104} delay={6}>
              Prompts like these
            </Line>
            <Line size={104} delay={10} style={{ ...gradientText, fontWeight: 500 }}>
              live behind a subscription.
            </Line>
          </div>
        </Stage>
      </Sequence>

      <Sequence {...scene("price")}>
        <Stage>
          <PriceTicker />
        </Stage>
      </Sequence>

      <Sequence {...scene("sting")}>
        <Stage>
          <div style={{ textAlign: "center" }}>
            <Line size={100} delay={0}>
              You wanted one prompt.
            </Line>
            <Line size={100} delay={26} style={{ fontWeight: 600, marginTop: 18 }}>
              You paid for a year.
            </Line>
          </div>
        </Stage>
      </Sequence>

      <Sequence {...scene("turn")}>
        <Wipe />
        <Stage dark style={{ background: "transparent" }}>
          <div style={{ textAlign: "center" }}>
            <Line size={72} delay={10} style={{ fontWeight: 500, marginBottom: 56 }}>
              Pay per prompt.
            </Line>
            <div style={useRise(18)}>
              <PriceSlot label="One prompt" amount="0.20" unit="once" note="" dark />
            </div>
            <Line size={42} delay={44} style={{ color: "#a1a1aa", marginTop: 24 }}>
              Bought by the agent itself, not by you.
            </Line>
          </div>
        </Stage>
      </Sequence>

      <Sequence {...scene("rails")}>
        <Stage dark>
          <div>
            <Rail name="Hedera" does="x402 settles it, straight to the creator" delay={0} />
            <Rail name="Privy" does="the wallet, made from an email address" delay={7} />
            <Rail name="ENS" does="the creator's name, and where the money lands" delay={14} />
            <Rail name="ERC-8004" does="the rating that decides which prompt wins" delay={21} />
          </div>
        </Stage>
      </Sequence>

      <Sequence {...scene("end")}>
        <Stage dark>
          <div style={{ textAlign: "center" }}>
            <Img
              src={staticFile("mark-white.svg")}
              style={{ width: 128, height: 128, marginBottom: 40 }}
            />
            <Line size={112} delay={4} style={{ fontWeight: 500 }}>
              Bajigur
            </Line>
            <Line size={44} delay={12} style={{ color: "#a1a1aa", marginTop: 20 }}>
              Pay per prompt, not per month.
            </Line>
            <Line size={34} delay={26} style={{ color: "#52525b", marginTop: 54 }}>
              What follows is one real purchase on Hedera testnet, unedited.
            </Line>
          </div>
        </Stage>
      </Sequence>
    </AbsoluteFill>
  );
};
