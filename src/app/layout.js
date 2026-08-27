import './globals.css';

export const metadata = {
  title: 'Sayed & Yasmin: The Endless Odyssey',
  description:
    'An online 2-player co-op puzzle-platformer. Two hearts, one journey — help سيد and ياسمين solve impossible puzzles together.',
  keywords: 'co-op, puzzle platformer, multiplayer, webrtc, sayed, yasmin, game',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#070b14',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="bg" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
