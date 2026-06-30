import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { WebRTCProvider } from '@/contexts/WebRTCContext'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { Toaster } from '@/components/ui/toaster'

import HomePage from '@/pages/HomePage'
import SharePage from '@/pages/SharePage'
import ReceivePage from '@/pages/ReceivePage'
import PeersPage from '@/pages/PeersPage'
import SettingsPage from '@/pages/SettingsPage'
import TransferPage from '@/pages/TransferPage'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="EasyShare-theme">
        <WebRTCProvider>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/share" element={<SharePage />} />
                <Route path="/receive" element={<ReceivePage />} />
                <Route path="/peers" element={<PeersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/transfer/:id" element={<TransferPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
          <Toaster />
        </WebRTCProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
