import { type FormEvent, useRef, useState } from "react";
import {
	labelTakenMessage,
	type Tag,
	type TagColor,
	type TagRequest,
	tagLabelKey,
	tagLabelMessage,
	tagLabelProblem,
} from "#shared/tags.ts";
import { ApiError } from "../../../api.ts";

export type TagFormProps = {
	/** The tag to change, or none to create one. */
	tag?: Tag;
	initialLabel?: string;
	/** Every tag, to tell a label that is taken without asking the server. */
	tags: Tag[];
	/** How many drawings carry the tag to change. */
	drawingCount: number;
	onSave: (request: TagRequest) => Promise<void>;
	onDelete: (tag: Tag) => Promise<void>;
	onCancel: () => void;
	/** The server no longer knows the tag to change. */
	onGone: () => void;
};

/** What is wrong with a label before asking the server, or null. */
function labelMessage(label: string, tags: Tag[], tag?: Tag) {
	const problem = tagLabelProblem(label);
	if (problem) return tagLabelMessage(problem);
	const taken = tags.some(
		({ id, label: other }) =>
			id !== tag?.id && tagLabelKey(other) === tagLabelKey(label),
	);
	return taken ? labelTakenMessage(label.trim()) : null;
}

/** Whether the server refused the label, with a reason the form can show. */
const isRefusal = (cause: unknown): cause is ApiError =>
	cause instanceof ApiError && (cause.status === 400 || cause.status === 409);

/** The state of a tag form: its fields, why a label is refused and the delete question. */
export function useTagForm({
	tag,
	initialLabel = "",
	tags,
	onSave,
	onDelete,
	onGone,
}: TagFormProps) {
	const [label, changeLabel] = useState(tag?.label ?? initialLabel);
	const [color, setColor] = useState<TagColor>(tag?.color ?? "blue");
	const [error, setError] = useState<string | null>(null);
	const [confirming, answerQuestion] = useState(false);
	const input = useRef<HTMLInputElement>(null);
	// A second click while the first is on its way would get a refusal of its own.
	const sending = useRef(false);

	const setLabel = (text: string) => {
		changeLabel(text);
		setError(null);
	};

	/** Opens or leaves the delete question, whose answer an old message isn't about. */
	const setConfirming = (asking: boolean) => {
		answerQuestion(asking);
		setError(null);
	};

	const refuse = (message: string) => {
		setError(message);
		input.current?.focus();
	};

	const send = async (change: () => Promise<void>) => {
		if (sending.current) return;
		sending.current = true;
		try {
			await change();
		} catch (cause) {
			if (isRefusal(cause)) refuse(cause.text);
			else if (cause instanceof ApiError && cause.status === 404) onGone();
			else refuse("The change failed. Try again.");
		} finally {
			sending.current = false;
		}
	};

	const submit = (event: FormEvent) => {
		event.preventDefault();
		const message = labelMessage(label, tags, tag);
		if (message) refuse(message);
		else send(() => onSave({ label: label.trim(), color }));
	};

	return {
		label,
		setLabel,
		color,
		setColor,
		error,
		input,
		confirming,
		setConfirming,
		submit,
		deleteTag: (toDelete: Tag) => send(() => onDelete(toDelete)),
	};
}
