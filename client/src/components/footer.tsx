import { Mail, Linkedin, Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <span>Made with</span>
            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
            <span>by Puranjay Sharma</span>
          </div>

          <div className="flex items-center space-x-6">
            <a
              href="mailto:puranjaysharma2k6@gmail.com"
              className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors"
              aria-label="Email"
            >
              <Mail className="h-4 w-4" />
              <span className="text-sm">puranjaysharma2k6@gmail.com</span>
            </a>

            <a
              href="https://linkedin.com/in/puranjay-sharma-332554320/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
              <span className="text-sm">LinkedIn</span>
            </a>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Pear — Modern P2P File Sharing</p>
            <p className="text-xs mt-1">Built with React, WebRTC &amp; Express</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
