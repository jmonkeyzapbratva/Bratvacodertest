# BRATVACODER - Design Guidelines

## Design Approach

**Selected System**: Linear Design + GitHub/VSCode principles
**Rationale**: Developer productivity tool requiring clarity, focus, and efficient code interaction. Clean, minimal aesthetic that doesn't distract from the primary task of code generation.

## Core Design Principles

1. **Function-First**: Every element serves a clear purpose
2. **Code-Centric**: Code display is the hero, UI supports it
3. **Portuguese-Native**: All text, labels, and messages in Brazilian Portuguese
4. **Progressive Disclosure**: Show complexity only when needed

---

## Typography System

**Font Stack**: 
- Interface: Inter (via Google Fonts) - weights 400, 500, 600
- Code: JetBrains Mono (via Google Fonts) - weights 400, 500

**Type Scale**:
- Hero/Display: text-4xl (2.25rem), font-semibold
- Page Headers: text-2xl (1.5rem), font-semibold  
- Section Headers: text-xl (1.25rem), font-medium
- Body: text-base (1rem), font-normal
- Small/Meta: text-sm (0.875rem), font-normal
- Code: font-mono text-sm

**Hierarchy Rules**:
- Page titles use text-2xl with mb-6
- Section headers use text-xl with mb-4
- Body text maintains text-base with comfortable line-height (leading-relaxed)
- Code blocks always use monospace with syntax highlighting

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16
- Tight spacing: p-2, gap-2 (related elements)
- Standard spacing: p-4, gap-4 (most components)
- Section spacing: p-6, p-8 (major sections)
- Page margins: p-8, p-12 (outer containers)

**Grid Structure**:
- Main layout: Sidebar (280px fixed) + Main content (flex-1)
- Chat interface: Single column, max-w-4xl centered
- Project dashboard: Grid layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Forms: Single column, max-w-2xl

**Container Constraints**:
- Chat messages: max-w-4xl
- Code preview: max-w-6xl  
- Settings forms: max-w-2xl
- Full-width dashboards: w-full with p-8

---

## Component Library

### Navigation

**Sidebar Navigation**:
- Fixed left sidebar: w-70 (280px)
- Logo at top with p-6
- Nav items: p-3 with rounded-lg hover states
- Active state: subtle background change
- Icons from Heroicons (outline for inactive, solid for active)
- Collapse button at bottom for mobile

**Top Bar** (if sidebar hidden on mobile):
- Sticky header with backdrop-blur
- Logo left, user menu right
- h-16 fixed height

### Chat Interface

**Message Layout**:
- User messages: Aligned right, max-w-2xl
- AI responses: Aligned left, max-w-2xl  
- Avatar indicators (User: initials, AI: robot icon)
- Timestamp: text-sm, subtle positioning
- Message bubbles: p-4, rounded-2xl

**Input Area**:
- Fixed bottom (sticky)
- Textarea with min-h-20, max-h-60 (auto-expand)
- Send button: Icon button, disabled state when empty
- Template suggestions: Horizontal scroll chips above input

### Code Display

**Code Preview Panel**:
- Full-width container with rounded-lg border
- Header: Language badge, file name, copy button
- Code block: p-6, syntax highlighting via library (Prism/Highlight.js)
- Line numbers: Optional toggle
- Background: Subtle code-appropriate shade

**Code Editor** (if editable):
- Monaco Editor or CodeMirror integration
- Min height: h-96
- Toolbar: Save, Download, Copy buttons

### Project Cards

**Grid Layout**: 
- Cards in responsive grid (1/2/3 columns)
- Each card: p-6, rounded-xl, border, hover:shadow-lg transition

**Card Content**:
- Project name: text-lg font-semibold, mb-2
- Description: text-sm, line-clamp-2, mb-4
- Meta info: Flex row with date, template type (text-xs)
- Actions: Icon buttons (Edit, Download, Delete) in flex row

### Forms & Inputs

**Input Fields**:
- Label: text-sm font-medium, mb-2
- Input: h-10, px-3, rounded-lg, border
- Focus: ring-2 with offset
- Error state: border-red with text-sm error message below

**Buttons**:
- Primary: px-6 py-2.5, rounded-lg, font-medium
- Secondary: Same size, outlined variant
- Icon buttons: p-2, rounded-lg
- States: hover (slight opacity change), active (scale-98), disabled (opacity-50)

**Template Selection**:
- Card-based selector in grid-cols-2 md:grid-cols-3
- Each template: p-4, icon + title + description
- Selected state: border emphasis, subtle background
- Hover: lift effect (shadow)

### Dashboard Components

**Stats Cards** (Project count, generations, etc.):
- Horizontal cards with icon + number + label
- h-24, p-6, flex items-center
- Icon: Large size (h-10 w-10) on left
- Stats: text-2xl font-bold, label text-sm below

**Recent Activity List**:
- List items: p-4, border-b last:border-0
- Icon + activity text + timestamp
- Hover: subtle background

**Setup Wizard**:
- Stepper at top showing progress (1/2/3)
- Single form section visible at a time
- Previous/Next buttons at bottom
- Success states: Checkmarks with green indicators
- Validation feedback: Inline below inputs

---

## Animations

**Minimal Motion Philosophy**:
- Page transitions: Simple fade (150ms)
- Button states: Scale and opacity only
- Card hovers: Shadow lift (200ms ease)
- Chat messages: Slide-in-from-bottom (300ms)
- NO complex animations, loading spinners, or distracting effects

**Loading States**:
- Skeleton screens for content loading
- Simple spinner for AI generation
- Progress indicator for code generation

---

## Responsive Behavior

**Breakpoints**:
- Mobile: Single column, bottom navigation
- Tablet (md:): 2-column layouts, sidebar collapses to icon-only
- Desktop (lg:): Full sidebar, 3-column grids

**Mobile-Specific**:
- Chat input: Sticky bottom with safe-area padding
- Sidebar: Slide-over drawer
- Code preview: Horizontal scroll if needed
- Navigation: Bottom tab bar (4-5 items max)

---

## Accessibility

- All interactive elements: min-h-10 (touch target size)
- Keyboard navigation: Focus rings visible and clear
- Labels: Always present for inputs (can be visually hidden if designed so)
- Color contrast: Meets WCAG AA standards
- Error messages: Associated with inputs via aria-describedby

---

## Special Considerations

**Portuguese Language UX**:
- All CTAs, labels, placeholders in PT-BR
- Error messages: Friendly, conversational Portuguese
- Empty states: Helpful Portuguese messages with emoji
- Examples: Use Brazilian context (e.g., "Bot para WhatsApp", not "WhatsApp bot")

**Developer-Focused Details**:
- Monospace fonts for ALL code
- Syntax highlighting always enabled
- File extensions visible
- Line breaks preserved in code display
- Copy buttons prominent and accessible

**PWA Requirements**:
- App-like header (no browser chrome feel)
- Install prompt: Subtle banner, dismissible
- Offline state: Clear messaging when disconnected
- Splash screen: Logo + loading indicator

---

## Images

**Logo Placement**:
- Sidebar top: h-8, Brazilian tech aesthetic
- Login page: h-16, centered above form

**Empty States**:
- Illustrations for "No projects yet", "No chat history"
- Simple, line-art style illustrations
- Centered in empty containers

**NO Hero Images**: This is a productivity tool, not a marketing site. Hero sections use bold typography and clear CTAs, not imagery.