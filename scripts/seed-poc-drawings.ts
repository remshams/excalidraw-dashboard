/**
 * PoC only: creates the demo drawings with simple generated previews through the
 * HTTP API. Their names match the seed in `mock-tags.ts`.
 *
 * node scripts/seed-poc-drawings.ts http://localhost:3201
 */
import { deflateSync } from "node:zlib";

const NAMES = [
	"Auth flow",
	"Billing service",
	"Checkout wireframe",
	"Data model v2",
	"Deployment pipeline",
	"Design system map",
	"Garden beds 2027",
	"Home network",
	"Incident timeline",
	"Japan itinerary",
	"Kitchen remodel",
	"Learning Rust",
	"Onboarding flow",
	"Q1 roadmap",
	"Reading list map",
	"Sourdough timing",
	"Team offsite ideas",
	"Thinking in systems",
	"Untitled sketch",
	"Whiteboard",
];

const WIDTH = 400;
const HEIGHT = 300;
const STROKES: [number, number, number][] = [
	[30, 30, 30],
	[25, 113, 194],
	[224, 49, 49],
	[47, 158, 68],
	[105, 101, 219],
	[232, 89, 12],
];

const crcTable = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});

function crc32(data: Buffer): number {
	let crc = 0xffffffff;
	for (const byte of data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
	return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
	const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(body));
	return Buffer.concat([length, body, crc]);
}

function encodePng(pixels: Buffer): Buffer {
	const header = Buffer.alloc(13);
	header.writeUInt32BE(WIDTH, 0);
	header.writeUInt32BE(HEIGHT, 4);
	header.set([8, 6, 0, 0, 0], 8);
	const rows = Buffer.alloc((WIDTH * 4 + 1) * HEIGHT);
	for (let y = 0; y < HEIGHT; y++) {
		pixels.copy(
			rows,
			y * (WIDTH * 4 + 1) + 1,
			y * WIDTH * 4,
			(y + 1) * WIDTH * 4,
		);
	}
	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk("IHDR", header),
		chunk("IDAT", deflateSync(rows)),
		chunk("IEND", Buffer.alloc(0)),
	]);
}

/** A few boxes joined by lines, different per drawing, on a transparent background. */
function preview(seed: number): Buffer {
	let value = seed * 7919 + 13;
	const random = (limit: number) => {
		value = (value * 1103515245 + 12345) & 0x7fffffff;
		return value % limit;
	};
	const pixels = Buffer.alloc(WIDTH * HEIGHT * 4);
	const plot = (x: number, y: number, [r, g, b]: [number, number, number]) => {
		for (let dx = 0; dx < 3; dx++) {
			for (let dy = 0; dy < 3; dy++) {
				const px = x + dx;
				const py = y + dy;
				if (px < 0 || py < 0 || px >= WIDTH || py >= HEIGHT) continue;
				pixels.set([r, g, b, 255], (py * WIDTH + px) * 4);
			}
		}
	};
	const line = (
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		color: [number, number, number],
	) => {
		const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
		for (let i = 0; i <= steps; i++) {
			plot(
				Math.round(x0 + ((x1 - x0) * i) / steps),
				Math.round(y0 + ((y1 - y0) * i) / steps),
				color,
			);
		}
	};
	const centers: [number, number][] = [];
	const boxes = 3 + random(4);
	for (let i = 0; i < boxes; i++) {
		const w = 60 + random(70);
		const h = 36 + random(50);
		const x = 10 + random(WIDTH - w - 20);
		const y = 10 + random(HEIGHT - h - 20);
		const color = STROKES[random(STROKES.length)];
		line(x, y, x + w, y, color);
		line(x + w, y, x + w, y + h, color);
		line(x + w, y + h, x, y + h, color);
		line(x, y + h, x, y, color);
		centers.push([x + w / 2, y + h / 2]);
	}
	for (let i = 1; i < centers.length; i++) {
		line(...centers[i - 1], ...centers[i], STROKES[0]);
	}
	return encodePng(pixels);
}

const base = process.argv[2] ?? "http://localhost:3001";

for (const [index, name] of NAMES.entries()) {
	const created = await fetch(`${base}/api/drawings`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name }),
	});
	if (!created.ok) throw new Error(`Creating ${name}: ${created.status}`);
	const { id } = (await created.json()) as { id: string };
	const stored = await fetch(`${base}/api/drawings/${id}/preview`, {
		method: "PUT",
		headers: { "Content-Type": "image/png" },
		body: new Uint8Array(preview(index + 1)),
	});
	if (!stored.ok) throw new Error(`Preview of ${name}: ${stored.status}`);
}
console.log(`Seeded ${NAMES.length} drawings at ${base}`);
