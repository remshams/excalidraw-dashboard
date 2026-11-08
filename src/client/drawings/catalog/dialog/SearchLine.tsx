import type { ComponentProps } from "react";
import { SearchIcon } from "../icons.tsx";
import styles from "./SearchLine.module.css";

type SearchLineProps = Omit<ComponentProps<"input">, "className"> & {
	/** Places the line in its dialog. */
	lineClassName: string;
};

/** The search field at the top of a modal dialog, written on a notebook line. */
export function SearchLine({ lineClassName, ...input }: SearchLineProps) {
	return (
		<div className={`${styles.line} ${lineClassName}`}>
			<SearchIcon />
			<input className={styles.search} {...input} />
		</div>
	);
}
