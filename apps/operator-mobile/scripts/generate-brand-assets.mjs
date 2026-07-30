import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const projectDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const assetsDirectory = join(projectDirectory, "assets");

const outputs = [
    ["novaflair-icon.svg", "icon.png", 1024],
    ["novaflair-icon.svg", "favicon.png", 48],
    ["novaflair-mark.svg", "android-icon-foreground.png", 512],
    ["novaflair-background.svg", "android-icon-background.png", 512],
    ["novaflair-monochrome.svg", "android-icon-monochrome.png", 432],
    ["novaflair-mark.svg", "splash-icon.png", 1024],
];

await Promise.all(
    outputs.map(([source, target, size]) =>
        sharp(join(assetsDirectory, source), { density: 288 })
            .resize(size, size, { fit: "contain" })
            .png({ compressionLevel: 9 })
            .toFile(join(assetsDirectory, target)),
    ),
);
