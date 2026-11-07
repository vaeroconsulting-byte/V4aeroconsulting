interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
  note?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  note,
}: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="section-heading__title">{title}</h2>
      <p className="section-heading__description">{description}</p>
      {note ? <p className="demo-note section-heading__note">{note}</p> : null}
    </div>
  );
}
