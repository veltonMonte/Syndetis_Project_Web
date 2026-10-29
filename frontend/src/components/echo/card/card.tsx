"use client";

import { useRef, type MouseEventHandler, type ReactNode } from "react";
import { useSoundOptional } from "echo-ui-core/sound";
import { useRippleSurface } from "../panel";
import { SizeProvider, type ControlSize } from "../size";
import "./card.css";

export interface CardProps {
  /** The card's name. With `href` or `onClick`, it's also the link or button. */
  title: ReactNode;
  /** Optional eyebrow label above the title. */
  eyebrow?: ReactNode;
  /** A line under the title. */
  description?: ReactNode;
  /** One control or metadata badge at the header's end. */
  action?: ReactNode;
  /** Alias for action/meta slot in compact SaaS cards. */
  meta?: ReactNode;
  /** An image, chart or preview across the top, flush to the edges. */
  media?: ReactNode;
  /** The body. */
  children?: ReactNode;
  /** Actions along the bottom; their controls default to `sm`. */
  footer?: ReactNode;
  /** `raised` surface (default), or a `screen` well for a readout. */
  variant?: "raised" | "screen";
  /** Padding and gaps: `sm` for dense dashboards, `md` (default), `lg` for a feature. */
  size?: ControlSize;
  /** Optional padding density preset. */
  padding?: "default" | "compact";
  /** The whole card goes here. */
  href?: string;
  /** The whole card does this. */
  onClick?: MouseEventHandler<HTMLElement>;
  /** The title's heading level. Default 3. */
  headingLevel?: 2 | 3 | 4;
}

export function Card({
  title,
  eyebrow,
  description,
  action,
  meta,
  media,
  children,
  footer,
  variant = "raised",
  size = "md",
  padding,
  href,
  onClick,
  headingLevel = 3,
}: CardProps) {
  const interactive = href !== undefined || onClick !== undefined;
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sound = useSoundOptional();
  useRippleSurface(root, canvas, { enabled: interactive });
  const Heading = `h${headingLevel}` as const;
  const press: MouseEventHandler<HTMLElement> = (e) => {
    sound?.play("tap");
    onClick?.(e);
  };

  const name = !interactive ? (
    title
  ) : href !== undefined ? (
    <a className="echo-card__link" href={href} onClick={onClick ? press : () => sound?.play("tap")}>
      {title}
    </a>
  ) : (
    <button type="button" className="echo-card__link" onClick={press}>
      {title}
    </button>
  );

  const rightSlot = action ?? meta;

  return (
    <div
      ref={root}
      className="echo-panel echo-card"
      data-variant={variant}
      data-size={size}
      data-padding={padding === "compact" || size === "sm" ? "compact" : undefined}
      data-interactive={interactive ? "" : undefined}
    >
      {interactive ? <canvas ref={canvas} className="echo-panel__ripple" aria-hidden="true" /> : null}
      <div className="echo-card__inner">
        {media ? <div className="echo-card__media">{media}</div> : null}
        <div className="echo-card__header">
          <div className="echo-card__heading">
            {eyebrow ? <span className="echo-card__eyebrow">{eyebrow}</span> : null}
            <Heading className="echo-card__title">{name}</Heading>
            {description ? <p className="echo-card__description">{description}</p> : null}
          </div>
          {rightSlot ? <div className="echo-card__action">{rightSlot}</div> : null}
        </div>
        {children ? <div className="echo-card__body">{children}</div> : null}
        {footer ? (
          <SizeProvider size="sm">
            <div className="echo-card__footer">{footer}</div>
          </SizeProvider>
        ) : null}
      </div>
    </div>
  );
}
