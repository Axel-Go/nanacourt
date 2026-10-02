import { useState, useEffect, useCallback } from 'react'

const site = {
  name: 'Nanacourt',
  status: 'Open',              
  city: 'Maasin City',
  province: 'Southern Leyte',
  address: 'Brgy, Asuncion, atbang seminaryo',         
  phone: '+63 946 204 6680',     
  pricePerHour: 250,             
  opensAt: '6:00 AM',                       
  closesAt: '11:00 PM',                      
  holdFee: 0,                               
}

const courts = [
  { id: 'a', name: 'Ground Court', type: 'Outdoor', image: '/ground-court.jpg',},
  { id: 'b', name: 'Rooftop Court', type: 'Outdoor', image: '/rooftop-court.jpg',},
]


const peso = (n) => `₱${n.toLocaleString('en-PH')}`

/* ------------------------------------------------------------------
   ICONS — small inline SVGs so the project needs no icon library.
   ------------------------------------------------------------------ */

function IconCourt() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M12 5v14M3 12h18" />
    </svg>
  )
}

function IconTag() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9-9-9Z" />
      <circle cx="7.5" cy="7.5" r="1.4" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.3l3.4 2" />
    </svg>
  )
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  )
}

/* ------------------------------------------------------------------
   BOOKING MODAL
   ------------------------------------------------------------------ */

function getMonthData(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return { firstDay, daysInMonth }
}

