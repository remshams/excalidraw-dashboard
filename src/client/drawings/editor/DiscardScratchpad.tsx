import { useState } from "react";
import { DeleteConfirmation } from "../catalog/DeleteConfirmation.tsx";

type DiscardScratchpadProps = {
	/** The class of the bar's buttons. */
	className: string;
	onDiscard: () => void;
};

/** The editor bar's Discard for an open scratchpad, which asks first. */
export function DiscardScratchpad({
	className,
	onDiscard,
}: DiscardScratchpadProps) {
	const [asking, setAsking] = useState(false);
	// Keep and Escape give the focus back to Discard.
	const [refocus, setRefocus] = useState(false);

	return asking ? (
		<DeleteConfirmation
			question="Discard this scratchpad?"
			action="Discard"
			inline
			onConfirm={onDiscard}
			onCancel={() => {
				setAsking(false);
				setRefocus(true);
			}}
		/>
	) : (
		<button
			type="button"
			className={className}
			// biome-ignore lint/a11y/noAutofocus: the focus comes back from the question the user just cancelled.
			autoFocus={refocus}
			onClick={() => setAsking(true)}
		>
			Discard
		</button>
	);
}
