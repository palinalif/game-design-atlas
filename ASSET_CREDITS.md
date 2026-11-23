# Asset credits

## Redistributed images

- **Wood Table Worn** by Dimitrios Savva (photography) and Rico Cilliers (processing), [Poly Haven](https://polyhaven.com/a/wood_table_worn). The diffuse map is released under [CC0 1.0](https://polyhaven.com/license), which permits public web use, derivatives and redistribution without required attribution. The 1K JPG diffuse map was resized to 768 × 768 and encoded as WebP. The room applies its own color, repeat and grain orientation in Three.js. The shipped derivative is `assets/shelf-wood.webp` (63,126 bytes).

- **Concrete Block Wall** by Charlotte Baglioni, [Poly Haven](https://polyhaven.com/a/concrete_block_wall). The diffuse map uses the [CC0 1.0 license](https://polyhaven.com/license). The 1K JPG was converted to a 768 × 768 grayscale, contrast-adjusted WebP. PLAYABLE tiles it under the green paint and room lighting. The derivative is `assets/shelf-masonry.webp` (199,116 bytes). The matching 1K displacement JPG was resized to 768 × 768 and encoded as a 24,170-byte WebP. It is sampled as height data for real-time bump shading at `assets/shelf-masonry-height.webp`.

- **Sunset from the Forest of Fontainebleau** (1848), Théodore Rousseau, [National Gallery of Art](https://www.nga.gov/artworks/127430-sunset-forest-fontainebleau), Gift of Helen Porter and James T. Dyke, accession 2003.70.1. The museum marks its image as public domain. The museum image was resized to 512 px wide and encoded as WebP. The derivative is `assets/shelf-landscape.webp` (55,874 bytes).

## Models and illustrations

The cabinet, room, television, controller, lamp, window glazing, airborne dust, rug, generic package sleeves and title spines were authored for PLAYABLE and generated locally in Three.js or Canvas. Case spines use stylized titles and backs use plain material. Front artwork loads at runtime from the catalog’s existing IGDB and Libretro URLs, with a local title card as fallback.

The original direction for the basement combines a painted block foundation, a high window, a low ceiling and exposed conduit with warm wood, a shaded table lamp and used media. The Strong's [retail display archive](https://www.museumofplay.org/blog/video-games-and-the-wonders-of-window-shopping/) was a visual reference for the mixture of retail boxes and period accessories. The repository contains the CC0 wood and concrete derivatives, the public-domain painting, and the instructions for generating PLAYABLE’s original props and materials.

## Packaging sources and approximations

Dimensions use meters and describe representative packages. Individual printings can vary. The default region is North America when the catalog platform has a representative retail release there. Per-title overrides can change type, edition, region and dimensions.

| Format | Reference and modeling boundary |
| --- | --- |
| Game Boy, GBC and GBA cardboard | Approximate square North American dimensions from [EVORETRO's fitted protector specifications](https://evoretro.ca/blogs/news/in-the-spotlight-video-game-protectors). Rhythm Tengoku uses a wider Japanese box based on the [Japanese Media Arts Database release record](https://mediaarts-db.artmuseums.go.jp/id/M721926) and [original Japanese packaging scan proportions](https://www.mobygames.com/game/23687/rhythm-tengoku/covers/). |
| NES, SNES and N64 cardboard | Rounded below fitted protector sizes from [SilentModding](https://www.silentmodding.com/en/games-more/displays-stands/cleanbox-acryl-schutzboxen.html) and [XYAB](https://xyab.com/products/10-pack-n64-snes-game-box-protector/). |
| PS1 jewel, PS2, GameCube and Wii keep cases | [Optical media manufacturing specifications](https://www.sec.gov/Archives/edgar/data/1309916/000104746905001309/a2150213zex-10_31.htm) provide the standard outer dimensions. Multi-disc jewel cases have thicker case overrides. |
| DOS and Windows boxes | Approximate period dimensions. [Dune II](https://www.mobygames.com/game/241/dune-ii-the-building-of-a-dynasty/covers/) and [RollerCoaster Tycoon](https://www.mobygames.com/game/288/rollercoaster-tycoon/cover/group-4236/cover-364/) are examples. Portal uses a keep case to represent the [later standalone retail edition](https://www.gamespot.com/articles/pc-orange-box-busted-open-at-retail/1100-6187761/). |
| Digital catalog entries | PLAYABLE uses a collection reference card where the catalog platform has no modeled retail release. |
