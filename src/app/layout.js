import "./globals.css";

export const metadata = {
  title: "Cadence — Multi-Tenant Developer Control Panel",
  description: "Manage departments, track status via Kanban boards, override Discord-like permissions, and interact with the local machine context via MCP servers.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      style={{ colorScheme: "dark" }}
    >
      <body>{children}</body>
    </html>
  );
}
