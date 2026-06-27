import "./globals.css";

export const metadata = {
  title: "SkillShurokkha | দক্ষতার নিরাপদ ঠিকানা",
  description: "AI verified freelance marketplace with secure escrow payments.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}
