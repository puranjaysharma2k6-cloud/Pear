import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { motion, TargetAndTransition } from "framer-motion"
import { ArrowRight, FileUp, Download, Users, Zap, Shield, Wifi, Globe, Sparkles } from 'lucide-react'
import { Link } from "react-router-dom"
import { useTheme } from "next-themes"

const PearLogo = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <ellipse cx="24" cy="32" rx="13" ry="13" fill="currentColor" />
    <ellipse cx="24" cy="18" rx="8" ry="9" fill="currentColor" />
    <path d="M24 9 C24 6 27 4 30 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
)

export default function HomePage() {
  const { theme } = useTheme()

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  }
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }
  const floatingAnimation: TargetAndTransition = {
    y: [-10, 10, -10],
    transition: { duration: 6, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" },
  }

  const features = [
    { icon: <FileUp className="h-10 w-10" />, title: "Share Files", description: "Easily share files with peers directly from your browser", link: "/share", gradient: "from-blue-500 to-sky-500" },
    { icon: <Download className="h-10 w-10" />, title: "Receive Files", description: "Receive files from connected peers securely", link: "/receive", gradient: "from-sky-500 to-cyan-500" },
    { icon: <Users className="h-10 w-10" />, title: "Discover Peers", description: "Find and connect with peers on your network", link: "/peers", gradient: "from-cyan-500 to-blue-600" },
  ]

  const benefits = [
    { icon: <Shield className="h-6 w-6" />, text: "End-to-end encrypted transfers" },
    { icon: <Wifi className="h-6 w-6" />, text: "Direct peer-to-peer connections" },
    { icon: <Globe className="h-6 w-6" />, text: "No file size limitations" },
    { icon: <Zap className="h-6 w-6" />, text: "Lightning fast transfers" },
  ]

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl" />
      </div>

      <div className="container px-4 py-16 md:py-24">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center mb-20"
        >
          <div className="relative mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
              className="relative"
            >
              <div className="size-32 text-primary relative">
                <motion.div animate={floatingAnimation} className="absolute inset-0">
                  <PearLogo />
                </motion.div>
              </div>

              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-primary/30 rounded-full"
                  style={{ top: `${20 + Math.sin(i * 60) * 40}%`, left: `${20 + Math.cos(i * 60) * 40}%` }}
                  animate={{ y: [-5, 5, -5], opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                />
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="absolute -bottom-4 -right-4 bg-gradient-to-r from-primary to-blue-400 rounded-full p-3 shadow-lg"
            >
              <Sparkles className="h-8 w-8 text-white" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-6"
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              Pear
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-xl md:text-2xl text-muted-foreground max-w-3xl leading-relaxed"
            >
              Direct peer-to-peer file sharing using{" "}
              <span className="text-primary font-semibold">WebRTC</span>.{" "}
              <span className="text-primary font-semibold">No servers</span>, no limits, just seamless connections.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 mt-10 justify-center"
          >
            <Link to="/share">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-blue-400 hover:from-primary/90 hover:to-blue-400/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                Start Sharing <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/peers">
              <Button size="lg" variant="outline" className="gap-2 border-2 hover:bg-primary/5 transition-all duration-300 transform hover:scale-105">
                Discover Peers <Users className="h-5 w-5" />
              </Button>
            </Link>
          </motion.div>

          {/* Benefits grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-4xl"
          >
            {benefits.map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 + i * 0.1 }}
                className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300"
              >
                <div className="text-primary">{benefit.icon}</div>
                <span className="text-sm text-center text-muted-foreground">{benefit.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20"
        >
          {features.map((feature, i) => (
            <motion.div key={i} variants={item}>
              <Link to={feature.link} className="block h-full group">
                <Card className="h-full overflow-hidden border border-border/50 transition-all duration-500 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 group-hover:scale-105 relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                  <CardContent className="p-8 flex flex-col items-center text-center h-full relative z-10">
                    <motion.div
                      className="mb-6 p-4 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 text-primary group-hover:scale-110 transition-transform duration-300"
                      whileHover={{ rotate: 5 }}
                    >
                      {feature.icon}
                    </motion.div>
                    <h3 className="text-2xl font-semibold mb-4 group-hover:text-primary transition-colors duration-300">{feature.title}</h3>
                    <p className="text-muted-foreground mb-6 leading-relaxed flex-1">{feature.description}</p>
                    <div className="mt-auto pt-4">
                      <Button variant="ghost" className="gap-2 group/button hover:bg-primary/10">
                        Learn More
                        <ArrowRight className="h-4 w-4 transition-transform group-hover/button:translate-x-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-32 text-center"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-blue-400/10 to-sky-500/10 rounded-3xl blur-3xl" />
            <Card className="relative border-2 border-primary/20 bg-background/80 backdrop-blur-sm">
              <CardContent className="p-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                  Ready to Share?
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Join the future of file sharing. No accounts, no uploads to servers, just direct connections between you and your peers.
                </p>
                <Link to="/settings">
                  <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-blue-400 hover:from-primary/90 hover:to-blue-400/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                    Get Started <Zap className="h-5 w-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
