# FDL-Create Design Reference
## Extracted from "Refactoring UI" & "Designing User Interfaces"

A comprehensive guide to design principles for the visual schema builder and CMS interface, extracted from two authoritative design books and contextualized for FDL-Create's specific needs.

---

## 1. Design Process & Approach

### Start with Features, Not Layout (Refactoring UI)
**Principle:** When designing new pages or workflows, begin with actual functionality, not the shell (navigation, sidebar, containers).

**Why:** An app is a collection of features. Without designing features first, you lack the information needed to make good architectural decisions about navigation, layout, or page structure.

**Apply to FDL-Create:**
- When building the schema designer, start with a specific task like "create a text field" or "set field validation"
- Don't design the sidebar navigation or page layout until you've prototyped the core design feature
- Each workflow (building collections, editing records, configuring themes) should be designed as a complete task before worrying about its place in the overall app
- The canvas-first approach aligns with this: design the editing experience before the surrounding UI

### Detail Comes Later (Refactoring UI)
**Principle:** In early design stages, don't obsess over typefaces, shadows, icons, colors, or micro-interactions. Focus on information hierarchy and function first.

**Why:** Low-level styling details are a distraction during foundational design work. They matter, but not when you're still exploring core interactions.

**Apply to FDL-Create:**
- Start schema/form builders with wireframe-level fidelity (boxes, basic labels)
- Add polish (shadows, gradients, micro-interactions) after core interactions are solid
- Use the "thick Sharpie" test: if you can't design it with a sharpie, you're overcomplicating it
- Separate "structure" (information architecture) from "style" (Tailwind utilities) in development

### Don't Design Too Much (Refactoring UI)
**Principle:** Avoid designing edge cases and unnecessary variations. Design the happy path first; complexity emerges naturally.

**Why:** Over-designing leads to decision fatigue and bloated interfaces. Focus on the 80% case, then handle edge cases in code.

**Apply to FDL-Create:**
- Design for a standard text field first, not 10 field types at once
- Build one complete collection (schema → records → theme) before designing all variants
- Let patterns emerge: after 3-4 similar components, abstract them
- Avoid "what if" screens—design real, testable workflows only

### Design System Consistency (Designing User Interfaces)
**Principle:** A design system creates consistency across the interface and speeds up development. Start small and grow as patterns emerge.

**Why:** Consistency reduces cognitive load for users and developers. A system prevents one-offs and drift over time.

**Apply to FDL-Create:**
- FDL-Create's "Lattice default" theme preset is the foundation—every component must align with it
- Document spacing, typography, and color rules once, reference them everywhere
- Use Tailwind's built-in scales (spacing, sizing) rather than arbitrary values
- Create a components library (buttons, cards, modals) early—reuse obsessively

---

## 2. Hierarchy & Information Architecture

### Size Isn't Everything (Refactoring UI)
**Principle:** Don't rely solely on size to create emphasis. Use color, weight, and proximity to establish hierarchy.

**Why:** A large but wrong-color element can feel less important than a small, saturated one. Hierarchy is about relationships, not absolute size.

**Apply to FDL-Create:**
- Active form fields should stand out via color/border, not just size
- Important actions (Save, Publish) should use accent color (sky blue) + weight, not just large text
- De-emphasize secondary actions with lighter color or smaller weight, not grey text
- Field labels should be clear without being oversized—use weight and color relationships

### Don't Use Grey Text on Colored Backgrounds (Refactoring UI)
**Principle:** On colored backgrounds, reduce contrast by shifting text color toward the background. Grey text on colors looks dull.

**Why:** Reducing opacity on white text looks washed out. Instead, tint the text toward the background color for clearer, less disabled-looking hierarchy.

**Apply to FDL-Create:**
- Form placeholder text on colored section backgrounds: use a tinted color (not grey)
- Secondary labels on theme-colored panels: use a muted, tinted variant of the theme color
- Ensure all text meets WCAG contrast minimums before applying subtlety
- Example: for a sky-blue section, secondary text should shift toward sky blue, not to neutral grey

### Visual Hierarchy in Forms (Designing User Interfaces)
**Principle:** Establish clear relationships between labels, inputs, errors, and help text through size, color, and spacing.

**Why:** Forms are dense with information. Poor hierarchy causes user confusion and slower data entry.

**Apply to FDL-Create:**
- **Label** (bold, dark): "Email Address"
- **Input**: standard text field, sky-blue focus state
- **Help text** (smaller, muted): "We'll use this for login and notifications"
- **Error** (red, bold): "Email is required"
- Space between label and input: ~8px; between input and help: ~4px

---

## 3. Layout & Spacing

### Start with Too Much White Space (Refactoring UI)
**Principle:** Begin with excessive padding and margins, then remove until it looks right. Don't add space incrementally.

**Why:** Incrementally adding space usually results in the minimum viable distance—cramped but acceptable. More space almost always looks better.

