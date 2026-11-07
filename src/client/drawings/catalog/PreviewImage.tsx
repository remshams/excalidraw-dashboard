import { useState } from "react";
import type { DrawingSummary } from "../../../shared/drawings.ts";
import { previewUrl } from "../api.ts";
import styles from "./PreviewImage.module.css";

/**
 * The drawing's preview, for a sheet to place. It shows nothing while the drawing
 * has no preview, and when the preview fails to load.
 */
export function PreviewImage({ drawing }: { drawing: DrawingSummary }) {
	const url = previewUrl(drawing);
	const [failedUrl, setFailedUrl] = useState<string | null>(null);

	if (!url || url === failedUrl) return null;
	return (
		<img
			className={styles.image}
			src={url}
			alt=""
			loading="lazy"
			onError={() => setFailedUrl(url)}
		/>
	);
}
