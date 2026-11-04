/**
 * Only checks that the CSS modules use the design tokens from
 * src/client/styles.css for colors, type, stroke widths and corner radii.
 * Biome lints and formats CSS otherwise. Spacing isn't checked: layout needs
 * one-off values. Neither are the font and text-decoration shorthands, whose
 * words include font families and line styles. Use the longhands font-size,
 * font-weight, line-height and text-decoration-color.
 */
export default {
	// The tokens are defined there.
	ignoreFiles: ["src/client/styles.css"],
	plugins: ["stylelint-declaration-strict-value"],
	rules: {
		"scale-unlimited/declaration-strict-value": [
			[
				"/^(color|background|background-color|fill|stroke|caret-color|accent-color)$/",
				"/^text-decoration-color$/",
				"/^column-rule(-(color|width))?$/",
				// Physical and logical sides, such as border-top-color and
				// border-inline-start-width.
				"/^(border|outline)(-(top|right|bottom|left|inline|block)(-(start|end))?)?-(color|width)$/",
				// Shorthands are checked word by word. The plugin's own expansion
				// misreads values in another order, such as solid 2px.
				"/^(border|outline)(-(top|right|bottom|left|inline|block)(-(start|end))?)?$/",
				"/^border(-[a-z]+)*-radius$/",
				"font-size",
				"line-height",
				"font-weight",
			],
			{
				ignoreValues: [
					"0",
					"none",
					"inherit",
					"transparent",
					// CSS keywords ignore case; the spec spells it currentcolor.
					"/^currentcolor$/i",
					// Border styles, in shorthands such as border and border-inline.
					"/^(hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/",
				],
				disableFix: true,
			},
		],
	},
};
