---
version: alpha
colors:
  background: "#F1F5F9"
  surface: "#FFFFFF"
  surfaceMuted: "#E8EEF5"
  foreground: "#122033"
  foregroundMuted: "#667085"
  primary: "#0B6F86"
  primaryStrong: "#075A6E"
  primarySoft: "#E4F4F7"
  secondary: "#1F3A5F"
  secondaryStrong: "#132A46"
  secondarySoft: "#E9EFF6"
  accent: "#D98A17"
  accentSoft: "#FFF4E2"
  sky: "#3C7DA6"
  skySoft: "#EAF4FB"
  border: "#D3DCE6"
  success: "#15803D"
  danger: "#B83A35"
typography:
  heading:
    fontFamily: '"Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif'
  body:
    fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif'
  data:
    fontFamily: '"Cascadia Mono", "SFMono-Regular", Consolas, monospace'
rounded:
  small: "0.5rem"
  medium: "0.875rem"
  large: "1.125rem"
  pill: "9999px"
spacing:
  xs: "0.375rem"
  sm: "0.625rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.25rem"
  xxl: "3.25rem"
components:
  sidebar:
    description: "Deep navy persistent desktop sidebar; same navigation becomes an off-canvas side drawer on mobile."
  teacherClassCard:
    description: "Large teacher-first class module with a restrained Form accent, strong class name, and dedicated Open class footer."
  roster:
    description: "Readable stacked student rows with initials, Student ID and optional masked IC; never a squeezed phone table."
  attendance:
    description: "Progress-first attendance surface with clear Present/Absent controls and persistent semantic status colors."
  actions:
    description: "Minimum 44px touch targets; primary actions use teal-blue, destructive actions use red only at the point of consequence."
---

## Overview

**Campus Signal 1.2** is the shared visual identity for the School Attendance product family. It must be reused by the future NFC desktop/PC application so the web attendance system and NFC reader application look like parts of the same product.

The interface should feel like modern school-operations software: confident, calm and practical. It is not a marketing site, ecommerce product, or generic SaaS dashboard. The strongest visual expression belongs to teacher class and attendance workflows because those are the most frequently used screens.

The signature element is the combination of a deep navy institutional shell, teal-blue action language, cool light surfaces, and restrained Form/status accents.

## Colors

- **Deep navy (`#1F3A5F`, strong `#132A46`)**: navigation, institutional framing, desktop-app chrome.
- **Teal-blue (`#0B6F86`, strong `#075A6E`)**: primary actions, active attendance controls, key focus states.
- **Cool background (`#F1F5F9`)**: application canvas.
- **White (`#FFFFFF`)**: primary working surfaces.
- **Sky (`#3C7DA6`)**: restrained secondary accent.
- **Amber (`#D98A17`)**: pending attention and warning states only.
- **Green (`#15803D`)**: Present/success.
- **Red (`#B83A35`)**: Absent/errors/destructive actions.

Do not introduce extra decorative brand colors unless a future requirement justifies them. Status meaning must remain consistent across web and NFC applications.

## Typography

Use Segoe UI Variable on Windows-first surfaces, with Segoe UI/system fallbacks. Headings are bold and compact; body copy stays neutral and readable. Student IDs and machine-oriented values may use Cascadia Mono/monospace.

The future NFC PC application should use the same font roles where the desktop framework supports them.

## Layout

Desktop web uses a 272px left sidebar. Mobile keeps the same sidebar information architecture as an off-canvas drawer; no bottom navigation is introduced while a dedicated mobile application remains under consideration.

Teacher class cards are intentionally larger than normal admin cards. They use one column on phones and normally two columns on laptop/desktop widths so the teacher-facing interface never feels small or secondary.

Class roster and attendance screens prioritize large touch targets, clear status visibility, and readable vertical rhythm at narrow widths.

## Elevation & Depth

Use subtle borders and three elevation levels:

- small: ordinary cards/rows;
- medium: teacher class modules, class focus panels, login form;
- large: dialogs/drawers only.

Avoid excessive floating cards or decorative shadows.

## Shapes

Controls and cards use approximately 14–18px corner radii. Pills are reserved for statuses, Form labels and compact metadata. Buttons remain rounded rectangles rather than pills.

## Components

### Teacher class cards

Large cards with a 5px Form accent line, a tinted icon tile, a strong class name and a bottom action divider. Form accents may use only the approved teal, sky, navy, amber and slate family.

### Attendance

Present is green and Absent is red. Do not communicate status by color alone; labels/icons remain visible. Attendance progress uses teal-blue.

### Navigation

The sidebar uses the deep navy gradient family and a teal active indicator. The same visual language should be used for a future NFC desktop application's navigation or title rail.

### Forms and dialogs

Forms use white surfaces, clear labels, 44px minimum controls and teal focus rings. Destructive confirmation remains app-owned. Undo notifications use deep navy.

## Do's and Don'ts

Do keep teacher-facing screens visually stronger than admin maintenance screens, use restrained accents, preserve mobile touch comfort, and keep copy short.

Do reuse these tokens and status meanings in the future NFC PC application.

Do not add global student search, bottom navigation, rainbow Form colors, promotional hero sections inside authenticated workflows, browser alert/confirm dialogs, or ecommerce-style decorative components.
