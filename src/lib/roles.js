export const homeFor = role => role === 'owner' ? '/dueno' : role === 'admin' ? '/admin' : '/'
export const ROLE_LABEL = { player: 'Jugador', owner: 'Dueño', admin: 'Administrador' }
