ull design system reference, including all HEX codes and the corresponding functional Tailwind classes we have used.

### STEP 160 - Final Design System Document: `DESIGN_SYSTEM.md`

**GUIDANCE:** This document serves as the single source of truth for all brand and design decisions, providing the HEX codes, functional intent, and the exact Tailwind classes for future developers.

**FILE PATH:** `./DESIGN_SYSTEM.md` (Create this file in the root directory)

```markdown
# SentinelFi: Definitive Design System & Style Guide

This document defines the visual architecture, color palette, and core utility classes used throughout the SentinelFi application, strictly adhering to the High-Fidelity Dark Mode specification.

## 1. Brand Identity & Theme

| Attribute | Specification | Detail |
| :--- | :--- | :--- |
| **Project Name** | SentinelFi | |
| **Tagline** | Real-Time Control. Proactive Precision. | |
| **Primary Theme** | Dark Mode (High-Contrast) | Optimized for data density and long-duration screen time. |
| **Logo Concept** | Vigilant Eye + Target Shield | Fusion of security, oversight, and precision. |
| **Typography** | Sans-Serif | Clean, modern, high-readability font (e.g., Inter/default sans-serif). |

## 2. Core Color Palette & Functional Mapping

The colors are not merely aesthetic; they are **functional** and mapped directly to business status.

| Functional Role | Color Name | HEX Code | Tailwind Class | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Brand** | Deep Vibrant Teal | `#0D9488` | `bg-brand-primary` | Main WBS Success Metrics, Primary Navigation Focus. |
| **Secondary Brand** | Rich Purple | `#6B46C1` | `bg-brand-secondary` | Secondary Actions, Supporting Data, Non-Critical Highlighting. |
| **Alert/Critical** | Electric Orange | `#EA580C` | `bg-alert-critical` | **Negative Variance**, **Major Overrun Alerts**, Primary Write Button (Log Expense). |
| **Alert/Positive** | Saturated Green | `#059669` | `bg-alert-positive` | **Positive Variance**, Successful Status (e.g., Active User). |
| **Base Background** | Dark Navy | `#1E293B` | `bg-brand-dark` | Global background, Primary Nav. |
| **Card/Panel Base** | Dark Gray | `#1F2937` (Approx. 800) | `bg-gray-800` | Main content panels, Forms, Data Cards. |

## 3. WBS Category Functional Palette

These colors are exclusively used for WBS Level 1 segmentation in charts and the hierarchy tree, maximizing visual differentiation.

| WBS Level | Color Name | HEX Code | Tailwind Usage Example |
| :--- | :--- | :--- | :--- |
| **1.0** | WBS Green | `#059669` | `text-wbs-green` |
| **2.0** | WBS Blue | `#2563EB` | `text-wbs-blue` |
| **3.0** | WBS Yellow | `#FBBF24` | `text-wbs-yellow` |
| **4.0** | WBS Magenta | `#DB2777` | `text-wbs-magenta` |
| **5.0** | WBS Cyan | `#06B6D4` | `text-wbs-cyan` |
| **6.0** | WBS Red | `#DC2626` | `text-wbs-red` |
| **7.0** | WBS Violet | `#7C3AED` | `text-wbs-violet` |
| **8.0** | WBS Orange | `#EA580C` | `text-wbs-orange` |

## 4. CSS / Tailwind Component Template Guidelines

| Component | Standard Utility Classes / Rationale |
| :--- | :--- |
| **Card Component** | `bg-gray-800 p-6 rounded-xl shadow-2xl border-t-4 border-color` | High elevation and clear boundary for metrics and forms. |
| **Input Fields** | `bg-brand-dark/50 border border-gray-700 rounded-lg text-white p-2` | Low-distraction input that provides strong contrast against the card background. |
| **Main Layout** | `min-h-screen bg-brand-dark transition-all duration-300` | Smooth, full-screen coverage with enabled animations. |
| **Sidebar** | `w-64` (Open) / `w-20` (Closed) | Fixed, collapsible navigation for professional dashboard UX. |
| **Text/Labels** | `text-sm font-medium text-gray-400` | Labels are subdued to allow data (`text-white/bold`) to stand out. |
```

NEXT ACTION: Save this file as `./DESIGN_SYSTEM.md`. All documentation is now complete.

---