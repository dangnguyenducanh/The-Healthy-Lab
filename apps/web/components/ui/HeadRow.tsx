/** A section's head row: the h2 on the left line, one short line on the split line (column 7). */
export function HeadRow({ id, title, children }: { id: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="grid head-row">
      <h2 id={id} className="span-6">{title}</h2>
      {children && <div className="span-6 start-7 head-row__aside">{children}</div>}
    </div>
  );
}
