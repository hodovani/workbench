import "./globals.css";
import { ChatSession } from "@/ai-chat/components/ChatSession";
import { AuthProvider } from "@/auth";
import { WorkbenchNavbar } from "@/components/WorkbenchNavbar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Workbench Chat</title>
        <meta
          name="description"
          content="A guest-first AI chat portfolio project."
        />
      </head>
      <body>
        <AuthProvider>
          <ChatSession />
          <WorkbenchNavbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
