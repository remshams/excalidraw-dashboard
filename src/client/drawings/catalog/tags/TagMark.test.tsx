import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TagMark } from "./TagMark.tsx";
import styles from "./TagMark.module.css";

describe("TagMark", () => {
	it("inks a tag in its fill colour, which paper-coloured words read on", () => {
		const { container } = render(
			<TagMark label="Ideas" color="yellow" seed="1" inked />,
		);

		const mark = container.firstElementChild as HTMLElement;
		expect(mark.style.getPropertyValue("--mark-fill")).toBe(
			"var(--tag-yellow-fill)",
		);
	});

	// jsdom lays out no CSS, so the size and the ink show as the module's classes.
	it("draws the size it is given and no ink unless asked", () => {
		const { container } = render(
			<TagMark label="Ideas" color="yellow" seed="1" size="medium" />,
		);

		const mark = container.firstElementChild as HTMLElement;
		expect(mark).toHaveClass(styles.mark, styles.medium);
		expect(mark).not.toHaveClass(styles.small, styles.inked);
	});

	it("draws the full-size mark without a size", () => {
		const { container } = render(
			<TagMark label="Ideas" color="yellow" seed="1" />,
		);

		expect(container.firstElementChild).toHaveClass(styles.mark, {
			exact: true,
		});
	});
});
