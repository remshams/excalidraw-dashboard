import type { Tag } from "./mock-tags.ts";
import { Stamp } from "./Stamp.tsx";
import styles from "./StampBanner.module.css";

type StampBannerProps = {
	tag: Tag;
	count: number;
	onPutDown: () => void;
};

/** Says that a stamp is in hand, stays in view while the page scrolls. */
export function StampBanner({ tag, count, onPutDown }: StampBannerProps) {
	return (
		<div className={styles.banner} role="group" aria-label="Stamp in hand">
			<Stamp label={tag.label} color={tag.color} seed={`hand${tag.id}`} size="large" />
			<p>
				Click a drawing to stamp it, click again to lift the stamp.{" "}
				<span className={styles.count}>
					On {count} {count === 1 ? "drawing" : "drawings"}.
				</span>
			</p>
			<button type="button" aria-keyshortcuts="Escape" onClick={onPutDown}>
				Put stamp down
				<kbd aria-hidden="true">Esc</kbd>
			</button>
		</div>
	);
}
