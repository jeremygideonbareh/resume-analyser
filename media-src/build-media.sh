#!/usr/bin/env bash
# Normalises the generated Flow / Nano Banana Pro assets into web deliverables.
#
# Every source is 2752x1536 (stills) or 1280x720 (video), and each carries a
# generator watermark in the bottom-right that has to come off before the asset
# can sit behind text. Re-runnable: it always rebuilds from the *_SRC originals,
# so it never compounds crops or re-compresses its own output.
#
# Sources live here in media-src/ and are deliberately NOT under public/ —
# anything in public/ is copied verbatim into dist/, and the originals are
# ~5.6 MB of JPEG and MP4 that no visitor should ever download. Only the
# derived web assets belong in public/media/.
set -euo pipefail
cd "$(dirname "$0")"
OUT="../public/media"
mkdir -p "$OUT"

IMG_SRC_1="Paper_sheet_with_single_crease_202608282057.jpeg"      # hero ground
IMG_SRC_2="Indigo_field_with_light_grid_202608282057.jpeg"        # parse band
IMG_SRC_3="Macro_of_printed_ink_on_202608282057.jpeg"             # ink dissolve
IMG_SRC_4="Blank_paper_resting_on_surface_202608282057.jpeg"      # empty state
IMG_SRC_5="Corner_of_white_paper_lifting_202608282057.jpeg"       # og plate
VID_SRC_1="Daylight_traveling_across_paper_202608282059.mp4"      # light sweep
VID_SRC_2="Lattice_forming_in_indigo_clouds…_202608282059.mp4"    # cloud drift

# Stills: 2752x1536 -> drop 180px right / 120px bottom to clear the sparkle.
STILL_CROP="crop=2572:1416:0:0"
# Video: 1280x720 -> drop 120px right / 70px bottom to clear the "Veo" mark,
# then square the frame back up to a standard 16:9 size.
VID_CROP="crop=1160:650:0:0,scale=1280:720:flags=lanczos"

say() { printf '  %s\n' "$1"; }

emit_still() {   # src, filter, width, basename, quality
  local src="$1" filt="$2" w="$3" out="$4" q="$5"
  ffmpeg -v error -y -i "$src" -vf "${filt},scale=${w}:-2:flags=lanczos" \
    -q:v "$q" "$OUT/${out}.webp"
  # AVIF roughly halves WebP at equal quality, but the encoder is not present
  # in every ffmpeg build — treat it as a bonus, never a requirement.
  if ffmpeg -v error -y -i "$src" -vf "${filt},scale=${w}:-2:flags=lanczos" \
      -c:v libaom-av1 -still-picture 1 -crf 34 -cpu-used 6 "$OUT/${out}.avif" 2>/dev/null; then
    say "$(basename "${out}").webp + .avif"
  else
    rm -f "$OUT/${out}.avif"
    say "$(basename "${out}").webp  (no AVIF encoder in this ffmpeg build)"
  fi
}

emit_video() {   # src, extra filters, basename
  local src="$1" extra="$2" out="$3"
  # Ping-pong: play forward, then the reverse, so the join is mathematically
  # identical at both ends. The sources drift (first frame never matches last),
  # so a straight loop visibly jumps every cycle; a crossfade would soften that
  # but still ghosts. Reversal is the only guaranteed-seamless option, and for
  # slow ambient motion the direction change reads as breathing, not rewind.
  local chain="${VID_CROP}${extra}"
  ffmpeg -v error -y -i "$src" \
    -filter_complex "[0:v]${chain},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]" \
    -map "[v]" -an \
    -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 30 -preset slow \
    -movflags +faststart "$OUT/${out}.mp4"

  ffmpeg -v error -y -i "$src" \
    -filter_complex "[0:v]${chain},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]" \
    -map "[v]" -an \
    -c:v libvpx-vp9 -crf 40 -b:v 0 -row-mt 1 -deadline good "$OUT/${out}.webm"

  # The poster is not a nicety: neither loop autoplays under reduced motion, so
  # for those visitors this frame IS the design.
  ffmpeg -v error -y -i "$src" -vf "${chain}${extra:+}" -vframes 1 -q:v 3 "$OUT/${out}-poster.webp"
  say "$(basename "${out}").mp4 + .webm + -poster.webp"
}

echo "Stills:"
emit_still "$IMG_SRC_1" "$STILL_CROP"            2000 "hero-paper"        82
emit_still "$IMG_SRC_2" "$STILL_CROP"            2000 "parse-atmosphere"  82
# The ink source rendered as a framed museum plate with a baked-in caption.
# Crop to the interior: the ink-to-halftone-to-fibre transition is the asset.
emit_still "$IMG_SRC_3" "crop=2600:1290:88:82"   1800 "ink-dissolve"      84
emit_still "$IMG_SRC_4" "$STILL_CROP"            1400 "empty-page"        80
# OG plates are fixed at 1200x630 and get letterboxed by every scraper that
# disagrees, so force the ratio rather than preserving the source's.
emit_still "$IMG_SRC_5" "${STILL_CROP},crop=2572:1346:0:35" 1200 "og-plate" 88

echo "Video:"
# The light sweep came back distinctly golden; the page ground is a neutral
# #f6f5f4, so pull most of the saturation out or the hero reads cream.
emit_video "$VID_SRC_1" ",eq=saturation=0.40:gamma=1.02" "hero-light-sweep"
emit_video "$VID_SRC_2" ""                                "parse-lattice"

echo
echo "Output ($OUT):"
ls -la "$OUT" | awk 'NR>3 {printf "  %8s  %s\n", $5, $9}'
echo
printf "  shipped total: %s\n" "$(du -sh "$OUT" | cut -f1)"
