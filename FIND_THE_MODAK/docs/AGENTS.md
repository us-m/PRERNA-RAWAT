Find the Modak Design System
Use this design system for any new artifact that belongs to the Find the Modak experience. Read ../README.md before authoring UI and use the tokens and patterns from ../tokens.css and ../components.css rather than introducing new colors, type scales, radii, or shadow language.

Product identity
Find the Modak is a warm, family-friendly Ganesh Chaturthi maze adventure. The interface should feel festive, welcoming, and game-like without becoming noisy or childish.

Required foundations
Load Baloo 2 for expressive headings and DM Sans for utility text.
Use the deep plum night surfaces as the base and reserve saffron/gold for primary action, progress, focus, and celebration.
Use rose for warnings and danger states.
Keep cream text on dark surfaces and muted lavender for secondary copy.
Use rounded panels, compact labels, soft glow, and restrained borders.
Preserve responsive behavior: the system is designed for narrow phones through wide desktop layouts.
Use icons or short text labels with accessible names; do not rely on color alone to communicate state.
Component guidance
.ds-button--primary is for the single most important action in a view.
.ds-button--quiet is for secondary icon or utility actions.
.ds-panel is the base elevated surface.
.ds-pill is for compact status or level metadata.
.ds-progress communicates completion with the rose-to-gold gradient.
.ds-callout is for contextual tutorial or notice copy.
.ds-stat is for a compact numeric value paired with an uppercase label.
Motion
Use short, purposeful transitions: 150–200ms for controls and movement, 300–450ms for entrance or visibility changes. Keep motion optional with prefers-reduced-motion and never use animation as the only way to reveal important information.

