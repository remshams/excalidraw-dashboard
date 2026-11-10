import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TagMark } from "./TagMark.tsx";

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
});
