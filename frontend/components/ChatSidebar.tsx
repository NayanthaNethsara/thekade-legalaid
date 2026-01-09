import React, { useState } from 'react'
import { Plus, MessageSquare, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatSidebarProps {
  user?: { name?: string; plan?: string }
  history?: Array<{ id: string; title: string }>
  onNewChat?: () => void
  onSelectChat?: (id: string) => void
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ user, history = [], onNewChat, onSelectChat }) => {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 ${collapsed ? 'w-16' : 'w-72'} bg-muted/30 border-r backdrop-blur-xl flex flex-col transition-all duration-200`}>
      <div className="p-2 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="mr-2">
          {collapsed ? <Plus className="w-5 h-5" /> : <span className="font-bold text-lg">&#9776;</span>}
        </Button>
        {!collapsed && <span className="font-bold text-lg">Chats</span>}
        {!collapsed && (
          <Button variant="outline" size="sm" onClick={onNewChat}>
            <Plus className="w-4 h-4" /> New Chat
          </Button>
        )}
      </div>
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          <div className="text-xs font-medium text-muted-foreground px-2 uppercase tracking-wider">History</div>
          <div className="space-y-1">
            {history.length > 0 ? history.map((session) => (
              <button key={session.id} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
                onClick={() => onSelectChat && onSelectChat(session.id)}>
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="truncate">{session.title}</span>
              </button>
            )) : (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center italic">No recent history</div>
            )}
          </div>
        </div>
      )}
      <div className={`p-4 border-t bg-muted/20 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        <div className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer ${collapsed ? 'flex-col' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <UserIcon className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-medium truncate">{user?.name || 'Guest User'}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.plan || 'Free Plan'}</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

