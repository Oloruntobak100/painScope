import { Radar, Mail } from 'lucide-react';

interface FooterProps {
  onNavigate: (route: string) => void;
}

const supportEmail = 'support@painscope.ai';

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="border-t border-cyan/10 bg-black/40">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-cyan/20 flex items-center justify-center border border-cyan/30">
                <Radar className="w-5 h-5 text-cyan" />
              </div>
              <span className="font-orbitron font-bold text-lg">PAIN<span className="text-cyan">SCOPE</span></span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Autonomous AI scouts that discover market gaps before your competitors.
            </p>
            <a href={`mailto:${supportEmail}`} className="inline-flex items-center gap-2 text-sm text-cyan hover:underline">
              <Mail className="w-4 h-4" />{supportEmail}
            </a>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-orbitron font-bold text-sm mb-4">Product</h4>
            <ul className="space-y-2">
              <li><button onClick={() => onNavigate('landing')} className="text-sm text-muted-foreground hover:text-cyan transition-colors">Home</button></li>
              <li><button onClick={() => onNavigate('how-it-works')} className="text-sm text-muted-foreground hover:text-cyan transition-colors">How It Works</button></li>
              <li><button onClick={() => onNavigate('pricing')} className="text-sm text-muted-foreground hover:text-cyan transition-colors">Pricing</button></li>
              <li><button onClick={() => onNavigate('contact')} className="text-sm text-muted-foreground hover:text-cyan transition-colors">Contact</button></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-orbitron font-bold text-sm mb-4">Resources</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-cyan transition-colors">Documentation</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-cyan transition-colors">API Reference</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-cyan transition-colors">Blog</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-cyan transition-colors">Changelog</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-orbitron font-bold text-sm mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><button onClick={() => onNavigate('privacy')} className="text-sm text-muted-foreground hover:text-cyan transition-colors">Privacy Policy</button></li>
              <li><button onClick={() => onNavigate('terms')} className="text-sm text-muted-foreground hover:text-cyan transition-colors">Terms & Conditions</button></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-cyan transition-colors">Cookie Policy</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-cyan transition-colors">GDPR</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-cyan/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 PainScope AI. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="w-8 h-8 rounded-lg bg-cyan/10 flex items-center justify-center hover:bg-cyan/20 transition-colors">
              <svg className="w-4 h-4 text-cyan" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
            </a>
            <a href="#" className="w-8 h-8 rounded-lg bg-cyan/10 flex items-center justify-center hover:bg-cyan/20 transition-colors">
              <svg className="w-4 h-4 text-cyan" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            </a>
            <a href="#" className="w-8 h-8 rounded-lg bg-cyan/10 flex items-center justify-center hover:bg-cyan/20 transition-colors">
              <svg className="w-4 h-4 text-cyan" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
