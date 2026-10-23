import { useCallback, useEffect, useState } from "react";

const readHash = () => window.location.hash.slice(1) || null;

/** Keeps the selected drawing ID in the URL hash so reloads and links reopen it. */
export function useHashId(): [string | null, (id: string | null) => void] {
	const [id, setId] = useState(readHash);

	useEffect(() => {
		const onHashChange = () => setId(readHash());
		window.addEventListener("hashchange", onHashChange);
		return () => window.removeEventListener("hashchange", onHashChange);
	}, []);

	const select = useCallback((next: string | null) => {
		window.location.hash = next ?? "";
	}, []);

	return [id, select];
}
