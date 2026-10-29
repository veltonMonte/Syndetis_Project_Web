import { forwardRef } from "react";
import {
  HardwareButton,
  type GlassVariant,
  type HardwareButtonProps,
} from "@/components/echo/hardware-button";

export type GlassButtonProps = HardwareButtonProps & {
  /**
   * Optical glass treatment style:
   * - `"liquid"`: 3D convex water-drop meniscus, flowing liquid currents, opposite-parallax caustics & elastic hover morph
   * - `"liquid-refract"`: SVG displacement lens refraction (`#echo-liquid-refract`) with liquid caustics
   * - `"frosted"`: Heavy diffused backdrop blur
   * - `"clear"`: Crisp optical lens with subtle blur
   * - `"subtle"`: Whisper-thin translucent tint
   */
  glassVariant?: GlassVariant;
};

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  function GlassButton({ glassVariant = "liquid", ...props }, ref) {
    const forwarded = { ...props, glassVariant } as HardwareButtonProps;
    return <HardwareButton ref={ref} {...forwarded} />;
  },
);

export type { GlassVariant };
