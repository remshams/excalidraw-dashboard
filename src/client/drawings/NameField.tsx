import { useRef, useState } from "react";

type NameFieldProps = {
	label: string;
	initialName?: string;
	onSubmit: (name: string) => void;
	onCancel: () => void;
};

/** Edits a drawing name in place. Enter or leaving the field submits, Escape cancels. */
export function NameField({
	label,
	initialName = "",
	onSubmit,
	onCancel,
}: NameFieldProps) {
	const [name, setName] = useState(initialName);
	// Submitting or cancelling unmounts the field, which can fire one more blur.
	const done = useRef(false);

	const finish = (submit: boolean) => {
		if (done.current) return;
		done.current = true;
		const trimmed = name.trim();
		if (submit && trimmed && trimmed !== initialName) onSubmit(trimmed);
		else onCancel();
	};

	return (
		<form
			className="name-field"
			onSubmit={(event) => {
				event.preventDefault();
				finish(true);
			}}
		>
			<input
				aria-label={label}
				value={name}
				// biome-ignore lint/a11y/noAutofocus: the field opens in response to the user's click.
				autoFocus
				onChange={(event) => setName(event.target.value)}
				onBlur={() => finish(true)}
				onKeyDown={(event) => {
					if (event.key === "Escape") finish(false);
				}}
			/>
		</form>
	);
}
