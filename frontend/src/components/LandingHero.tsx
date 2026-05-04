import { useId } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

interface LandingHeroProps {
  onSelectTab?: (tab: 'query' | 'upload' | 'debug') => void
}

export function LandingHero({ onSelectTab }: LandingHeroProps) {
  const pathId = useId().replace(/:/g, '')
  const circlePathId = `scroll-${pathId}`

  const handleNav = (tab: 'query' | 'upload' | 'debug') => {
    onSelectTab?.(tab)
    document.getElementById('app')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative z-10 min-h-[100dvh] flex flex-col overflow-hidden">
      {/* Extra cinematic orbs (hero-only) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-white/[0.025] blur-[80px]" />
        <div className="absolute bottom-[5%] right-[5%] w-[400px] h-[400px] rounded-full bg-white/[0.015] blur-[70px]" />
      </div>

      {/* Top minimal nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-6 sm:px-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold tracking-widest uppercase">ISSE</span>
          </div>
          <span className="text-sm font-medium text-white/80 tracking-wide hidden sm:inline">
            Universidad de La Sabana
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-8 text-[11px] text-white/50 uppercase tracking-[0.25em]">
          <button onClick={() => handleNav('query')} className="hover:text-white transition-colors duration-300">
            Consultar
          </button>
          <button onClick={() => handleNav('upload')} className="hover:text-white transition-colors duration-300">
            Cargar
          </button>
          <button onClick={() => handleNav('debug')} className="hover:text-white transition-colors duration-300">
            Trazar
          </button>
        </div>
      </nav>

      {/* Right-side floating vertical nav (monopo style) */}
      <div className="absolute right-8 sm:right-16 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-end gap-6 z-20">
        {[
          { label: 'Consultar', tab: 'query' as const },
          { label: 'Cargar Datos', tab: 'upload' as const },
          { label: '¿Cómo lo sacamos?', tab: 'debug' as const },
        ].map((item) => (
          <button
            key={item.tab}
            onClick={() => handleNav(item.tab)}
            className="group flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors duration-300"
          >
            <span className="h-px w-6 bg-white/20 group-hover:w-10 group-hover:bg-white/50 transition-all duration-300" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Center typographic hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="text-[18vw] sm:text-[14vw] md:text-[11vw] font-bold leading-[0.85] tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white/80 via-white/30 to-white/5 select-none"
        >
          ISSE
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 1 }}
          className="mt-8 flex flex-col items-center gap-3"
        >
          <p className="text-white/50 text-xs sm:text-sm tracking-[0.4em] uppercase font-light">
            Sistema de Certificación Docente
          </p>
          <div className="w-12 h-px bg-white/20" />
          <p className="text-white/40 text-[10px] sm:text-xs tracking-[0.3em] uppercase">
            Facultad de Ingeniería · 2016–2026
          </p>
        </motion.div>
      </div>

      {/* Bottom-left circular scroll indicator */}
      <div className="absolute bottom-8 left-6 sm:left-12 z-20">
        <div className="relative w-20 h-20">
          <svg viewBox="0 0 100 100" className="w-full h-full animate-[spin_14s_linear_infinite]">
            <path
              id={circlePathId}
              d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
              fill="none"
            />
            <text className="text-[11.5px] uppercase tracking-[0.22em] fill-white/60">
              <textPath href={`#${circlePathId}`}>
                Scroll down · Scroll down · 
              </textPath>
            </text>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Bottom-center chevron */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 opacity-30">
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        >
          <ChevronRight className="w-5 h-5 text-white rotate-90" />
        </motion.div>
      </div>
    </section>
  )
}
