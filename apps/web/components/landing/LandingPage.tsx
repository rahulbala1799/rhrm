'use client'

import Navbar from './Navbar'
import Hero from './Hero'
import Features from './Features'
import InteractiveScheduler from './InteractiveScheduler'
import DashboardPreview from './DashboardPreview'
import SocialProof from './SocialProof'
import Pricing from './Pricing'
import CTASection from './CTASection'
import Footer from './Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white antialiased">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <InteractiveScheduler />
        <DashboardPreview />
        <SocialProof />
        <Pricing />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
