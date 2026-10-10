package com.syndetis.core.model.entity

object DefaultLayoutTemplate {

    fun createDefault(): Map<String, Any> = mapOf(
        "theme" to mapOf(
            "mode" to "light",
            "primaryColor" to "#6366F1",
            "secondaryColor" to "#EC4899",
            "backgroundColor" to "#FFFFFF",
            "fontFamily" to "Inter"
        ),
        "productCard" to mapOf(
            "style" to "modern",                     // classic, modern, minimal, glassmorphism
            "imageHoverEffect" to "swap_image",       // swap_image, zoom, fade, none
            "borderRadius" to "rounded-xl",
            "showQuickBuy" to true,
            "showRating" to true,
            "border" to "subtle"
        ),
        "promoBadge" to mapOf(
            "style" to "pill",                       // pill, ribbon, discount_tag
            "position" to "top-right",               // top-right, top-left
            "color" to "#EF4444",
            "textFormat" to "percentage"             // percentage, text_only
        ),
        "catalogLayout" to mapOf(
            "type" to "grid-4",                      // grid-3, grid-4, list, masonry
            "gap" to "medium",
            "showCategoryFilter" to true
        ),
        "carousel" to mapOf(
            "autoplay" to true,
            "intervalMs" to 4000,
            "transition" to "slide",                 // slide, fade
            "showArrows" to true,
            "showDots" to true
        ),
        "animations" to mapOf(
            "cardHover" to "lift",                   // lift, glow, scale, none
            "buttonHover" to "glow",
            "pageTransition" to "smooth-fade"
        )
    )
}
