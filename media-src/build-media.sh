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
# ~11 MB of JPEG and MP4 that no visitor should ever download. Only the
# derived web assets belong in public/media/.
set -euo pipefail
cd "$(dirname "$0")"
OUT="../public/media"
mkdir -p "$OUT"

# ── Stills ────────────────────────────────────────────────────────────────
IMG_HERO="Human_watching_dissolving_glowin…_2K_202608282222.jpeg"  # hero scene
IMG_PARSE="Indigo_field_with_light_grid_202608282057.jpeg"          # parse plate
IMG_INK="Macro_of_printed_ink_on_202608282057.jpeg"                 # resolution band
IMG_STACK="Single_sheet_protruding_from_pap…_202608282211.jpeg"     # verdict
IMG_EMPTY="Blank_paper_resting_on_surface_202608282057.jpeg"        # dashboard empty
IMG_OG="Corner_of_white_paper_lifting_202608282057.jpeg"            # share card

# ── Video ─────────────────────────────────────────────────────────────────
VID_PARSE="Camera_descending_through_indigo…_202608282216.mp4"      # parse descent
VID_STACK="Daylight_drifting_across_paper_l…_202608282217.mp4"      # verdict stack
VID_CINE="hero-cinematic-src.mp4"                                   # hero background

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
    say "${out}.webp + .avif"
  else
    rm -f "$OUT/${out}.avif"
    say "${out}.webp  (no AVIF encoder in this ffmpeg build)"
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

  # The poster is pulled from the video itself, not from a separate still, so
  # the frame a reduced-motion visitor sees is genuinely the same scene the
  # video would have played. A mismatched poster visibly jumps on load.
  ffmpeg -v error -y -i "$src" -vf "${chain}" -vframes 1 -q:v 3 "$OUT/${out}-poster.webp"
  say "${out}.mp4 + .webm + -poster.webp"
}

echo "Stills:"
emit_still "$IMG_PARSE" "$STILL_CROP"          2000 "parse-atmosphere" 82
# The ink source rendered as a framed museum plate with a baked-in caption.
# Crop to the interior: the ink-to-halftone-to-fibre transition is the asset.
emit_still "$IMG_INK"   "crop=2600:1290:88:82" 1800 "ink-dissolve"     84
emit_still "$IMG_STACK" "$STILL_CROP"          2000 "the-stack"        82
emit_still "$IMG_EMPTY" "$STILL_CROP"          1400 "empty-page"       80
# OG plates are fixed at 1200x630 and get letterboxed by every scraper that
# disagrees, so force the ratio rather than preserving the source's.
emit_still "$IMG_OG" "${STILL_CROP},crop=2572:1346:0:35" 1200 "og-plate" 88

echo "Video:"
emit_video "$VID_PARSE" ""                                 "parse-lattice"
# The stack loop came back distinctly golden; the verdict section sits on the
# neutral #f6f5f4 ground, so pull the saturation back or it reads as sepia.
emit_video "$VID_STACK" ",eq=saturation=0.45:gamma=1.03"   "the-stack-loop"

# The hero background. Unlike the others this is not a generator plate and does
# not ping-pong — it already loops, and reversing a camera move would read as a
# rewind. 1924x1076 / 14.1MB in, 1600px / ~800KB out. Audio stripped: autoplay
# only works muted, so the track is bytes nobody can ever hear.
ffmpeg -v error -y -i "$VID_CINE" -an -vf "scale=1600:-2:flags=lanczos"   -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 30 -preset slow   -movflags +faststart "$OUT/hero-cinematic.mp4"
ffmpeg -v error -y -i "$VID_CINE" -an -vf "scale=1600:-2:flags=lanczos"   -c:v libvpx-vp9 -crf 38 -b:v 0 -row-mt 1 -deadline good "$OUT/hero-cinematic.webm"
ffmpeg -v error -y -ss 1 -i "$VID_CINE" -vf "scale=1600:-2" -vframes 1 -q:v 4   "$OUT/hero-cinematic-poster.webp"
say "hero-cinematic.mp4 + .webm + -poster.webp"

# hero-paper and hero-light-sweep are deliberately no longer produced: the hero
# now uses hero-scene, and shipping their replacements would be dead weight.
rm -f "$OUT/hero-paper.webp" "$OUT/hero-paper.avif" \
      "$OUT/hero-light-sweep.mp4" "$OUT/hero-light-sweep.webm" \
      "$OUT/hero-light-sweep-poster.webp"

echo
echo "Output ($OUT):"
ls -la "$OUT" | awk 'NR>3 {printf "  %8s  %s\n", $5, $9}'
echo
printf "  shipped total: %s\n" "$(du -sh "$OUT" | cut -f1)"
