import Link from 'next/link';


// Import Logo from hero-section or move to a shared location if needed
import { Logo } from './hero-section';

export function Footer() {
    return (
        <footer className="bg-primary/90 border-t border-border mt-24 text-background">
            <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-lg tracking-tight">LegalAid</span>
                    </div>
                    <p className="max-w-xs text-sm mb-2 text-background/80">
                        Empowering access to justice with modern, AI-driven legal solutions for everyone.
                    </p>
                    <p className="text-xs text-background/70">© {new Date().getFullYear()} TheKade LegalAid. All rights reserved.</p>
                </div>
                <div className="flex flex-wrap gap-8 justify-center md:justify-end">
                    <div>
                        <h4 className="font-semibold mb-2 text-sm">Product</h4>
                        <ul className="space-y-1 text-sm">
                            <li><Link href="#features" className="hover:underline text-background/80">Features</Link></li>
                            <li><Link href="#pricing" className="hover:underline text-background/80">Pricing</Link></li>
                            <li><Link href="#demo" className="hover:underline text-background/80">Request Demo</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2 text-sm">Company</h4>
                        <ul className="space-y-1 text-sm">
                            <li><Link href="#about" className="hover:underline text-background/80">About</Link></li>
                            <li><Link href="#team" className="hover:underline text-background/80">Team</Link></li>
                            <li><Link href="#careers" className="hover:underline text-background/80">Careers</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2 text-sm">Support</h4>
                        <ul className="space-y-1 text-sm">
                            <li><Link href="#faq" className="hover:underline text-background/80">FAQ</Link></li>
                            <li><Link href="#contact" className="hover:underline text-background/80">Contact</Link></li>
                            <li><Link href="/privacy-policy" className="hover:underline text-background/80">Privacy Policy</Link></li>
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    );
}
