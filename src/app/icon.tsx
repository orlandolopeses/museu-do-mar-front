import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d2137",
          borderRadius: 14,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at top, rgba(212,169,106,0.18), transparent 45%)",
          }}
        />
        <svg width="42" height="42" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="24" stroke="#D4A96A" strokeWidth="2.2" opacity="0.22" />
          <path d="M13 39C18 35.5 22.5 34 27 34C32 34 36 36.5 40.5 36.5C45 36.5 49 34.5 53 32" stroke="#D4A96A" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M13 46C18.5 42.7 23 41.5 27.4 41.5C31.8 41.5 35.6 43.6 40 43.6C44.3 43.6 48.2 41.8 52.5 39.8" stroke="#D4A96A" strokeWidth="2.6" strokeLinecap="round" opacity="0.82" />
          <path d="M18 27.5C22 25.2 25.2 24.2 28.5 24.2C32 24.2 34.7 25.6 37.9 25.6C41 25.6 44 24.4 47.2 22.6" stroke="#D4A96A" strokeWidth="2.4" strokeLinecap="round" opacity="0.72" />
          <path d="M32 15V28" stroke="#D4A96A" strokeWidth="2.4" strokeLinecap="round" opacity="0.76" />
          <circle cx="32" cy="13.5" r="2.8" fill="#D4A96A" opacity="0.92" />
        </svg>
      </div>
    ),
    size,
  );
}