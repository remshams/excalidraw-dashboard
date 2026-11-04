/**
 * Only checks that the CSS modules use the design tokens from
 * src/client/styles.css for colors, type, stroke widths and corner radii.
 * Biome lints and formats CSS otherwise. Spacing isn't checked: layout needs
 * one-off values. Neither is the font shorthand: the plugin can't expand it
 * and would flag font families and keywords. It expands text-decoration only
 * partly, so whether a raw color there fails depends on word order. Use the
 * longhands font-size, font-weight, line-height and text-decoration-color.
 */
export default {
	// The tokens are defined there.
	ignoreFiles: ["src/client/styles.css"],
	plugins: ["stylelint-declaration-strict-value"],
	rules: {
		"scale-unlimited/declaration-strict-value": [
			[
				"/^(color|background-color|fill|stroke|caret-color|accent-color)$/",
				"/^text-decoration-color$/",
				"/^column-rule-(color|width)$/",
				// Physical and logical sides, such as border-top-color and
				// border-inline-start-width.
				"/^(border|outline)(-(top|right|bottom|left|inline|block)(-(start|end))?)?-(color|width)$/",
				"/^(border|outline)-(inline|block)(-(start|end))?$/",
				"/^border(-[a-z]+)*-radius$/",
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
					// Border styles, in shorthands the plugin doesn't expand, such as
					// border-inline.
					"/^(hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/",
				],
				disableFix: true,
			},
		],
	},
};