**Apply to FDL-Create:**
- Start form field spacing at 24px between groups, reduce if cramped
- Canvas padding: start at 48px, reduce only if screen is tiny
- Cards and panels: 20px internal padding is a good starting point for schema/record views
- Sidebar panels: 16px padding is tighter for density, but 20px feels more premium
- Use FDL-Create's spacing scale: 4, 8, 12, 16, 20, 24, 32, 48 (Tailwind: space-1 to space-12)

### Establish a Spacing and Sizing System (Refactoring UI)
**Principle:** Define a consistent spacing scale (e.g., 4px increments) and stick to it everywhere.

**Why:** A coherent scale creates visual rhythm and makes responsive design easier. Random spacing looks amateurish.

**Apply to FDL-Create:**
- **Base unit:** 4px (Tailwind `space-1`)
- **Common spacings:** 8px (2), 16px (4), 24px (6), 32px (8), 48px (12)
- Use only multiples of 4px in margins, padding, gaps
- Exception: focus rings and borders can be 2px (Tailwind default)
- Document the scale in the Lattice theme preset file; enforce via Tailwind config

### You Don't Have to Fill the Whole Screen (Refactoring UI)
**Principle:** Constrain content width; don't stretch elements edge-to-edge. Narrow layouts are easier to scan.

**Why:** Long lines of text are hard to read. Wide layouts waste horizontal space and force eye movement.

**Apply to FDL-Create:**
- Schema editor canvas: max-width 960px, centered in viewport
- Record form: max-width 700px (narrower than schema, less overwhelming)
- Page list view: 2-column grid on desktop, 1 column on tablet (responsive breakpoints: 768px, 1024px)
- Sidebar: fixed width (320px), always present on desktop; hide on mobile
- Full-width only for data tables (Records list), and add sticky headers/columns

### Grids Are Overrated (Refactoring UI)
**Principle:** Don't force a strict grid on every layout. Use flexbox and natural spacing when it makes sense.

**Why:** Strict grids create awkward gaps and artificial constraints. Flow-based layouts are more natural.

**Apply to FDL-Create:**
- Form fields: vertical stack (flex column), no grid forcing
- Collections list: natural card grid (auto-fit columns), not a strict 12-column grid
- Sidebar sections: flex column, spacing defined by spacing scale
- Exception: data table cells require alignment, so a grid is appropriate there

---

## 4. Typography

### Establish a Type Scale (Refactoring UI & Designing User Interfaces)
**Principle:** Define 4-6 font sizes for headings, body, and captions. Use them everywhere consistently.

**Why:** A coherent scale looks professional. Random font sizes look chaotic.

**Apply to FDL-Create:**
- **Font family:** Inter only (no serif, no custom fonts)
- **Base font size:** 16px (body text, form inputs)
- **Scale (1.125x multiplier):**
  - H1 (page titles): 32px, bold (700)
  - H2 (section headers): 24px, semibold (600)
  - H3 (subsection): 20px, semibold (600)
  - Base body: 16px, regular (400)
  - Small text (labels, captions): 14px, regular (400)
  - Tiny text (help, meta): 12px, regular (400), muted color
- Use Tailwind classes: `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`
- Don't deviate; every heading should be one of these sizes

### Relative Sizing Doesn't Scale (Refactoring UI)
**Principle:** Don't use relative units (em, %) for responsive font sizes across breakpoints. Adjust explicitly per breakpoint.

**Why:** A 2.5em headline on desktop becomes too large on mobile. Scaling rules don't transfer proportionally.

**Apply to FDL-Create:**
- Desktop H1: 32px | Mobile H1: 24px (not a proportional reduction)
- Desktop body: 16px | Mobile body: 16px (no change—readable on any screen)
- Use Tailwind's responsive prefixes: `text-2xl md:text-3xl`, not `text-[32px] md:text-[2.5em]`
- Test all type sizes on mobile (≤480px), tablet (768px), and desktop (1024px+)

### Line Height Is Proportional (Refactoring UI)
**Principle:** Line height (letter-spacing vertically) depends on line length. Longer lines need more line-height.

**Why:** When lines are long, the reader's eye loses the next line. Extra spacing helps them find it again.

**Apply to FDL-Create:**
- **Short text (labels, buttons):** line-height 1.2 (Tailwind `leading-snug`)
- **Body copy / form help text (40-60 chars/line):** line-height 1.5 (Tailwind `leading-normal`)
- **Long content (>80 chars/line, if any):** line-height 1.75 (Tailwind `leading-relaxed`)
- Default form labels: `leading-snug`; form help text: `leading-normal`

### Font Weight Strategy (Refactoring UI & Designing User Interfaces)
**Principle:** Use weight to create hierarchy, not size alone. Bold for emphasis; regular for secondary.

**Why:** Weight changes are subtle but effective. Overusing large text creates noise.

