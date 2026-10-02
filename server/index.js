import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'
import db from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(join(__dirname, 'uploads')))

app.get('/admin', (_req, res) => {
  res.sendFile(join(__dirname, 'admin.html'))
})

const storage = multer.diskStorage({
  destination: join(__dirname, 'uploads'),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e4)
    cb(null, unique + extname(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg']
    cb(null, allowed.includes(file.mimetype))
  },
})

// Check booked slots for a court on a date
app.get('/api/availability', (req, res) => {
  const { court_id, date } = req.query
  if (!court_id || !date) return res.status(400).json({ error: 'court_id and date required' })

  const rows = db.prepare(
    `SELECT slots FROM bookings WHERE court_id = ? AND date = ? AND status IN ('pending', 'confirmed')`
  ).all(court_id, date)

  const booked = new Set()
  rows.forEach(r => {
    if (r.slots) r.slots.split(',').forEach(s => booked.add(Number(s)))
  })

  res.json({ booked: [...booked].sort((a, b) => a - b) })
})

// Create a booking
app.post('/api/bookings', upload.single('proof'), (req, res) => {
  const { court_id, court_name, date, time_range, slots, hours, total_price, name, phone, email, payment_method } = req.body

  if (!court_id || !date || !time_range || !hours || !name || !phone || !payment_method) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const proof_file = req.file ? req.file.filename : ''

  const stmt = db.prepare(`
    INSERT INTO bookings (court_id, court_name, date, time_range, slots, hours, total_price, name, phone, email, payment_method, proof_file)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(court_id, court_name, date, time_range, slots || '', Number(hours), Number(total_price), name, phone, email || '', payment_method, proof_file)

  res.status(201).json({ id: result.lastInsertRowid, status: 'pending' })
})

// Daily schedule for admin
app.get('/api/schedule', (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date required' })

  const rows = db.prepare(
    `SELECT id, court_id, court_name, slots, name, phone, status, time_range
     FROM bookings WHERE date = ? AND status IN ('pending', 'confirmed')
     ORDER BY court_id, slots`
  ).all(date)

  res.json(rows)
})

// List bookings (admin)
app.get('/api/bookings', (req, res) => {
  const { status } = req.query
  let rows
  if (status) {
    rows = db.prepare('SELECT * FROM bookings WHERE status = ? ORDER BY created_at DESC').all(status)
  } else {
    rows = db.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all()
  }
  res.json(rows)
})

// Get single booking
app.get('/api/bookings/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(row)
})

// Update booking status (confirm / reject)
app.patch('/api/bookings/:id', (req, res) => {
  const { status } = req.body
  const allowed = ['pending', 'confirmed', 'rejected']
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Status must be pending, confirmed, or rejected' })
  }

  const result = db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' })

  res.json({ id: Number(req.params.id), status })
})

// Delete booking
app.delete('/api/bookings/:id', (req, res) => {
  const result = db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' })
  res.json({ deleted: true })
})

app.listen(PORT, () => {
  console.log(`Nanacourt API running on http://localhost:${PORT}`)
})
