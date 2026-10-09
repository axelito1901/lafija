import { slotEnd } from './format'

const stamp = (date, time) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`
export function downloadICS({ title, date, time, minutes = 60, place = '', description = '' }) {
  const end = slotEnd(time, minutes)
  const endDate = end < time ? new Date(new Date(`${date}T12:00:00`).getTime() + 86400000).toISOString().slice(0, 10) : date
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//La Fija//ES', 'BEGIN:VEVENT',
    `UID:${date}${time}-${Math.random().toString(36).slice(2)}@lafija`, `DTSTAMP:${stamp(date, time)}`,
    `DTSTART:${stamp(date, time)}`, `DTEND:${stamp(endDate, end)}`,
    `SUMMARY:${title}`, `LOCATION:${place.replace(/,/g, '\\,')}`, `DESCRIPTION:${description}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Tu cancha', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR']
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: 'reserva-la-fija.ics' })
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