**Apply to FDL-Create:**
- **Headings:** 600 (semibold) or 700 (bold)
- **Body and labels:** 400 (regular)
- **De-emphasized text (placeholders, help):** 400, color-muted (not lighter weight)
- **Interactive hints (hints on hover):** 400, slightly smaller, muted color
- Don't use 300 (light)—harder to read at small sizes

### Semantic Spacing in Typography (Designing User Interfaces)
**Principle:** Use spacing between paragraphs, around headings, and within lists to organize information.

**Why:** Walls of text are overwhelming. Spacing makes content scannable.

**Apply to FDL-Create:**
- Paragraph spacing: 16px bottom margin
- Heading spacing: 24px top, 12px bottom (more space before, less after)
- List items: 8px gap between items
- Fieldset (group of form fields): 24px gap, with a separator line or background color
- Use Tailwind spacing utilities consistently; document in theme preset

---

## 5. Color & Contrast

### Choose a Personality (Refactoring UI)
**Principle:** Define a cohesive color palette. Every color should feel intentional, not random.

**Why:** Random colors feel amateurish. A tight palette creates a distinct, professional visual identity.

**Apply to FDL-Create:**
- **Lattice default preset:**
  - **Neutrals:** Zinc (Tailwind, not custom)
  - **Accent:** Sky blue (Tailwind `sky`)
  - **Semantic:** Red (error), green (success), yellow (warning), blue (info)
- **No custom colors** outside Tailwind's default palette (except brand if needed)
- Every color should be used for a semantic purpose: action, success, error, neutral, etc.
- Avoid browns, oranges, purples unless they serve a specific brand need
- Theme editor should only allow users to adjust hue/saturation within the same color family

### Limit Your Choices (Refactoring UI)
**Principle:** Restrict the palette to 5-8 colors max. Fewer colors = more cohesion.

**Why:** Each color dilutes the visual hierarchy. Restraint forces intentional decisions.

**Apply to FDL-Create:**
- **FDL-Create base:**
  1. Neutral background (zinc-50, white)
  2. Neutral foreground (zinc-900, black)
  3. Neutral muted (zinc-500, grey)
  4. Accent primary (sky-500, blue)
  5. Accent hover (sky-600, darker blue)
  6. Semantic error (red-500)
  7. Semantic success (green-500)
  8. Semantic warning (yellow-500)
- **In the theme editor:** users can customize accent color, but limit to Tailwind swatches
- Don't add colors without a use case; avoid "nice to have" shades

### Don't Use Grey Text on Colored Backgrounds (see Hierarchy section)

### Contrast and Accessibility (Designing User Interfaces)
**Principle:** All text must meet WCAG AA standards (4.5:1 for normal text, 3:1 for large).

**Why:** Users with low vision or color blindness depend on contrast. Legal compliance matters.

**Apply to FDL-Create:**
- **Check contrast** for every text/background pair before shipping
- Tool: WebAIM Contrast Checker, Lighthouse, or Storybook's accessibility testing
- Primary text on white: #1f2937 (zinc-800, not zinc-900—900 is overkill)
- Muted text on white: #6b7280 (zinc-500, at least 4.5:1)
- Error text: must contrast on white AND on light red backgrounds
- Don't rely on color alone (red = error); use icons or text labels too
- Test form focus states: must be visible on light and dark backgrounds

---

## 6. Components: Forms & Inputs

### Form Design Hierarchy (Designing User Interfaces)
**Principle:** Forms have a visual hierarchy: labels > inputs > help text > errors. Each should be distinct.

**Why:** Forms are dense. Clear hierarchy prevents user confusion and reduces input errors.

**Apply to FDL-Create:**
- **Label:** 14px, semibold, zinc-900, 0px bottom margin (labels are tight to inputs)
- **Input:** 16px, regular, sky-500 focus ring (2px), zinc-200 border on blur, sky-100 background on focus
- **Help text:** 12px, regular, zinc-600 (one shade lighter), 4px top margin
- **Error message:** 12px, regular, red-600, 4px top margin, icon (!)
- Placeholder text: zinc-400, italic (optional), disappears on focus
- Focus state: 2px sky-500 outline, 4px inset offset (not 0px—creates breathing room)

### Input States (Designing User Interfaces & Refactoring UI)
**Principle:** Inputs have multiple states. Design each visibly: default, focus, filled, disabled, error.

**Why:** Users need to know what's interactive, what they're editing, and what's broken.

**Apply to FDL-Create:**
- **Default:** zinc-200 border, zinc-50 background, zinc-500 placeholder
- **Focus:** sky-500 outline (2px), sky-50 background, zinc-900 text (caret blue)
- **Filled:** zinc-200 border, white background, zinc-900 text
- **Disabled:** zinc-100 background, zinc-300 border, zinc-400 text, no focus allowed
- **Error:** red-500 border, white background, red-600 text, red-600 error message below
- **Required indicator:** red asterisk (*) next to label, or red dot
- Don't hide error messages—show them near the field, always in red

