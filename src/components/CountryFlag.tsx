import { useState } from "react";

function emojiFlag(code: string) {
  return String.fromCodePoint(...[...code.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

/** Country flag (ISO 3166-1 alpha-2) cropped into a circle. Decorative: pair it with the country name in text. */
export function CountryFlag({ code, size = 18, className = "" }: { code: string; size?: number; className?: string }) {
  const [failedCode, setFailedCode] = useState<string | null>(null);
  const valid = /^[A-Za-z]{2}$/.test(code);
  const failed = !valid || failedCode === code;

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-black/10 align-middle ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.8, lineHeight: 1 }}
    >
      {failed ? (
        valid ? emojiFlag(code) : "🌐"
      ) : (
        <img
          key={code}
          src={`https://flagcdn.com/${code.toLowerCase()}.svg`}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="h-full w-full object-cover"
          onError={() => setFailedCode(code)}
        />
      )}
    </span>
  );
}
