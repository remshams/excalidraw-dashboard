/**
 * Only checks that the CSS modules use the design tokens from
 * src/client/styles.css for colors, type, stroke widths and corner radii.
 * Biome lints and formats CSS otherwise. Spacing isn't checked: layout needs
 * one-off values.
 */
export default {
	// The tokens are defined there.
	ignoreFiles: ["src/client/styles.css"],
	plugins: ["stylelint-declaration-strict-value"],
	rules: {
		"scale-unlimited/declaration-strict-value": [
			[
				"/^(color|background-color|fill|stroke|caret-color|accent-color)$/",
				"/^(text-decoration|column-rule)-color$/",
				// Physical and logical sides, such as border-top-color and
				// border-inline-start-width.
				"/^(border|outline)(-[a-z]+)*-(color|width)$/",
				"/^(border|outline)-(inline|block)(-(start|end))?$/",
				"/^border(-[a-z]+)*-radius$/",
				"font",
				"font-size",
				"line-height",
				"font-weight",
			],
			{
				expandShorthand: true,
				ignoreValues: [
					"0",
					"none",
					"inherit",
					"transparent",
					// CSS keywords ignore case; the spec spells it currentcolor.
					"/^currentcolor$/i",
					// Parts of shorthands the plugin doesn't expand, such as border-inline
					// and font.
					"solid",
					"dashed",
					"dotted",
					"/",
				],
				disableFix: true,
			},
		],
	},
};