### Button Styles (Designing User Interfaces & Refactoring UI)
**Principle:** Three button weights for different importance: primary (filled), secondary (outline), tertiary (text).

**Why:** Users scan for primary actions. Visual weight guides them to what matters.

**Apply to FDL-Create:**
- **Primary (Save, Create, Publish):**
  - Background: sky-500, border: sky-500
  - Text: white, bold
  - Hover: sky-600
  - Focus: 2px sky-400 outline
  - Padding: 10px 16px (medium size)
- **Secondary (Cancel, Reset):**
  - Background: white, border: 1px zinc-300
  - Text: zinc-900, semibold
  - Hover: zinc-50 background
  - Focus: 2px sky-500 outline
  - Padding: 10px 16px
- **Tertiary (Delete, Danger):**
  - Background: transparent, border: none
  - Text: zinc-600, regular
  - Hover: zinc-100 background
  - Focus: 2px sky-500 outline
  - Padding: 8px 12px (smaller)
- **Danger variant (Delete Collection):**
  - Primary style but red: red-600 background, hover red-700
  - Show confirmation: "Are you sure?"

### Toggle & Switch Inputs (Designing User Interfaces)
**Principle:** Toggles and switches must be visually distinct and indicate their state clearly.

**Why:** Binary inputs are easy to miss. Clear visual feedback prevents accidental changes.

**Apply to FDL-Create:**
- **Toggle switch:**
  - Off: zinc-300 background, white circle on left, 2px border
  - On: sky-500 background, white circle on right, 2px border
  - Size: 40px wide × 24px tall (comfortable for touch)
  - Accessible label: `<label><input type="checkbox"/> Enable AI Options</label>`
- **Checkbox (multiple choice):**
  - Unchecked: zinc-200 border, white background, 16px × 16px
  - Checked: sky-500 background, white checkmark icon, 16px × 16px
  - Indeterminate (some items selected): sky-300 background, dash icon
- **Radio button (single choice):**
  - Unchecked: zinc-300 border, white background, 16px diameter
  - Checked: sky-500 background, white dot center, 16px diameter
  - Group: vertical stack, 12px gap between items

---

## 7. Components: Cards & Containers

### Card Design (Designing User Interfaces)
**Principle:** Cards organize related content with clear visual boundaries. Use consistent padding, shadows, and spacing.

**Why:** Cards break up dense layouts and create scannable content groups.

**Apply to FDL-Create:**
- **Collection card (list view):**
  - Background: white, border: 1px zinc-200
  - Padding: 16px
  - Radius: `rounded-md` (Tailwind, ~6px)
  - Shadow: none (or subtle `shadow-sm` on hover for hover state)
  - Hover: zinc-50 background, zinc-300 border
  - Gap between cards: 12px
