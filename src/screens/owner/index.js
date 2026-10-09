/* Punto de entrada del panel del dueño (se descarga solo cuando entra un dueño). */
import ComplexPage from '../player/Complex'
import { createElement } from 'react'
import { useOwner } from './common'
export { OwnerBookings, OwnerClients, OwnerHome } from './Basics'
export { default as Agenda } from './Agenda'
export { default as Courts } from './Courts'
export { Finance, More, Promotions } from './Business'
export { default as Settings } from './Settings'
export { default as OwnerReviews } from './Reviews'
export { default as Stats } from './Stats'
export function OwnerPreview() {
  const { complex } = useOwner()
  return complex ? createElement(ComplexPage, { id: complex.id, preview: true, inShell: true }) : null
}
