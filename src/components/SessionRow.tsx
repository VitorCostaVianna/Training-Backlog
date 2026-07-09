export function SessionRow({
  date,
  title,
  meta,
  onClick,
}: {
  date: string
  title: string
  meta: string
  onClick?: () => void
}) {
  const content = (
    <>
      <div className="session-date">{date}</div>
      <div className="session-title">{title}</div>
      <div className="session-meta">{meta}</div>
    </>
  )
  if (onClick) {
    return (
      <button className="session-row session-row--btn" onClick={onClick}>
        {content}
      </button>
    )
  }
  return <div className="session-row">{content}</div>
}
