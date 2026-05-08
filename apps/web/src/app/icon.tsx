import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

/** Favicon — Eclipse mark on a dark rounded square. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#07070A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
        }}
      >
        <svg width="56" height="56" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="24" r="14" fill="#CAFF3C" />
          <circle
            cx="28"
            cy="24"
            r="14"
            fill="rgba(250,250,250,0.28)"
            stroke="rgba(250,250,250,0.55)"
            strokeWidth="1.4"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
