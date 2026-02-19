type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="max-w-2xl space-y-2">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p> : null}
      <h2 className="text-3xl font-semibold leading-tight md:text-4xl">{title}</h2>
      {description ? <p className="text-sm text-foreground/75 md:text-base">{description}</p> : null}
    </div>
  );
}
