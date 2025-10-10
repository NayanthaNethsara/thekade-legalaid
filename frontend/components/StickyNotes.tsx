import { useState } from "react";
import { StickyNote, Plus, X, Pin } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
}

const initialNotes: Note[] = [
  {
    id: "1",
    title: "Case Review",
    content: "Review Johnson v. Smith deposition transcripts",
    color: "from-yellow-100/80 to-yellow-200/60",
    isPinned: true,
  },
  {
    id: "2",
    title: "Client Meeting",
    content: "Prepare briefing materials for Anderson case",
    color: "from-blue-100/80 to-blue-200/60",
    isPinned: false,
  },
  {
    id: "3",
    title: "Research",
    content: "Find precedents for intellectual property dispute",
    color: "from-green-100/80 to-green-200/60",
    isPinned: false,
  },
];

export function StickyNotes() {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [isAddingNote, setIsAddingNote] = useState(false);

  const togglePin = (id: string) => {
    setNotes(notes.map(note => 
      note.id === id ? { ...note, isPinned: !note.isPinned } : note
    ));
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-gray-700" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Sticky Notes</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-8 h-8 p-0 hover:bg-white/60"
          onClick={() => setIsAddingNote(!isAddingNote)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {notes.map((note, index) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 20, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.8, rotate: -5 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`relative p-4 rounded-lg border border-white/30 shadow-md bg-gradient-to-br ${note.color}`}
            >
              {note.isPinned && (
                <Pin className="absolute top-2 right-2 w-4 h-4 text-gray-600 fill-gray-600" />
              )}
              
              <div className="pr-8">
                <h4 className="font-semibold text-gray-900 text-sm mb-1">{note.title}</h4>
                <p className="text-xs text-gray-700">{note.content}</p>
              </div>

              <div className="flex gap-1 mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs hover:bg-white/60"
                  onClick={() => togglePin(note.id)}
                >
                  <Pin className={`w-3 h-3 ${note.isPinned ? 'fill-gray-600' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs hover:bg-white/60"
                  onClick={() => deleteNote(note.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {notes.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No notes yet. Click + to add one!
          </div>
        )}
      </div>
    </GlassCard>
  );
}