- **Record card (in canvas preview):**
  - Background: white, border: 1px sky-300 (to indicate it's editable)
  - Padding: 20px
  - Radius: `rounded-md`
  - Shadow: `shadow-sm` (subtle depth, light source from top-left)
  - Hover: shadow-md, border sky-500
- **Section header (in forms):**
  - Background: zinc-50, border-bottom: 1px zinc-200
  - Padding: 12px 16px
  - Text: 14px, semibold, zinc-900
  - No radius (full width within panel)

### Panels & Modals (Designing User Interfaces & Refactoring UI)
**Principle:** Modals focus attention. Use them sparingly, and make them dismissible.

**Why:** Modals block the underlying UI. Too many feel intrusive.

**Apply to FDL-Create:**
- **Modal:**
  - Backdrop: black, 40% opacity (blocks interaction with page)
  - Panel: white, centered, max-width 500px (form modals) or 700px (confirmations)
  - Padding: 24px (consistent with card padding rule)
  - Radius: `rounded-lg` (~8px)
  - Shadow: `shadow-lg` (strong depth, lifts above page)
  - Close button: X icon, top-right corner, 32px × 32px hit area
  - Keyboard: ESC closes modal, Tab cycles through focus
- **Confirmation modal:**
  - Title: "Are you sure?"
  - Body: explanation, 14px, zinc-600
  - Actions: Danger button (red, right) + Cancel button (grey, left)
  - Always require confirmation for destructive actions (delete, reset)

---

## 8. Components: Navigation & Structure

### Navigation Hierarchy (Designing User Interfaces)
**Principle:** Navigation should be easy to scan. Use icons + labels for main sections; only icons for secondary.

**Why:** Icons are faster to scan than text, but text is clearer.

**Apply to FDL-Create:**
- **Sidebar (primary navigation):**
  - Logo + text at top (64px height)
  - Main sections: icon (24px) + label, 12px gap, 16px padding, sky-500 when active
  - Hover: zinc-100 background
  - Active: sky-500 text, sky-100 background (subtle)
  - Sections: Collections, Pages, Blocks, Theme, Governance
- **Breadcrumb (secondary navigation):**
  - "Home / Collections / Customers / Edit"
  - Text: 14px, zinc-600, click to navigate
  - Separator: "/" in zinc-300
  - Current page: zinc-900, not clickable
- **Tabs (within a page):**
  - "Overview | Settings | Advanced"
  - Text: 14px, zinc-600
  - Border-bottom: active tab has 2px sky-500 underline
  - Hover: zinc-100 background on inactive tabs

### Layout Structure (Refactoring UI & Designing User Interfaces)
**Principle:** Use a consistent grid structure. Sidebar + main content is easiest to scale.

**Why:** Users learn the layout pattern quickly. Consistency reduces cognitive load.

**Apply to FDL-Create:**
- **Desktop (1024px+):**
  - Sidebar: 320px, fixed, left, full-height, zinc-50 background
  - Main content: flex 1, white background, 24px padding
  - Breadcrumb or title: top, 48px height
  - Canvas/form/list below title: flexible height
- **Tablet (768px - 1023px):**
  - Sidebar: 280px, still visible
  - Main content: 16px padding
  - Font sizes: same as desktop, no shrinking
- **Mobile (≤768px):**
  - Sidebar: hidden by default, hamburger menu toggles
  - Main content: full-width, 16px padding
  - Font sizes: same as desktop
  - Bottom nav (optional): icon-only tabs for primary sections
  - Canvas is full-width, may need horizontal scroll for wide forms

---

## 9. Creating Depth & Visual Effects

### Emulate a Light Source (Refactoring UI)
**Principle:** Shadows and highlights follow a single light direction (usually top-left). This creates consistent depth perception.

**Why:** Inconsistent shadows look broken. A single light source feels natural and cohesive.

**Apply to FDL-Create:**
- **Light source:** top-left (11 o'clock)
- **Raised elements (buttons, cards on hover):**
  - Top/left edge: slightly lighter (if applicable, e.g., for 3D effects)
  - Bottom/right edge: darker shadow
- **Inset elements (inputs, recessed panels):**
  - Top/left edge: darker shadow (light hitting the recess)
  - Bottom/right edge: lighter
- **Tailwind shadows:** use `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`
  - Not multiple shadows in different directions (looks chaotic)

### Use Shadows to Convey Elevation (Refactoring UI)
**Principle:** Shadows indicate depth. Stronger shadows = higher elevation. Use them deliberately.

**Why:** Without shadows, layered elements feel flat and ambiguous.

**Apply to FDL-Create:**
- **Baseline (z-0):** no shadow, zinc-200 border
- **Raised (z-10, e.g., cards, popups):** `shadow-sm` (1px blur, 1px offset)
- **Higher (z-20, e.g., modals, dropdowns):** `shadow-md` (3px blur, 2px offset)
- **Highest (z-30, e.g., tooltips):** `shadow-lg` (6px blur, 4px offset)
- **Modals:** `shadow-lg` + semi-transparent backdrop
- Don't use drop shadows on text—reduces readability

### Shadows Can Have Two Parts (Refactoring UI)
**Principle:** A realistic shadow has two components: a dark "core" close to the element, and a softer ambient shadow farther away.

**Why:** Two-part shadows look more natural and realistic than single, uniform shadows.

**Apply to FDL-Create:**
- If implementing custom shadows (not Tailwind defaults):
  - Ambient (soft): `0 4px 12px rgba(0,0,0,0.08)`
  - Core (dark): `0 1px 2px rgba(0,0,0,0.12)`
  - Combined: apply both as comma-separated box-shadows
- Tailwind `shadow-md` already approximates this; trust it

### Even Flat Designs Can Have Depth (Refactoring UI)
**Principle:** Depth doesn't require gradients or 3D effects. Color, size, and spacing create depth in flat designs.

**Why:** Overusing shadows and gradients looks dated. Subtlety is more modern.

**Apply to FDL-Create:**
- Don't use gradients (FDL-Create rule: solid colors only)
- Depth via:
  - **Size:** larger items feel closer
  - **Color saturation:** more saturated = closer (primary blue vs. muted blue)
  - **Opacity:** more opaque = closer
  - **Position:** slightly offset elements feel layered
  - **Spacing:** tight spacing feels closer; loose spacing feels farther
- Example: selected item has darker border + sky-100 background (closer) vs. unselected (just border)

---

## 10. Color Palette & Semantic Colors

### Primary & Neutral Colors (Designing User Interfaces)
**Principle:** Use a tight neutral palette (backgrounds, text) and a single accent color (actions, focus).

**Why:** Too many colors dilute emphasis. Neutrals + one accent = professional and clear.

**Apply to FDL-Create:**
- **Neutrals (Tailwind Zinc):**
  - Background: white (#ffffff), zinc-50 (#fafafa for secondary panels)
  - Text: zinc-900 (#111827 for primary), zinc-600 (#4b5563 for secondary)
  - Borders: zinc-200 (#e5e7eb for light), zinc-300 (#d1d5db for medium)
  - Disabled: zinc-400 (#9ca3af text), zinc-100 (#f3f4f6 background)
- **Accent (Tailwind Sky):**
  - Primary action: sky-500 (#0ea5e9)
  - Hover: sky-600 (#0284c7)
  - Focus ring: sky-400 (#38bdf8)
  - Background: sky-50 (#f0f9ff for subtle highlights)
  - Link text: sky-600 (underline on hover)

### Semantic Colors (Designing User Interfaces)
**Principle:** Use consistent colors for status: red = error, green = success, yellow = warning, blue = info.

**Why:** Users learn these meanings quickly. Consistency reduces confusion.

**Apply to FDL-Create:**
- **Error (Tailwind Red):**
  - Text: red-600 (#dc2626)
  - Background: red-50 (#fef2f2 for error toast)
  - Border: red-300 (#fca5a5 for error input)
- **Success (Tailwind Green):**
  - Text: green-600 (#16a34a)
  - Background: green-50 (#f0fdf4)
  - Icon: checkmark
- **Warning (Tailwind Yellow):**
  - Text: yellow-700 (#b45309)
  - Background: yellow-50 (#fefce8)
  - Icon: exclamation mark
- **Info (Tailwind Blue):**
  - Text: blue-600 (#2563eb)
  - Background: blue-50 (#eff6ff)
  - Icon: info circle

### Dark Mode Considerations (Designing User Interfaces)
**Principle:** If dark mode is planned, ensure colors have enough saturation and aren't pure greys.

**Why:** Pure whites on pure blacks cause eye strain. Saturated colors are easier on the eyes in dark mode.

**Apply to FDL-Create:**
- For now: light mode only (FDL-Create roadmap can add dark mode later)
- If implementing dark mode:
  - Replace white with zinc-950, zinc-900
  - Replace zinc-50 with zinc-800, zinc-900
  - Reduce opacity of text shadows; they're harsher on dark backgrounds
  - Test accent colors on dark backgrounds (sky-400 instead of sky-500 may be needed)
  - Use theme toggler: `prefers-color-scheme` CSS media query

---

## 11. Design System & Component Library

### Build Incrementally (Refactoring UI & Designing User Interfaces)
**Principle:** Don't design 50 components upfront. Design and build one feature completely, then extract patterns.

**Why:** Premature abstraction leads to over-engineering. Patterns emerge naturally from real usage.

**Apply to FDL-Create:**
- **Phase 1:** Collections list + editor (forms, cards, navigation)
- **Phase 2:** Pages + content binding (canvas, inspector panels)
- **Phase 3:** Theme system (color picker, type scale editor)
- **Phase 4:** Extract all patterns into a shared component library
- **Phase 5:** Blocks + custom components (extends library)
- Document patterns after 3+ uses in the product; don't pre-document

### Design System Tokens (Designing User Interfaces)
**Principle:** Define design tokens (colors, spacing, typography, shadows) in a central source. Use them everywhere.

**Why:** Changes propagate instantly. Consistency is enforced at the framework level.

**Apply to FDL-Create:**
- **Tailwind config** (`tailwind.config.ts`):
  - Extend colors, spacing, fontSize, shadows, borderRadius
  - Use only defined tokens (no arbitrary values like `w-[345px]`)
  - Lock down the scale to prevent drift
- **Example:**
  ```typescript
  extend: {
    colors: {
      sky: {
        50: '#f0f9ff',
        500: '#0ea5e9',
        600: '#0284c7',
      },
    },
    spacing: {
      'xs': '4px',
      'sm': '8px',
      'md': '16px',
      'lg': '24px',
      'xl': '32px',
    },
  }
  ```
- Document in `LATTICE_THEME.md`; version with the design system

### Component API Design (Designing User Interfaces & Refactoring UI)
**Principle:** Every component should have a minimal, intuitive API. Props should map 1:1 to visual states.

**Why:** Developers can use components without reading docs. Fewer props = fewer bugs.

**Apply to FDL-Create:**
- **Button example:**
  ```tsx
  <Button variant="primary" | "secondary" | "danger" size="sm" | "md" disabled={false}>
    Label
  </Button>
  ```
- **Input example:**
  ```tsx
  <Input label="Field Name" placeholder="..." value={} onChange={} error="Required" required />
  ```
- **Card example:**
  ```tsx
  <Card className="...">
    {children}
  </Card>
  ```
- Avoid prop explosions: if you have 10+ props, you've over-engineered it

---

## 12. Data Visualization & Tables

### Table Design (Designing User Interfaces)
**Principle:** Tables are dense. Help users scan with clear headers, spacing, and alignments.

**Why:** Wide tables with cramped cells are hard to read. Proper spacing and alignment speeds up scanning.

**Apply to FDL-Create:**
- **Header:**
  - Background: zinc-50, border-bottom: 1px zinc-200
  - Text: 12px, semibold, zinc-900, ALL-CAPS (optional but helps scanning)
  - Padding: 12px 16px
  - Sticky: header should stick on scroll
- **Cells:**
  - Padding: 12px 16px (consistent with header)
  - Text: 14px, regular, zinc-900
  - Alignment: text left, numbers right
  - Row height: ≥40px (comfortable touch target if clickable)
- **Row hover:**
  - Background: zinc-50
  - Subtle transition (100ms), not jarring
- **Striped rows (optional):**
  - Alternate zinc-50 / white (if table is very wide)
  - Don't overdo it; solid white is cleaner if spacing is good
- **Sticky columns (if needed):**
  - First column (ID/name) stays in view on horizontal scroll
  - Use a subtle shadow to separate

### Sorting & Filtering (Designing User Interfaces)
**Principle:** Make sorting and filtering obvious and reversible.

**Why:** Users expect to reorder data. Reversible actions feel safe.

**Apply to FDL-Create:**
- **Sort indicator:**
  - Column header is clickable
  - Arrow icon: ↑ (ascending), ↓ (descending), (none = unsorted)
  - Current sort column: sky-500 text; others zinc-600
- **Filter (if needed):**
  - Filter icon in header, opens a popover
  - Show active filters as badges above table
  - "Clear filters" link is obvious
  - Filtering doesn't delete data, just hides rows

---

## 13. Micro-Interactions & Animation

### Principle: Animation Should Serve Purpose (Refactoring UI & Designing User Interfaces)
**Principle:** Animate to provide feedback, guide attention, or show relationships. Never animate just to look fancy.

**Why:** Gratuitous animation feels slow and unprofessional. Purposeful animation improves UX.

**Apply to FDL-Create:**
- **Button press:** scale down slightly (98%) on click, 100ms, easing ease-out
  - Gives haptic feedback without real haptics
- **Modal entrance:** fade-in + slight scale-up (98% → 100%), 150ms
  - Draws attention, shows modality
- **Field focus:** border color shifts sky-500, 100ms ease-in-out
  - Subtle, not animated (just state change)
  - Optional: very slight background color shift (white → sky-50), 150ms
- **Hover state:** background color, 150ms ease-in-out (not instant)
  - Smooth transitions feel polished
  - Instant colors look jarring
- **Disabled state:** opacity 50%, no transition (state change, not animation)

### No Permanent Animations (Refactoring UI)
**Principle:** Avoid auto-playing animations (carousels, spinners that don't indicate progress). Users should control motion.

**Why:** Auto-playing animations distract and can trigger motion sickness.

**Apply to FDL-Create:**
- No rotating logo, bouncing icons, or animated GIFs in the UI
- Loading spinners (only) are allowed: 360° rotation, 1s repeat, infinite
- Success animations: checkmark appears, fades out after 2s
- No hover animations on large areas (e.g., don't animate entire cards)

---

## 14. Responsive Design & Mobile

### Mobile-First Thinking (Designing User Interfaces & Refactoring UI)
**Principle:** Design for mobile (480px) first. Then enhance for tablet and desktop.

**Why:** Constraints force clarity. Mobile design principles scale up better than downscaling desktop.

**Apply to FDL-Create:**
- **Breakpoints (Tailwind):**
  - Mobile (default): ≤480px
  - Tablet: 481px - 1023px (md breakpoint: 768px)
  - Desktop: ≥1024px (lg breakpoint: 1024px)
  - No ultra-wide design (>1440px)
- **Font sizes:**
  - Mobile: 16px body (no smaller, or zooming breaks)
  - Tablet/Desktop: same, no shrinking
- **Touch targets:**
  - Mobile: 40px × 40px minimum (comfortable thumb reach)
  - Tablet: 40px × 40px
  - Desktop: 32px × 32px (mouse is precise)
- **Form layout:**
  - Mobile: single column, full-width inputs
  - Tablet: 2-column if space allows
  - Desktop: 2-3 column grid or constrained width

### Responsive Tables & Canvas (Designing User Interfaces)
**Principle:** Wide layouts don't work on mobile. Provide an alternative (stack, cards, or scroll).

**Why:** Horizontal scrolling is clunky. Cards or stacked layouts are more natural.

**Apply to FDL-Create:**
- **Records list on mobile:**
  - Switch from table to card layout (2 column cards, stacked)
  - Key info (ID, name) visible; expand to see full record
  - Or: table with horizontal scroll (sticky first column)
- **Schema editor on mobile:**
  - Full-width canvas (scroll horizontally if needed)
  - Inspector panel stacks below canvas (toggle to show/hide)
  - Toolbar at bottom (easier to reach)
- **Sidebar on mobile:**
  - Hidden by default; hamburger menu toggles
  - Full-height overlay when open
  - Close button or tap backdrop to dismiss

---

## 15. Accessibility & Inclusion

### Keyboard Navigation (Designing User Interfaces & Refactoring UI)
**Principle:** All interactive elements must be keyboard-accessible. Tab order should be logical.

**Why:** Some users can't use a mouse. Keyboard-only navigation is essential.

**Apply to FDL-Create:**
- **Tab order:**
  - Left-to-right, top-to-bottom (same as reading order)
  - Use `tabindex="0"` for custom interactive elements
  - Avoid `tabindex > 0` (breaks natural order)
- **Focus visible:**
  - 2px sky-500 outline on all focusable elements
  - Minimum contrast: 3:1
  - Never remove outline with `outline: none` (instead, style it)
- **Shortcuts:**
  - Escape closes modals, dialogs
  - Enter submits forms
  - Arrow keys navigate lists (optional, but nice)

### Color Contrast (Designing User Interfaces)
**Principle:** Text must meet WCAG AA standards (4.5:1 normal, 3:1 large text).

**Why:** Low-vision and colorblind users depend on contrast. Legal requirement.

**Apply to FDL-Create:**
- Test with tools: WebAIM Contrast Checker, Lighthouse, Storybook Accessibility
- Text combinations to test:
  - Dark text on white: zinc-900 on white ✓
  - Muted text on white: zinc-600 on white ✓
  - Light text on dark: white on zinc-900 ✓
  - Text on colored backgrounds: ensure 4.5:1 against background
  - Error text: red-600 on white, red-50 background ✓
- Error: don't convey error via color alone; use text + icon

### Screen Reader Support (Designing User Interfaces)
**Principle:** Semantic HTML and labels help screen readers. Provide context.

**Why:** Blind and low-vision users rely on screen readers. Proper markup is non-negotiable.

**Apply to FDL-Create:**
- **Form inputs:**
  ```html
  <label htmlFor="email">Email Address</label>
  <input id="email" type="email" aria-describedby="help-email" />
  <div id="help-email">We'll use this for login and notifications</div>
  ```
- **Buttons:**
  - Descriptive text: "Delete Collection" not "Delete"
  - Icon buttons: `aria-label="Close modal"`
- **Lists:**
  - Use `<ul>`, `<ol>`, `<li>` (not divs)
  - Screen reader announces "List of 5 items"
- **Headings:**
  - Use `<h1>`, `<h2>`, etc. (not styled divs)
  - Outline should make sense: h1 → h2 → h3, no jumps
- **Alerts/toasts:**
  - `role="alert"` or `aria-live="polite"`
  - Screen reader announces changes automatically

---

## Summary: FDL-Create Design Playbook

### Before You Design
1. ✅ Read the Lattice default theme preset
2. ✅ Understand the feature (don't design the layout yet)
3. ✅ Sketch with a thick marker (focus on structure, not details)

### During Design
1. ✅ Use the typography scale (no custom sizes)
2. ✅ Use the spacing scale (only multiples of 4px)
3. ✅ Use the color palette (no custom colors)
4. ✅ Design all states: default, hover, focus, disabled, error
5. ✅ Test on mobile (480px), tablet (768px), desktop (1024px)

### After Design
1. ✅ Audit accessibility: contrast, keyboard nav, screen reader
2. ✅ Extract any new patterns and document them
3. ✅ Update Tailwind config if new tokens are needed
4. ✅ Add components to the library
5. ✅ Test real data (long text, large lists, edge cases)

### Anti-Patterns (Avoid These)
- ❌ Custom colors (use Tailwind palette)
- ❌ Arbitrary spacing (use the scale: 4, 8, 12, 16, 20, 24, 32, 48)
- ❌ Shadows without direction (light source: top-left)
- ❌ Animations without purpose (no bouncing icons, auto-playing carousels)
- ❌ Grey text on colored backgrounds (shift toward background color instead)
- ❌ Interactive elements without visible focus states
- ❌ Forms without error messages (always show errors near fields)
- ❌ Tables without proper spacing (minimum 40px row height)
- ❌ Modals without escape key (always allow dismissal)
- ❌ Flat design with no depth cues (use shadows, color, size, spacing)

---

## References
- **Refactoring UI by Adam Wathan & Steve Schoger** — Practical, opinionated design guide
- **Designing User Interfaces by Michał & Diana Malewicz** — Comprehensive design system reference
- **Tailwind CSS Documentation** — Component and utility reference
- **WCAG 2.1 Guidelines** — Accessibility standards
- **FDL-Create CLAUDE.md** — Project rules and architecture

---

**Version:** 1.0  
**Last Updated:** 2026-04-21  
**Maintained By:** Design System Team  
**Next Review:** After first major feature release
