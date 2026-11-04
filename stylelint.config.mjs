/**
 * Only checks that the CSS modules use the design tokens from
 * src/client/styles.css for colors, type, stroke widths and corner radii.
 * Biome lints and formats CSS otherwise. Spacing isn't checked: layout needs
 * one-off values.
 */
export default {
	plugins: ["stylelint-declaration-strict-value"],
	rules: {
		"scale-unlimited/declaration-strict-value": [
			[
				"/^color$/",
				"/^background-color$/",
				"/^(border|outline)(-(top|right|bottom|left))?-color$/",
				"/^(border|outline)(-(top|right|bottom|left))?-width$/",
				"/^border(-(top|bottom)-(left|right))?-radius$/",
				"font-size",
				"line-height",
				"font-weight",
			],
			{
				expandShorthand: true,
				ignoreValues: ["0", "none", "inherit", "transparent", "currentColor"],
				disableFix: true,
			},
		],
	},
};
