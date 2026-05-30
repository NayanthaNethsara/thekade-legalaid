import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 font-sans">
      <p className="text-muted-foreground">Hello World</p>
      <Button asChild size="lg">
        <Link href="/admin/rag">
          Open RAG Admin
          <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}
