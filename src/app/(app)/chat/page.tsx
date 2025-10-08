"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { useSession } from "next-auth/react";

import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { NewDirectChatDialog } from "@/components/chat/new-direct-chat-dialog";
import { NewProjectChatDialog } from "@/components/chat/new-project-chat-dialog";
import { PageHeader } from "@/components/layout/page-header";

export default function ChatPage() {
  const { data: session } = useSession();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showNewDirectChat, setShowNewDirectChat] = useState(false);
  const [showNewProjectChat, setShowNewProjectChat] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);

  if (!session?.user?.id) {
    notFound();
  }

  // File upload handler (you can customize this to use your R2/S3 upload)
  const handleFileUpload = async (file: File) => {
    // For now, we'll create a simple FormData upload
    // You should integrate this with your existing file upload API
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/files/upload-chat", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Failed to upload file");
    }

    const data = await res.json();
    return {
      url: data.url,
      name: file.name,
      size: file.size,
      mime: file.type,
    };
  };

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
    // On mobile, hide sidebar when a chat is selected
    setShowMobileSidebar(false);
  };

  const handleBackToChats = () => {
    setShowMobileSidebar(true);
    setSelectedChatId(null);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <PageHeader
        title="Messages"
        description="Communicate with your team"
        className="hidden md:block"
      />

      <div className="flex-1 flex overflow-hidden border rounded-lg md:rounded-lg rounded-none min-h-0">
        {/* Sidebar - Hidden on mobile when chat is selected */}
        <div className={`
          w-full md:w-80 md:shrink-0 md:block h-full
          ${showMobileSidebar || !selectedChatId ? 'block' : 'hidden'}
        `}>
          <ChatSidebar
            currentUserId={session.user.id}
            selectedChatId={selectedChatId || undefined}
            onChatSelect={handleChatSelect}
            onNewDirectMessage={() => setShowNewDirectChat(true)}
            onNewProjectChat={() => setShowNewProjectChat(true)}
          />
        </div>

        {/* Chat Window - Hidden on mobile when sidebar is shown */}
        <div className={`
          flex-1 md:block h-full
          ${!showMobileSidebar && selectedChatId ? 'block' : 'hidden md:block'}
        `}>
          {selectedChatId ? (
            <ChatWindow
              chatId={selectedChatId}
              currentUserId={session.user.id}
              onFileUpload={handleFileUpload}
              onBackClick={handleBackToChats}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground p-4 text-center">
              Select a chat to start messaging
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <NewDirectChatDialog
        open={showNewDirectChat}
        onOpenChange={setShowNewDirectChat}
        onChatCreated={setSelectedChatId}
        currentUserId={session.user.id}
      />

      <NewProjectChatDialog
        open={showNewProjectChat}
        onOpenChange={setShowNewProjectChat}
        onChatCreated={setSelectedChatId}
      />
    </div>
  );
}
