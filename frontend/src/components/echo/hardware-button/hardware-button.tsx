"use client";

/**
 * HardwareButton — Syndetis optical glass on Echo's accessible controls.
 * Capsule backdrop refraction and one spring for fluid, hover and press.
 * No emitted light or specular sweep is painted over the label.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  type CSSProperties,
  type DOMAttributes,
  type MutableRefObject,
  type ReactNode,
} from "react";
import type { EchoPressInterop } from "echo-ui-core/types";
import { useCapPhysics } from "echo-ui-core/tactile";
import { useControlSize, type ControlSize } from "../size";
import { LiquidLens } from "./liquid-lens";
import { useLiquidMotion } from "./use-liquid-motion";
import { warnIfUnsupportedTreatment, warnIfCaptionRepeatsLabel } from "./treatment";
import "./hardware-button.css";

declare const process: { env: { NODE_ENV?: string } };

export {
  warnIfUnsupportedTreatment,
  warnIfCaptionRepeatsLabel,
  __resetEngravedPrimaryWarning,
} from "./treatment";

export type HardwareButtonVariant = "primary" | "neutral" | "ghost";
export type HardwareButtonSize = ControlSize;
export type GlassVariant = "liquid" | "liquid-refract" | "frosted" | "clear" | "subtle";

interface HardwareButtonOwnProps extends EchoPressInterop {
  /** The cap's label. */
  children?: ReactNode;
  variant?: HardwareButtonVariant;
  /**
   * Optical glass treatment style (compatible with glasscn GlassButton):
   * defaults to `"liquid"`.
   */
  glassVariant?: GlassVariant;
  size?: HardwareButtonSize;
  /** The button takes the full width of the row it's in. */
  fullWidth?: boolean;
  /** Leading icon. */
  icon?: ReactNode;
  /** Trailing icon. */
  trailingIcon?: ReactNode;
  /** Show the loading dots; also disables interaction. */
  loading?: boolean;
  /** Debossed label carved into the cap. */
  engraved?: boolean;
  /** Small machine caption rendered under the button. */
  caption?: string;
  /** Navigate instead of act: the cap renders as an `<a href>`. */
  href?: string;
  /** With `href`: where to open it (e.g. "_blank"). */
  target?: string;
  /** With `href`: link relationship (e.g. "noopener"). */
  rel?: string;
  /** The press lands in the whole device, not just the cap. */
  impact?: boolean;
  /** How full the cap is, 0–1. */
  fill?: number;
  /** Holds the cap down from outside. */
  held?: boolean;
}

type IconOnly =
  | { iconOnly?: false }
  | {
      iconOnly: true;
      "aria-label": string;
      "aria-labelledby"?: string;
    }
  | { iconOnly: true; "aria-labelledby": string; "aria-label"?: string };

export type HardwareButtonProps = HardwareButtonOwnProps & IconOnly;

export const HardwareButton = forwardRef<HTMLButtonElement, HardwareButtonProps>(
  function HardwareButton(
    {
      variant = "neutral",
      glassVariant = "liquid",
      size: ownSize,
      fullWidth = false,
      icon,
      trailingIcon,
      iconOnly = false,
      loading = false,
      engraved = false,
      caption,
      disabled = false,
      children,
      href,
      target,
      rel,
      impact = false,
      fill,
      held,
      ...rest
    },
    forwardedRef,
  ) {
    const size = useControlSize(ownSize);

    // Keep sound + keyboard activation + impact from Echo UI without transform conflicts
    const {
      ref: capRef,
      handlers: capHandlers,
      press,
      release,
    } = useCapPhysics<HTMLButtonElement>({
      lift: 0,
      travel: 0,
      tilt: 0,
      impact: false,
      sound: true,
    });

    useEffect(() => {
      if (held === undefined) return;
      if (held) press();
      else release();
    }, [held, press, release]);

    const off = disabled || loading;
    const isOpticalLens = variant !== "ghost" && (glassVariant === "liquid" || glassVariant === "liquid-refract");
    const attachLiquid = useLiquidMotion(!off, iconOnly);

    const setRef = useCallback(
      (node: HTMLButtonElement | null) => {
        capRef(node);
        attachLiquid(node);
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef)
          (forwardedRef as MutableRefObject<HTMLButtonElement | null>).current = node;
      },
      [forwardedRef, capRef, attachLiquid],
    );

    if (process.env.NODE_ENV !== "production") {
      warnIfUnsupportedTreatment(variant, engraved);
      warnIfCaptionRepeatsLabel(caption, children);
    }

    const restProps = rest as Record<string, unknown>;
    const mergedHandlers: Record<string, (event: never) => void> = {};
    // Exclude onPointerMove/onPointerEnter/onPointerLeave from capHandlers so useCapPhysics
    // never overwrites transform or --mx/--my while useLiquidMotion springs are active.
    const capKeys: Array<keyof DOMAttributes<HTMLButtonElement>> = [
      "onPointerDown",
      "onPointerUp",
      "onPointerCancel",
      "onBlur",
      "onKeyDown",
      "onKeyUp",
    ];

    for (const key of capKeys) {
      const motion = capHandlers[key] as ((event: never) => void) | undefined;
      const incoming = restProps[key] as ((event: never) => void) | undefined;
      mergedHandlers[key] = (event) => {
        incoming?.(event);
        motion?.(event);
      };
    }

    const filled = fill === undefined ? undefined : Math.min(1, Math.max(0, fill));
    const { className: extraClass, style: extraStyle, ...passed } = restProps as {
      className?: string;
      style?: CSSProperties;
    };
    const capProps = {
      className: extraClass ? `echo-hw__cap ${extraClass}` : "echo-hw__cap",
      "data-variant": variant,
      "data-glass": glassVariant,
      "data-size": size,
      "data-icon-only": iconOnly || undefined,
      "data-engraved": engraved || undefined,
      "data-fill": filled === undefined ? undefined : "",
      style:
        filled === undefined
          ? extraStyle
          : ({ ...extraStyle, "--hw-fill": filled.toFixed(4) } as CSSProperties),
    };

    const content = (
      <>
        {isOpticalLens ? <LiquidLens /> : null}
        <span className="echo-hw__content" data-hidden={loading || undefined}>
          {icon ? (
            <span className="echo-hw__icon" aria-hidden>
              {icon}
            </span>
          ) : null}
          {!iconOnly && children != null ? <span>{children}</span> : null}
          {trailingIcon ? (
            <span className="echo-hw__icon" aria-hidden>
              {trailingIcon}
            </span>
          ) : null}
        </span>
        {loading ? (
          <span className="echo-hw__dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        ) : null}
        {filled !== undefined ? <span className="echo-hw__fill" aria-hidden /> : null}
      </>
    );

    return (
      <div
        className="echo-hw"
        data-size={size}
        data-variant={variant}
        data-glass={glassVariant}
        data-full-width={fullWidth || undefined}
      >
        <div className="echo-hw__well" data-impact={impact || undefined}>
          {href != null ? (
            <a
              ref={setRef as unknown as (node: HTMLAnchorElement | null) => void}
              href={href}
              target={target}
              rel={rel}
              {...capProps}
              {...passed}
              {...mergedHandlers}
            >
              {content}
            </a>
          ) : (
            <button
              ref={setRef}
              type="button"
              {...capProps}
              data-loading={loading || undefined}
              disabled={off}
              aria-busy={loading || undefined}
              {...passed}
              {...mergedHandlers}
            >
              {content}
            </button>
          )}
        </div>
        {caption ? <span className="echo-hw__caption">{caption}</span> : null}
      </div>
    );
  },
);
