# 0003: Show the Tags tray as an anchored modal dialog

Status: accepted

## Context

The Tags button next to the landing page's search opens a tray, where the user
finds and manages tags (#56) and later picks tags for the filter (#58). The tray
should look like a sheet below the button with the page still in view. #54
requires every control to work with the keyboard alone and to have a name a
screen reader announces.

The quick switcher is already a native modal `<dialog>`. It dims and blocks the
editor behind it, so the same styling would hide the cards the tray relates to.
A modal dialog is only as large as its CSS makes it, though, and only its
`::backdrop` covers the page.

## Decision

- The tray is a native `<dialog>` opened with `showModal()`, as tall as its content,
  with a transparent `::backdrop`. The page stays visible and inert behind it, and
  it can't scroll while the tray is open, because the tray would scroll away with
  the button.
- The browser moves the focus into the dialog, keeps Tab inside it, keeps screen
  readers inside it and returns the focus to the Tags button when it closes.
- CSS anchor positioning places the dialog below the button, because a dialog in
  the top layer can't be positioned relative to the button's parent. A browser
  without it shows the dialog in the middle of the window, a modal dialog's default.
- `keydown` handles Escape, so one press can undo one layer, such as clearing the
  find text, before another press closes the tray. A press on the backdrop closes
  the tray, and the press goes no further.

The cost: a click on a card while the tray is open only closes the tray, so opening
that card takes a second click.

## Alternatives

- **The `popover` attribute.** Opens from a button without JavaScript, closes on
  Escape or an outside click, and lets that click reach what it hit, so one click
  on a card closes the tray and opens the card. It doesn't keep Tab or a screen
  reader inside: Tab moves on to the cards behind the open tray unless code closes
  it when the focus leaves. It also needs `role="dialog"` and the same anchoring.
  The extra click matters less than the keyboard and screen reader behaviour,
  because the user usually finishes in the tray before moving on.
- **A non-modal `<dialog>` with `show()`.** Keeps the page usable, but gives the
  same focus gaps as `popover` and adds neither Escape nor outside-click handling.
- **A positioned `<div role="dialog">`,** as in the proof of concept. Needs no
  anchoring, but all of the closing and focus handling becomes our code.
