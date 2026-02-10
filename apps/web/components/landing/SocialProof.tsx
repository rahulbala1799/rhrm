'use client'

import { useEffect, useRef, useState } from 'react'

const stats = [
  { value: 2400, suffix: '+', label: 'Shifts scheduled weekly' },
  { value: 150, suffix: '+', label: 'Businesses trust us' },
  { value: 98, suffix: '%', label: 'Compliance rate achieved' },
  { value: 4.9, suffix: '/5', label: 'Average user rating', isDecimal: true },
]

const testimonials = [
  {
    quote: 'We used to spend hours every week on scheduling. Now it takes 20 minutes. The drag-and-drop planner is genuinely brilliant.',
    name: 'Rachel Thompson',
    role: 'Operations Manager',
    company: 'GreenGrocer Co.',
    initials: 'RT',
    color: 'bg-violet-500',
  },
  {
    quote: 'The compliance tracking alone saved us from two potential fines. Document expiry alerts are a lifesaver when you manage 30+ staff.',
    name: 'David Chen',
    role: 'HR Director',
    company: 'BuildRight Services',
    initials: 'DC',
    color: 'bg-blue-500',
  },
  {
    quote: 'My team actually checks their shifts now because the mobile app is so easy to use. No more "I didn\'t know I was working" excuses.',
    name: 'Aisha Malik',
    role: 'Store Manager',
    company: 'FreshBake Bakery',
    initials: 'AM',
    color: 'bg-emerald-500',
  },
]

function AnimatedStat({ stat, delay }: { stat: (typeof stats)[0]; delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => {
      const target = stat.value
      const duration = 1500
      const steps = 40
      const increment = target / steps
      let current = 0
      const interval = setInterval(() => {
        current += increment
        if (current >= target) {
          setCount(target)
          clearInterval(interval)
        } else {
          setCount(stat.isDecimal ? Math.round(current * 10) / 10 : Math.floor(current))
        }
      }, duration / steps)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(timer)
  }, [visible, stat.value, stat.isDecimal, delay])

  return (
    <div
      ref={ref}
      className={`text-center transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight tabular-nums">
        {stat.isDecimal ? count.toFixed(1) : count.toLocaleString()}{stat.suffix}
      </div>
      <div className="mt-1 text-sm text-gray-400">{stat.label}</div>
    </div>
  )
}

export default function SocialProof() {
  return (
    <section className="bg-gray-950 py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, i) => (
            <AnimatedStat key={stat.label} stat={stat} delay={i * 100} />
          ))}
        </div>

        {/* Testimonials */}
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Trusted by teams everywhere
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-gray-900 rounded-2xl p-6 ring-1 ring-white/10"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-gray-300 leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${t.color}`}>
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.role}, {t.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
