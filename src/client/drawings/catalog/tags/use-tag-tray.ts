import { useState } from "react";
import type { Tag } from "../../../../shared/tags.ts";
import { useModalDialog } from "../use-modal-dialog.ts";
import { findTags } from "./find-tags.ts";

/** The state of an open tag tray: its modal dialog, the find text and the tags it finds. */
export function useTagTray(tags: Tag[]) {
	const dialog = useModalDialog();
	const [find, setFind] = useState("");

	return { dialog, find, setFind, shown: findTags(tags, find) };
}
