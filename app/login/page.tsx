'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'email' | 'pin'>('email')
  const pinRefs = useRef<(HTMLInputElement | null)[]>([])

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      setError('Ingresa un email válido')
      return
    }
    setError(null)
    setStep('pin')
    setTimeout(() => pinRefs.current[0]?.focus(), 100)
  }

  function handlePinChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return // solo números
    const nuevo = [...pin]
    nuevo[index] = value.slice(-1)
    setPin(nuevo)
    setError(null)

    // Auto-avanzar al siguiente campo
    if (value && index < 5) {
      pinRefs.current[index + 1]?.focus()
    }

    // Auto-submit cuando completa los 6 dígitos
    if (value && index === 5) {
      const pinCompleto = [...nuevo.slice(0, 5), value.slice(-1)].join('')
      if (pinCompleto.length === 6) {
        handleLogin(pinCompleto)
      }
    }
  }

  function handlePinKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus()
    }
  }

  async function handleLogin(pinCompleto?: string) {
    const pinFinal = pinCompleto ?? pin.join('')
    if (pinFinal.length < 6) {
      setError('Ingresa los 6 dígitos del PIN')
      return
    }
    setLoading(true); setError(null)
    const result = await login(email, pinFinal)
    if (!result.ok) {
      setError(result.error ?? 'Error al iniciar sesión')
      setPin(['', '', '', '', '', ''])
      setTimeout(() => pinRefs.current[0]?.focus(), 100)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0f172a' }}>
      {/* Fondo decorativo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10" style={{ backgroundColor: '#3b82f6' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10" style={{ backgroundColor: '#8b5cf6' }} />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo y nombre */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl" style={{ backgroundColor: '#2563eb' }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Servicio Técnico</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>Oxapampa</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: '#1e293b' }}>
          {/* Step indicator */}
          <div className="flex border-b" style={{ borderColor: '#334155' }}>
            <div className={`flex-1 py-3 text-center text-xs font-semibold transition-colors ${step === 'email' ? 'text-white' : ''}`}
              style={{ color: step === 'email' ? '#fff' : '#475569', borderBottom: step === 'email' ? '2px solid #3b82f6' : 'none' }}>
              1. Email
            </div>
            <div className={`flex-1 py-3 text-center text-xs font-semibold`}
              style={{ color: step === 'pin' ? '#fff' : '#475569', borderBottom: step === 'pin' ? '2px solid #3b82f6' : 'none' }}>
              2. PIN
            </div>
          </div>

          <div className="p-6">
            {/* Error */}
            {error && (
              <div className="mb-4 flex items-center gap-2 text-sm px-4 py-3 rounded-xl" style={{ backgroundColor: '#450a0a', color: '#fca5a5' }}>
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* STEP 1: Email */}
            {step === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#94a3b8' }}>
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2 transition-colors"
                    style={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      color: '#f1f5f9',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: '#2563eb' }}
                >
                  Continuar →
                </button>
              </form>
            )}

            {/* STEP 2: PIN */}
            {step === 'pin' && (
              <div className="space-y-5">
                <div className="text-center">
                  <p className="text-sm" style={{ color: '#94a3b8' }}>Ingresando como</p>
                  <p className="text-white font-semibold text-sm mt-0.5">{email}</p>
                  <button
                    onClick={() => { setStep('email'); setPin(['','','','','','']); setError(null) }}
                    className="text-xs mt-1 hover:underline"
                    style={{ color: '#3b82f6' }}
                  >
                    Cambiar email
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3 text-center" style={{ color: '#94a3b8' }}>
                    PIN de 6 dígitos
                  </label>
                  <div className="flex gap-2 justify-center">
                    {pin.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => { pinRefs.current[i] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handlePinChange(i, e.target.value)}
                        onKeyDown={e => handlePinKeyDown(i, e)}
                        className="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 focus:outline-none transition-all"
                        style={{
                          backgroundColor: '#0f172a',
                          borderColor: digit ? '#3b82f6' : '#334155',
                          color: '#f1f5f9',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleLogin()}
                  disabled={loading || pin.join('').length < 6}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#2563eb' }}
                >
                  {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {loading ? 'Verificando...' : 'Ingresar al sistema'}
                </button>

                <p className="text-center text-xs" style={{ color: '#475569' }}>
                  PIN predeterminado: 123456 — cámbialo con el administrador
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Link catálogo público */}
        <div className="text-center mt-6">
          <a href="/catalogo" className="text-xs hover:underline" style={{ color: '#475569' }}>
            Ver catálogo público →
          </a>
        </div>
      </div>
    </div>
  )
}
