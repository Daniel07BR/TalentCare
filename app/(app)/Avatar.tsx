/* Avatar: foto real (via /api/avatar/[id]) quando houver; senão, iniciais. */
export default function Avatar({
  id, hasAvatar, initials, color, size = 32, radius = '50%',
}: {
  id: string; hasAvatar: boolean; initials: string; color: string; size?: number; radius?: number | string
}) {
  if (hasAvatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/api/avatar/${id}`} alt={initials} style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', flex: 'none' }} />
    )
  }
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.38), fontWeight: 700, color: '#fff', flex: 'none' }}>
      {initials}
    </div>
  )
}
