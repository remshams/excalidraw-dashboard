import { PlusIcon } from "../icons.tsx";
import styles from "./NewTagButton.module.css";

type NewTagButtonProps = {
	/** The label no tag has yet, to offer creating a tag with it; or empty. */
	label: string;
	onClick: () => void;
};

/** Opens the form for a new tag, named after the label it starts with, if any. */
export function NewTagButton({ label, onClick }: NewTagButtonProps) {
	return (
		<button type="button" className={styles.button} onClick={onClick}>
			<PlusIcon />
			{label ? `Create “${label}”` : "New tag"}
		</button>
	);
}