function generateTimeSlots() {
  const [openH] = site.opensAt.match(/\d+/).map(Number)
  const closeRaw = site.closesAt.match(/(\d+):.*?(AM|PM)/i)
  let closeH = parseInt(closeRaw[1])
  if (closeRaw[2].toUpperCase() === 'PM' && closeH !== 12) closeH += 12
  if (closeRaw[2].toUpperCase() === 'AM' && closeH === 12) closeH = 0

  const slots = []
  for (let h = openH; h < closeH; h++) {
    const from = h <= 12 ? `${h === 0 ? 12 : h}:00 ${h < 12 ? 'AM' : 'PM'}` : `${h - 12}:00 PM`
    const to = (h + 1) <= 12 ? `${h + 1 === 0 ? 12 : h + 1}:00 ${(h + 1) < 12 ? 'AM' : 'PM'}` : `${h + 1 - 12}:00 PM`
    slots.push({ hour: h, label: `${from} – ${to}` })
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const PAYMENT_METHODS = [
  { id: 'gotyme', name: 'GoTyme', account: 'Nanacourt', number: '0946 204 6680' },
]

const CHECKOUT_STEPS = [
  { label: 'Contact' },
  { label: 'Review' },
  { label: 'Payment' },
]

function BookingModal({ court, onClose }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [mode, setMode] = useState('regular')
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedSlots, setSelectedSlots] = useState([])
  const [bookedSlots, setBookedSlots] = useState([])

  const [checkoutStep, setCheckoutStep] = useState(null)
  const [contact, setContact] = useState({ name: '', email: '', phone: '' })
  const [paymentMethod, setPaymentMethod] = useState('gotyme')
  const [proofFile, setProofFile] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!selectedDate) return
    const d = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    fetch(`/api/availability?court_id=${court.id}&date=${d}`)
      .then(r => r.json())
      .then(data => setBookedSlots(data.booked || []))
      .catch(() => setBookedSlots([]))
  }, [selectedDate, court.id])

  const { firstDay, daysInMonth } = getMonthData(viewYear, viewMonth)

  const prevMonth = () => {
    const prev = new Date(viewYear, viewMonth - 1, 1)
    if (prev.getFullYear() > today.getFullYear() - 1) {
      setViewYear(prev.getFullYear())
      setViewMonth(prev.getMonth())
    }
  }

  const nextMonth = () => {
    setViewYear(viewMonth === 11 ? viewYear + 1 : viewYear)
    setViewMonth(viewMonth === 11 ? 0 : viewMonth + 1)
  }

  const selectDate = (day) => {
    const d = new Date(viewYear, viewMonth, day)
    d.setHours(0, 0, 0, 0)
    if (d < today) return
    setSelectedDate(d)
    setSelectedSlots([])
  }

  const toggleSlot = (hour) => {
    setSelectedSlots((prev) => {
      if (prev.includes(hour)) return prev.filter((h) => h !== hour)
      const next = [...prev, hour].sort((a, b) => a - b)
      for (let i = 1; i < next.length; i++) {
        if (next[i] - next[i - 1] !== 1) return [hour]
      }
      return next
    })
  }

  const isToday = (day) => viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate()
  const isPast = (day) => { const d = new Date(viewYear, viewMonth, day); d.setHours(0,0,0,0); return d < today }
  const isSelected = (day) => selectedDate && viewYear === selectedDate.getFullYear() && viewMonth === selectedDate.getMonth() && day === selectedDate.getDate()
  const isPastSlot = (hour) => { if (!selectedDate) return false; const now = new Date(); return selectedDate.getTime() === today.getTime() && hour <= now.getHours() }

  const dateStr = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : ''

  const sortedSlots = [...selectedSlots].sort((a, b) => a - b)
  const timeRange = sortedSlots.length > 0
    ? `${TIME_SLOTS.find(s => s.hour === sortedSlots[0])?.label.split(' – ')[0]} – ${TIME_SLOTS.find(s => s.hour === sortedSlots[sortedSlots.length - 1])?.label.split(' – ')[1]}`
    : ''

  const totalHours = selectedSlots.length
  const totalPrice = totalHours * site.pricePerHour

  const canContinueStep1 = contact.name.trim() && contact.phone.trim()
  const canSubmit = paymentMethod !== null

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const form = new FormData()
      form.append('court_id', court.id)
      form.append('court_name', court.name)
      form.append('date', dateStr)
      form.append('time_range', timeRange)
      form.append('slots', sortedSlots.join(','))
      form.append('hours', totalHours)
      form.append('total_price', totalPrice)
      form.append('name', contact.name)
      form.append('phone', contact.phone)
      form.append('email', contact.email)
      form.append('payment_method', paymentMethod)
      if (proofFile) form.append('proof', proofFile)

      const res = await fetch('/api/bookings', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Booking failed')
      setSubmitted(true)
    } catch {
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal modal-narrow" onClick={(e) => e.stopPropagation()}>
          <div className="checkout-success">
            <div className="success-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <h2 className="modal-title">Booking Submitted!</h2>
            <p className="checkout-success-text">
              Your booking for <strong>{court.name}</strong> on <strong>{dateStr}</strong> ({timeRange}) has been sent.
              We&rsquo;ll confirm once payment is verified.
            </p>
            <button className="btn btn-primary booking-confirm" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (checkoutStep !== null) {
    const stepTitles = ['Your Details', 'Review Booking', 'Pay & Confirm']

    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal modal-checkout" onClick={(e) => e.stopPropagation()}>
          <div className="checkout-top">
            <button className="checkout-back-link" onClick={() => checkoutStep === 0 ? setCheckoutStep(null) : setCheckoutStep(checkoutStep - 1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
              Back
            </button>
            <button className="modal-close" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="checkout-progress">
            {CHECKOUT_STEPS.map((step, i) => (
              <button
                key={i}
                className={`progress-segment${i === checkoutStep ? ' is-current' : ''}${i < checkoutStep ? ' is-done' : ''}`}
                onClick={() => { if (i < checkoutStep) setCheckoutStep(i) }}
                disabled={i > checkoutStep}
              >
                {step.label}
              </button>
            ))}
          </div>

          <div className="checkout-content">
            <h2 className="checkout-title">{stepTitles[checkoutStep]}</h2>

            {checkoutStep === 0 && (
              <div className="checkout-step">
                <div className="field-row">
                  <div className="field">
                    <label className="field-label">Full Name</label>
                    <input className="field-input" type="text" placeholder="Juan Dela Cruz" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                  </div>
                  <div className="field">
                    <label className="field-label">Phone</label>
                    <input className="field-input" type="tel" placeholder="09123456789" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Email <span className="field-optional">(optional)</span></label>
                  <input className="field-input" type="email" placeholder="you@example.com" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                </div>

                <div className="inline-summary">
                  <span>{court.name}</span>
                  <span>{dateStr}</span>
                  <span>{timeRange}</span>
                  <strong>{peso(totalPrice)}</strong>
                </div>
              </div>
            )}

            {checkoutStep === 1 && (
              <div className="checkout-step">
                <div className="review-split">
                  <div className="review-block">
                    <h4 className="review-block-label">Venue</h4>
                    <p className="review-block-value">{court.name}</p>
                    <p className="review-block-sub">{court.type} &middot; {site.address}</p>
                  </div>
                  <div className="review-block">
                    <h4 className="review-block-label">Schedule</h4>
                    <p className="review-block-value">{dateStr}</p>
                    <p className="review-block-sub">{timeRange} &middot; {totalHours}hr</p>
                  </div>
                  <div className="review-block">
                    <h4 className="review-block-label">Contact</h4>
                    <p className="review-block-value">{contact.name}</p>
                    <p className="review-block-sub">{contact.phone}{contact.email ? ` · ${contact.email}` : ''}</p>
                  </div>
                </div>

                <div className="review-total-bar">
                  <div>
                    <span className="review-total-label">Total</span>
                    <span className="review-total-breakdown">{peso(site.pricePerHour)}/hr &times; {totalHours}</span>
                  </div>
                  <strong className="review-total-price">{peso(totalPrice)}</strong>
                </div>
              </div>
            )}

            {checkoutStep === 2 && (
              <div className="checkout-step">
                <div className="payment-amount-banner">
                  <span>Amount Due</span>
                  <strong>{peso(totalPrice)}</strong>
                </div>

                <div className="payment-methods">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      className={`payment-method${paymentMethod === m.id ? ' is-selected' : ''}`}
                      onClick={() => setPaymentMethod(m.id)}
                    >
                      <div className="payment-method-info">
                        <strong>{m.name}</strong>
                        <span>{m.number}</span>
                      </div>
                      {paymentMethod === m.id && (
                        <span className="payment-check">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {paymentMethod && (
                  <div className="payment-action-area">
                    <div className="payment-qr">
                      <img src="/gotyme-qr.jpg" alt="GoTyme QR Code" className="payment-qr-img" />
                      <span className="payment-qr-label">Scan to pay via GoTyme</span>
                    </div>
                    <div className="payment-instructions">
                      <strong>How to pay</strong>
                      <ol>
                        <li>Open GoTyme</li>
                        <li>Scan the QR code above or send <strong>{peso(totalPrice)}</strong> to <strong>{PAYMENT_METHODS[0].number}</strong></li>
                        <li>Screenshot the confirmation</li>
                        <li>Upload it below</li>
                      </ol>
                    </div>

                    <label className="upload-drop">
                      <input type="file" accept="image/png,image/jpeg" hidden onChange={(e) => setProofFile(e.target.files[0] || null)} />
                      {proofFile ? (
                        <div className="upload-done">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                          <span>{proofFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" aria-hidden="true" className="upload-icon"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                          <span className="upload-label">Upload Payment Proof</span>
                          <span className="upload-hint">PNG, JPG up to 5 MB</span>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="checkout-footer">
            {checkoutStep < 2 ? (
              <button
                className="btn btn-primary checkout-next"
                disabled={checkoutStep === 0 && !canContinueStep1}
                onClick={() => setCheckoutStep(checkoutStep + 1)}
              >
                Continue
                <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-arrow"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
              </button>
            ) : (
              <>
                <button
                  className="btn btn-primary checkout-next"
                  disabled={!canSubmit || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? 'Submitting…' : 'Submit Booking'}
                  {!submitting && <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-arrow"><path d="M20 6 9 17l-5-5" /></svg>}
                </button>
                {submitError && <p className="submit-error">{submitError}</p>}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-icon">
            <IconCourt />
          </div>
          <div>
            <h2 className="modal-title">Book {court.name}</h2>
            <p className="modal-subtitle">{peso(site.pricePerHour)}/hour</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-tabs">
          <button className={`modal-tab ${mode === 'regular' ? 'is-active' : ''}`} onClick={() => setMode('regular')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" /></svg>
            Regular Play
          </button>
          <button className={`modal-tab ${mode === 'event' ? 'is-active' : ''}`} onClick={() => setMode('event')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            Event / Multi-hour
          </button>
        </div>

        <div className="modal-body">
          <div className="calendar">
            <div className="calendar-nav">
              <button className="calendar-arrow" onClick={prevMonth} aria-label="Previous month">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <span className="calendar-month">{MONTHS[viewMonth]} {viewYear}</span>
              <button className="calendar-arrow" onClick={nextMonth} aria-label="Next month">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>

            <div className="calendar-grid">
              {DAYS.map((d) => (
                <span className="calendar-day-label" key={d}>{d}</span>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <span key={`e-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                <button
                  key={day}
                  className={`calendar-day${isSelected(day) ? ' is-selected' : ''}${isToday(day) && !isSelected(day) ? ' is-today' : ''}${isPast(day) ? ' is-past' : ''}`}
                  onClick={() => selectDate(day)}
                  disabled={isPast(day)}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className="calendar-legend">
              <span className="legend-dot legend-dot-selected" /> Selected
              <span className="legend-dot legend-dot-past" /> Unavailable
            </div>
          </div>

          <div className="timeslots">
            <div className="timeslots-header">
              <span className="timeslots-icon"><IconClock /></span>
              <div>
                <h3 className="timeslots-title">Available Times</h3>
                <p className="timeslots-sub">{dateStr}&ensp;Select {mode === 'event' ? 'consecutive time slots' : 'a time slot'}</p>
              </div>
            </div>

            <div className="timeslots-grid">
              {TIME_SLOTS.map((slot) => {
                const past = isPastSlot(slot.hour)
                const booked = bookedSlots.includes(slot.hour)
                const unavailable = past || booked
                const active = selectedSlots.includes(slot.hour)
                return (
                  <button
                    key={slot.hour}
                    className={`timeslot${active ? ' is-active' : ''}${unavailable ? ' is-past' : ''}${booked ? ' is-booked' : ''}`}
                    onClick={() => !unavailable && toggleSlot(slot.hour)}
                    disabled={unavailable}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5.3l3.4 2" /></svg>
                    {booked ? 'Booked' : slot.label}
                  </button>
                )
              })}
            </div>
          </div>

          {totalHours > 0 && (
            <div className="booking-summary">
              <div className="booking-summary-details">
                <span>{totalHours} hour{totalHours > 1 ? 's' : ''} &middot; {court.name}</span>
                <strong>{peso(totalPrice)}</strong>
              </div>
              <button className="btn btn-primary booking-confirm" onClick={() => setCheckoutStep(0)}>
                Confirm Booking
                <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-arrow">
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   SECTIONS
   ------------------------------------------------------------------ */

function Header() {
  // The hero already shows a "Book a court" button, so a second one pinned to
  // the screen is just noise. Track whether we're past the hero and only reveal
  // the pill afterwards (phones only — see the CSS).
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.7)

    onScroll()  // run once, so reloading partway down the page starts correct
    window.addEventListener('scroll', onScroll, { passive: true })

    // The returned function is the cleanup. React runs it when the component
    // goes away. Without it the listener outlives the component: a leak.
    return () => window.removeEventListener('scroll', onScroll)
  }, [])  // empty array = no dependencies, so this runs once on mount

  return (
    <header className={`navbar ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="shell nav-inner">
        {/* On a phone this is the only thing in the pill — tap to return to the top. */}
        <a className="nav-brand" href="#top">
          {site.name}
        </a>

        <div className="nav-actions">
          <a className="nav-link" href="#contact">
            Contact
          </a>
          <a className="nav-cta" href="#courts">
            Book now
          </a>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="shell hero-inner">
        <p className="eyebrow">
          <span className="eyebrow-dot" />
          {site.status} &middot; {site.city}, {site.province}
        </p>

        <h1 className="hero-title">Nanacourt.</h1>

        <p className="hero-lede">
          A family-run court in Maasin City with a fresh ocean breeze and seaside view.
          <br />Open to everyone, book your session and start playing!
        </p>

        <div className="hero-actions">
          <a className="btn btn-primary" href="#courts">
            Book a court
            <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-arrow">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </a>
          <a className="btn btn-quiet" href="#contact">
            Contact us
          </a>
        </div>
      </div>

      <div className="hero-stats">
        <div className="shell stats-inner">
          <div className="stat">
            <span className="stat-label">Facilities</span>
            <strong className="stat-value">{courts.length} courts</strong>
            <span className="stat-sub">All outdoor</span>
          </div>
          <div className="stat">
            <span className="stat-label">Pricing</span>
            <strong className="stat-value">{peso(site.pricePerHour)} / hour</strong>
          </div>
          <div className="stat">
            <span className="stat-label">Schedule</span>
            <strong className="stat-value">Open daily</strong>
            <span className="stat-sub">{site.opensAt} — {site.closesAt}</span>
          </div>
        </div>
      </div>

      <a className="scroll-cue" href="#courts" aria-label="Scroll to the courts">
        <span>Explore</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      </a>
    </section>
  )
}

function Courts({ onBook }) {
  const subtitles = {
    a: 'Ocean Breeze · Outdoor',
    b: 'Seaside View · Outdoor',
  }

  return (
    <section className="section section-courts" id="courts">
      <div className="shell">
        <div className="courts-header">
          <h2 className="courts-title">The Courts</h2>
          <div className="courts-header-line" />
          <p className="courts-desc">Two outdoor courts, each with its own view of the coast.</p>
        </div>

        <ul className="court-grid">
          {courts.map((court) => (
            <li className="court-card" key={court.id}>
              <div className="court-card-image">
                {court.image && (
                  <img src={court.image} alt={court.name} />
                )}
                <span className="court-price-badge">{peso(site.pricePerHour)}/hr</span>
                <div className="court-card-overlay">
                  <h3 className="court-name">{court.name}</h3>
                  <span className="court-type">{subtitles[court.id] || court.type}</span>
                </div>
              </div>
              <div className="court-card-footer">
                <div className="court-avail">
                  <IconClock />
                  <span>Available from {site.opensAt}</span>
                </div>
                <button className="btn btn-primary court-book-btn" onClick={() => onBook(court)}>
                  Book this court
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-arrow">
                    <path d="M5 12h13M13 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Visit() {
  return (
    <section className="section section-visit" id="contact">
      <div className="shell visit-layout">
        <div className="visit-text">
          <p className="eyebrow">Visit</p>
          <h2 className="visit-heading">
            Find us in<br /><em>{site.city}.</em>
          </h2>

          <div className="visit-info-row">
            <span className="visit-icon-circle"><IconPin /></span>
            <div>
              <strong>{site.name}</strong>
              <p>{site.address}<br />{site.city}, {site.province}</p>
            </div>
          </div>

          <div className="visit-info-row">
            <span className="visit-icon-circle">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" /></svg>
            </span>
            <div>
              <strong>Contact</strong>
              <p><a className="visit-phone" href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a></p>
            </div>
          </div>
        </div>

        <div className="visit-map">
          <svg viewBox="0 0 600 500" className="topo-map" aria-hidden="true">
            <defs>
              <linearGradient id="sea" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0e2218" />
                <stop offset="100%" stopColor="#16352a" />
              </linearGradient>
            </defs>
            <rect width="600" height="500" fill="url(#sea)" rx="16" />
            <path d="M420,0 C400,40 380,80 360,120 C340,160 330,200 340,240 C350,280 370,310 400,340 C430,370 450,390 460,420 C470,450 480,475 490,500" fill="none" stroke="rgba(212,243,74,0.12)" strokeWidth="1" />
            <path d="M450,0 C430,50 410,100 400,150 C390,200 395,240 410,280 C425,320 445,350 460,380 C475,410 485,440 495,470 L500,500" fill="none" stroke="rgba(212,243,74,0.12)" strokeWidth="1" />
            <path d="M380,0 C370,60 355,120 340,170 C325,220 320,260 330,300 C340,340 360,370 385,400 C410,430 430,460 445,500" fill="none" stroke="rgba(212,243,74,0.12)" strokeWidth="1" />
            <path d="M480,0 C470,30 460,70 455,110 C450,150 448,190 450,230 C452,270 460,310 470,350 C480,390 488,430 495,470 L500,500" fill="none" stroke="rgba(212,243,74,0.08)" strokeWidth="1" />
            <path d="M350,0 C330,70 310,140 300,200 C290,260 295,300 310,340 C325,380 345,410 370,440 C395,470 415,490 430,500" fill="none" stroke="rgba(212,243,74,0.08)" strokeWidth="1" />
            <path d="M500,60 C485,80 460,110 440,150 C420,190 410,230 415,270 C420,310 435,340 455,370 C475,400 490,430 500,460" fill="#16352a" stroke="rgba(212,243,74,0.15)" strokeWidth="1" />
            <path d="M500,30 C490,55 475,85 460,120 C445,155 435,195 430,235 C425,275 430,310 445,345 C460,380 478,405 500,430" fill="#1a3f30" stroke="rgba(212,243,74,0.12)" strokeWidth="1" />
            <path d="M500,0 C495,25 488,60 480,95 C472,130 465,170 462,210 C459,250 460,290 468,325 C476,360 488,390 500,415" fill="#1e4a38" stroke="rgba(212,243,74,0.1)" strokeWidth="1" />
            <path d="M520,0 C510,50 500,100 495,150 C490,200 492,250 500,300 C508,350 520,390 535,430 C550,470 560,490 570,500" fill="#224f3c" stroke="rgba(212,243,74,0.08)" strokeWidth="1" />
            <circle cx="365" cy="255" r="6" fill="var(--sprout)" />
            <circle cx="365" cy="255" r="12" fill="none" stroke="var(--sprout)" strokeWidth="2" opacity="0.4" />
          </svg>
          <div className="map-label">{site.city}, {site.province}</div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <span>
          &copy; {new Date().getFullYear()} {site.name}
        </span>
        <span className="footer-note">Pickleball in {site.city}</span>
        <a className="footer-admin" href="/admin">Admin</a>
      </div>
    </footer>
  )
}

export default function App() {
  const [bookingCourt, setBookingCourt] = useState(null)
  const closeBooking = useCallback(() => setBookingCourt(null), [])

  return (
    <>
      <Header />
      <main>
        <Hero />
        <Courts onBook={setBookingCourt} />
        <Visit />
      </main>
      <Footer />
      {bookingCourt && <BookingModal court={bookingCourt} onClose={closeBooking} />}
    </>
  )
}
