import React, { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { ModeToggle } from "./mode-toggle"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { Settings, Menu, Wifi, WifiOff } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet"
import { useWebRTC } from "@/contexts/WebRTCContext"

const navItems = [
  { name: "Home", path: "/" },
  { name: "Share", path: "/share" },
  { name: "Receive", path: "/receive" },
  { name: "Peers", path: "/peers" },
]

// Pear logo SVG
const PearLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Pear shape */}
    <ellipse cx="24" cy="32" rx="13" ry="13" fill="currentColor" />
    <ellipse cx="24" cy="18" rx="8" ry="9" fill="currentColor" />
    {/* Stem */}
    <path d="M24 9 C24 6 27 4 30 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
)

export default function Header() {
  const location = useLocation()
  const pathname = location.pathname
  const [isHovered, setIsHovered] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { isSignalingConnected, localPeer } = useWebRTC()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll)
    setMounted(true)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  if (!mounted) return (
    <header className="sticky top-0 z-50 w-full border-b border-transparent bg-background h-16" />
  )

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b transition-all duration-200",
      scrolled
        ? "border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        : "border-transparent bg-background",
    )}>
      <div className="container flex h-16 items-center justify-between">
        {/* Logo + connection status */}
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <motion.div
              animate={{ rotate: mounted ? 360 : 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 10 }}
              className="size-8 text-primary"
            >
              <PearLogo />
            </motion.div>
            <span className="text-xl font-bold tracking-tight">Pear</span>
          </Link>
          <div className="ml-4 flex items-center gap-1 text-xs">
            {isSignalingConnected ? (
              <><Wifi className="h-4 w-4 text-green-500" /><span className="text-green-500 hidden sm:inline">Online</span></>
            ) : (
              <><WifiOff className="h-4 w-4 text-red-500" /><span className="text-red-500 hidden sm:inline">Offline</span></>
            )}
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <div
              key={item.path}
              className="relative"
              onMouseEnter={() => setIsHovered(item.path)}
              onMouseLeave={() => setIsHovered(null)}
            >
              <Link
                to={item.path}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === item.path ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.name}
              </Link>
              {isHovered === item.path && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              )}
              {pathname === item.path && !isHovered && (
                <motion.div layoutId="nav-indicator" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary" />
              )}
            </div>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <ModeToggle />
          <Link to="/settings" className="hidden md:block">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Settings className="h-5 w-5" /><span className="sr-only">Settings</span>
            </Button>
          </Link>
          {isSignalingConnected && localPeer && (
            <Avatar className="hidden md:block">
              <AvatarImage src={`https://avatar.vercel.sh/${localPeer.id}.png`} alt={localPeer.name} />
              <AvatarFallback>{localPeer.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          )}

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Menu className="h-5 w-5" /><span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80vw] sm:w-[350px]">
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2">
                  <div className="size-6 text-primary"><PearLogo /></div>
                  Pear
                </SheetTitle>
                <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4">
                {isSignalingConnected && localPeer && (
                  <div className="flex items-center gap-3 mb-6">
                    <Avatar>
                      <AvatarImage src={`https://avatar.vercel.sh/${localPeer.id}.png`} alt={localPeer.name} />
                      <AvatarFallback>{localPeer.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{localPeer.name}</p>
                      <p className="text-sm text-muted-foreground">ID: {localPeer.id.substring(0, 6)}...</p>
                    </div>
                  </div>
                )}
                {[...navItems, { name: "Settings", path: "/settings" }].map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors relative",
                      pathname === item.path
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {item.name === "Settings" && <Settings className="h-4 w-4" />}
                    {item.name}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
