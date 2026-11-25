import { useState } from "react";
import { DeleteConfirmation } from "../catalog/DeleteConfirmation.tsx";

type DiscardScratchpadProps = {
	/** The class of the bar's buttons. */
	className?: string;
	onDiscard: () => void;
};

/** The editor bar's Discard for an open scratchpad, which asks first. */
export function DiscardScratchpad({
	className,
	onDiscard,
}: DiscardScratchpadProps) {
	const [asking, setAsking] = useState(false);

	return asking ? (
		<DeleteConfirmation
			question="Discard this scratchpad?"
			action="Discard"
			inline
			onConfirm={onDiscard}
			onCancel={() => setAsking(false)}
		/>
	) : (
		<button type="button" className={className} onClick={() => setAsking(true)}>
			Discard
		</button>
	);
}
