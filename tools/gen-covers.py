"""Genera portadas ilustradas de canchas (SVG propios, sin derechos de autor) para el modo demo."""
import random, math, sys
W, H = 1200, 675
SKY = {
  'day':   ('#7fc4ee', '#d9f0fb', '#f6e7bd'),
  'dusk':  ('#2b3a6b', '#e2806b', '#f7c46c'),
  'night': ('#050a18', '#0f1d3d', '#26407a'),
  'cloud': ('#8da7b8', '#c4d2db', '#e6ecef'),
}
def scene(name, mood, stripes, hue, roof, seed):
    r = random.Random(seed)
    top, mid, low = SKY[mood]
    night = mood == 'night'
    hz = 235  # horizonte
    g1, g2 = hue
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" preserveAspectRatio="xMidYMid slice">']
    out.append(f'''<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/><stop offset=".7" stop-color="{mid}"/><stop offset="1" stop-color="{low}"/></linearGradient>
<linearGradient id="turf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{g2}"/><stop offset="1" stop-color="{g1}"/></linearGradient>
<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity="{.95 if night else .55}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".45" r=".8"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="{.55 if night else .32}"/></radialGradient>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="{seed}"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .09 0"/></filter>
<filter id="blur"><feGaussianBlur stdDeviation="3"/></filter><filter id="blur2"><feGaussianBlur stdDeviation="14"/></filter>
</defs>''')
    out.append(f'<rect width="{W}" height="{H}" fill="url(#sky)"/>')
    if night:
        for _ in range(70):
            out.append(f'<circle cx="{r.randint(0,W)}" cy="{r.randint(0,hz-30)}" r="{r.random()*1.4+.3:.1f}" fill="#fff" opacity="{r.random()*.7+.2:.2f}"/>')
    elif mood in ('day', 'cloud'):
        for _ in range(5):
            x, y = r.randint(-50, W), r.randint(20, 150)
            out.append(f'<g opacity=".8" filter="url(#blur2)"><ellipse cx="{x}" cy="{y}" rx="{r.randint(90,170)}" ry="{r.randint(14,26)}" fill="#fff"/></g>')
    # skyline: edificios y árboles lejanos
    base = '#0a1226' if night else ('#3b4a6b' if mood == 'dusk' else '#8aa0ad')
    x = -20
    while x < W:
        w = r.randint(40, 110); h = r.randint(25, 95)
        out.append(f'<rect x="{x}" y="{hz-h}" width="{w}" height="{h+6}" fill="{base}" opacity=".85"/>')
        if night or mood == 'dusk':
            for wy in range(hz-h+8, hz-4, 14):
                for wx in range(x+6, x+w-8, 14):
                    if r.random() < .35: out.append(f'<rect x="{wx}" y="{wy}" width="5" height="7" fill="#ffd978" opacity=".8"/>')
        x += w + r.randint(-8, 6)
    for _ in range(26):
        tx = r.randint(0, W); th = r.randint(30, 58)
        out.append(f'<ellipse cx="{tx}" cy="{hz-th/2+6}" rx="{th*.42:.0f}" ry="{th/2:.0f}" fill="{"#0b1a1a" if night else "#2c5a3a"}" opacity=".9"/>')
    # césped
    out.append(f'<rect y="{hz}" width="{W}" height="{H-hz}" fill="url(#turf)"/>')
    # franjas en perspectiva
    n = 12
    for i in range(n):
        if i % 2: continue
        # trapecios que convergen al punto de fuga
        def xs(t, f):  # f: fracción horizontal en la base (0..1) -> x en y=t
            vx = W/2; bx = f*W*1.6 - W*.3
            return vx + (bx - vx) * t
        t0 = 0.0; t1 = 1.0
        yA, yB = hz, H
        a0, a1 = i/n, (i+1)/n
        pts = f'{xs(0,a0):.0f},{yA} {xs(0,a1):.0f},{yA} {xs(1,a1):.0f},{yB} {xs(1,a0):.0f},{yB}'
        if stripes == 'h':
            pass
        out.append(f'<polygon points="{pts}" fill="#000" opacity=".085"/>')
    if stripes == 'h':
        for k in range(9):
            t0 = (k/9)**1.7; t1 = ((k+.5)/9)**1.7
            if k % 2 == 0: out.append(f'<rect y="{hz+(H-hz)*t0:.0f}" width="{W}" height="{(H-hz)*(t1-t0):.0f}" fill="#fff" opacity=".05"/>')
    # líneas de la cancha (perspectiva simple)
    L = '#ffffff'; op = .9
    def P(u, v):  # u 0..1 ancho, v 0..1 profundidad (0 lejos) -> x,y
        y = hz + (H - hz) * (v ** 1.9)
        half = (180 + (W*.78 - 180) * (v ** 1.9)) / 2
        return W/2 + (u - .5) * 2 * half, y
    def line(a, b, w=3):
        (x1, y1), (x2, y2) = a, b
        return f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{L}" stroke-width="{w}" opacity="{op}" stroke-linecap="round"/>'
    v0, v1 = .12, .96
    out += [line(P(0,v0),P(1,v0)), line(P(0,v1),P(1,v1),5), line(P(0,v0),P(0,v1),4), line(P(1,v0),P(1,v1),4), line(P(0,.52),P(1,.52),3)]
    # área grande/chica lejos
    out += [line(P(.22,v0),P(.22,.26),2), line(P(.78,v0),P(.78,.26),2), line(P(.22,.26),P(.78,.26),2)]
    # círculo central
    cx, cy = P(.5, .52)
    out.append(f'<ellipse cx="{cx:.0f}" cy="{cy:.0f}" rx="{120*(.52**1.9)*2.2+40:.0f}" ry="{(120*(.52**1.9)*2.2+40)*.28:.0f}" fill="none" stroke="{L}" stroke-width="3" opacity="{op}"/>')
    # arco lejano con red
    gx1, gy1 = P(.34, v0); gx2, gy2 = P(.66, v0)
    gh = 46
    out.append(f'<g opacity=".95"><rect x="{gx1:.0f}" y="{gy1-gh:.0f}" width="{gx2-gx1:.0f}" height="{gh}" fill="#fff" opacity=".12"/>')
    for k in range(0, int(gx2-gx1)+1, 7): out.append(f'<line x1="{gx1+k:.0f}" y1="{gy1-gh:.0f}" x2="{gx1+k:.0f}" y2="{gy1:.0f}" stroke="#fff" stroke-width=".6" opacity=".5"/>')
    for k in range(0, gh+1, 7): out.append(f'<line x1="{gx1:.0f}" y1="{gy1-k:.0f}" x2="{gx2:.0f}" y2="{gy1-k:.0f}" stroke="#fff" stroke-width=".6" opacity=".5"/>')
    out.append(f'<path d="M{gx1:.0f} {gy1:.0f}V{gy1-gh:.0f}H{gx2:.0f}V{gy2:.0f}" fill="none" stroke="#fff" stroke-width="4"/></g>')
    # alambrado / paredes laterales
    for side in (0, 1):
        for k in range(14):
            v = .1 + k * .07
            x, y = P(side, v)
            x += (-1 if side == 0 else 1) * 22 * (v ** 1.9) * 3 + (-1 if side==0 else 1)*6
            h = 18 + 150 * (v ** 1.9)
            out.append(f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{x:.0f}" y2="{y-h:.0f}" stroke="{"#9aa7b0" if not night else "#47566b"}" stroke-width="{1+3*v**1.9:.1f}" opacity=".85"/>')
        (xa, ya), (xb, yb) = P(side, .1), P(side, .96)
        off = (-1 if side == 0 else 1)
        out.append(f'<polygon points="{xa+off*8:.0f},{ya:.0f} {xa+off*8:.0f},{ya-20:.0f} {xb+off*80:.0f},{yb-170:.0f} {xb+off*80:.0f},{yb:.0f}" fill="#9fb0bb" opacity=".13"/>')
    # techo (canchas techadas)
    if roof:
        out.append(f'<polygon points="0,0 {W},0 {W},95 {W*.82:.0f},60 {W*.18:.0f},60 0,95" fill="#10151c" opacity=".92"/>')
        for k in range(1, 12):
            x = k * W / 12
            out.append(f'<line x1="{x:.0f}" y1="0" x2="{W/2+(x-W/2)*.7:.0f}" y2="62" stroke="#2a3340" stroke-width="3"/>')
    # reflectores
    spots = [(120, 70), (W-120, 70), (330, 135), (W-330, 135)] if not roof else [(200, 66), (500, 62), (700, 62), (1000, 66)]
    for sx, sy in spots:
        out.append(f'<circle cx="{sx}" cy="{sy}" r="{110 if night else 70}" fill="url(#glow)"/>')
        out.append(f'<rect x="{sx-16}" y="{sy-8}" width="32" height="16" rx="3" fill="#fff" opacity="{1 if night else .85}"/>')
        if night:
            out.append(f'<polygon points="{sx-14},{sy+8} {sx+14},{sy+8} {W/2+(sx-W/2)*1.9:.0f},{H} {W/2+(sx-W/2)*.2:.0f},{H}" fill="#fffbe0" opacity=".06"/>')
    if night:
        out.append(f'<rect y="{hz}" width="{W}" height="{H-hz}" fill="#0a1a10" opacity=".35"/>')
        out.append(f'<ellipse cx="{W/2}" cy="{hz+(H-hz)*.6:.0f}" rx="520" ry="150" fill="#fff" opacity=".12" filter="url(#blur2)"/>')
    # pelota
    bx, by = P(.62, .78)
    out.append(f'<ellipse cx="{bx:.0f}" cy="{by+16:.0f}" rx="17" ry="4" fill="#000" opacity=".35"/><circle cx="{bx:.0f}" cy="{by:.0f}" r="13" fill="#fafafa"/><circle cx="{bx:.0f}" cy="{by:.0f}" r="13" fill="none" stroke="#222" stroke-width="1.2"/><polygon points="{bx:.0f},{by-5:.0f} {bx+5:.0f},{by-1:.0f} {bx+3:.0f},{by+5:.0f} {bx-3:.0f},{by+5:.0f} {bx-5:.0f},{by-1:.0f}" fill="#222"/>')
    out.append(f'<rect width="{W}" height="{H}" fill="url(#vig)"/><rect width="{W}" height="{H}" filter="url(#grain)"/></svg>')
    return '\n'.join(out)

SETS = [
  ('cancha-1', 'day', 'v', ('#2e8a4a', '#49a85f'), False, 11),
  ('cancha-2', 'dusk', 'v', ('#1f6e3d', '#2f8a50'), False, 22),
  ('cancha-3', 'night', 'v', ('#176a38', '#23864a'), False, 33),
  ('cancha-4', 'cloud', 'h', ('#2b7d45', '#3f9a58'), True, 44),
  ('cancha-5', 'night', 'h', ('#1b7040', '#2a8f52'), True, 55),
  ('cancha-6', 'day', 'h', ('#3a9a55', '#5cb86e'), False, 66),
  ('cancha-7', 'dusk', 'h', ('#23783f', '#35914f'), True, 77),
  ('cancha-8', 'cloud', 'v', ('#2e8247', '#46a05c'), False, 88),
]
for name, mood, st, hue, roof, seed in SETS:
    open(f'public/demo/{name}.svg', 'w').write(scene(name, mood, st, hue, roof, seed))
print('ok')
