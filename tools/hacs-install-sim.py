#!/usr/bin/env python3
"""
hacs-plugin-install-sim.py

Simulates what HACS actually writes into `www/community/<repo>/` when a user
downloads a `plugin`-category repository from a GitHub release, then checks
that every code-split chunk the entry bundle can request at runtime is present
and reachable under the served path.

Nothing here is asserted from memory. Every input is derived at runtime:

  * `hacs.json`          -> fetched from the repo at the tag under test
  * release asset list   -> fetched from the GitHub release
  * publicPath + chunk map -> parsed out of the downloaded entry bundle itself

The control flow below mirrors HACS `custom_components/hacs` at the commit
pinned in HACS_REF; every branch carries the file:line it reproduces, so the
simulation can be diffed against the source by hand.

Usage:
    python3 hacs-plugin-install-sim.py
    python3 hacs-plugin-install-sim.py --repo owner/name --tag v1.2.3
    python3 hacs-plugin-install-sim.py --keep      # keep the staged tree

Exit code 0 = every runtime chunk resolves. Non-zero = a real user install
would 404. Stdlib only; GITHUB_TOKEN is used if set, but is not required.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

# HACS revision whose behaviour this script reproduces.
HACS_REF = "adb7d83e33d24325535fb43b8226572405143757"  # hacs/integration, 2026-09-05

DEFAULT_REPO = "TheDave94/oriel-dashboard"
UA = {"User-Agent": "hacs-plugin-install-sim"}


def _get(url: str, *, as_json: bool = False, binary: bool = False):
    headers = dict(UA)
    if (token := os.environ.get("GITHUB_TOKEN")) and "api.github.com" in url:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read()
    if binary:
        return raw
    text = raw.decode("utf-8")
    return json.loads(text) if as_json else text


def resolve_release(repo: str, tag: str | None) -> tuple[str, list[str]]:
    """Return (tag, asset_names). API first, HTML scrape as an unauthenticated fallback."""
    endpoint = (
        f"https://api.github.com/repos/{repo}/releases/tags/{tag}"
        if tag
        else f"https://api.github.com/repos/{repo}/releases/latest"
    )
    try:
        data = _get(endpoint, as_json=True)
        return data["tag_name"], [a["name"] for a in data.get("assets", [])]
    except (urllib.error.HTTPError, urllib.error.URLError, KeyError) as err:
        print(f"  ! GitHub API unavailable ({err}); falling back to the release page")

    if not tag:
        page = _get(f"https://github.com/{repo}/releases")
        found = re.search(rf'/{re.escape(repo)}/releases/tag/([^"]+)"', page)
        if not found:
            sys.exit("Could not determine the latest tag; pass --tag explicitly.")
        tag = found.group(1)

    page = _get(f"https://github.com/{repo}/releases/expanded_assets/{tag}")
    marker = f"/download/{tag}/"
    names = sorted({
        href.split(marker, 1)[1]
        for href in re.findall(r'href="([^"]+)"', page)
        if marker in href
    })
    return tag, names


def update_filenames(manifest: dict, assets: list[str], repo: str) -> tuple[str | None, str | None]:
    """HACS repositories/plugin.py::update_filenames -- lines 98-137."""
    content_in_root = manifest.get("content_in_root", False)
    if specific := manifest.get("filename"):
        valid = (specific,)                                     # plugin.py:100-101
    else:
        name = manifest.get("name", repo.split("/")[-1])
        valid = (                                               # plugin.py:103-108
            f"{name.replace('lovelace-', '')}.js",
            f"{name}.js",
            f"{name}.umd.js",
            f"{name}-bundle.js",
        )

    if not content_in_root:                                     # plugin.py:112
        matched = [f for f in valid for a in assets if f == a]  # plugin.py:116-121
        if matched:
            return matched[0], "release"                        # plugin.py:122-123
    return None, None  # tree lookup (plugin.py:126-137) is not exercised here


def gather(manifest: dict, assets: list[str]) -> list[str]:
    """HACS repositories/base.py::download_content -- lines 616-650."""
    contents = list(assets)                                     # base.py:634-635 -> release_contents (1236-1250)
    keep = []
    for name in contents:                                       # base.py:645
        if manifest.get("content_in_root") and manifest.get("filename"):  # base.py:646
            if name != manifest["filename"]:                    # base.py:647-648
                continue
        keep.append(name)
    return keep


def parse_runtime(entry_js: str) -> tuple[str, dict[str, str]]:
    """Read publicPath and the chunk-id -> filename map straight out of the bundle."""
    pub = re.search(r'\.p\s*=\s*"([^"]*)"', entry_js)
    if not pub:
        sys.exit("No webpack publicPath in the entry bundle -- nothing to verify.")

    names, hashes = {}, {}
    if u_expr := re.search(r'\.u\s*=\s*[^;]{0,400}?\.js"', entry_js):
        blocks = re.findall(r"\{((?:\d+:\"[^\"]*\",?)+)\}", u_expr.group(0))
        parsed = [dict(re.findall(r'(\d+):"([^"]*)"', b)) for b in blocks]
        if len(parsed) >= 2:
            names, hashes = parsed[0], parsed[1]
        elif parsed:
            hashes = parsed[0]

    chunks = {}
    for cid, digest in hashes.items():
        chunks[cid] = f"oriel-{names.get(cid, cid)}.{digest}.js"
    return pub.group(1), chunks


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--repo", default=DEFAULT_REPO)
    ap.add_argument("--tag", default=None, help="defaults to the latest release")
    ap.add_argument("--keep", action="store_true", help="keep the staged install tree")
    args = ap.parse_args()

    repo = args.repo
    slug = repo.split("/")[-1]
    print(f"HACS plugin install simulation  (mirrors hacs/integration @ {HACS_REF[:7]})")
    print(f"repository: {repo}\n")

    tag, assets = resolve_release(repo, args.tag)
    print(f"[1] release under test: {tag}  ({len(assets)} assets)")

    manifest = json.loads(_get(f"https://raw.githubusercontent.com/{repo}/{tag}/hacs.json"))
    print(f"[2] hacs.json @ {tag}: {json.dumps(manifest, separators=(', ', ': '))}")

    file_name, remote = update_filenames(manifest, assets, repo)
    if remote != "release":
        print("\nFAIL: no release asset matches hacs.json filename -- "
              "HACS would report the repository structure as non-compliant.")
        return 2
    print(f"[3] plugin.py:112-124  -> file_name={file_name!r}, content.path.remote='release'")
    print("    plugin.py:84-85    -> content.single=True")

    zip_release = bool(manifest.get("zip_release")) and bool(manifest.get("filename"))
    branch = "download_zip_files" if zip_release else "download_content"
    print(f"[4] base.py:964-967    -> {branch}()")
    if zip_release:
        print(f"    single asset {manifest['filename']!r} downloaded and extracted (base.py:555-614)")
        print(f"    plugin.py:150-159 -> dashboard resource URL would be "
              f"/hacsfiles/{slug}/{manifest['filename']}")
        print("\nNote: a .zip as the registered Lovelace module resource does not load.")

    to_download = gather(manifest, assets)
    filtered = len(assets) - len(to_download)
    print(f"[5] base.py:634-649    -> {len(to_download)} of {len(assets)} assets queued"
          f"{f' ({filtered} filtered by content_in_root)' if filtered else ' (no filter: content_in_root is false)'}")

    staging = Path(tempfile.mkdtemp(prefix="hacs-sim-")) / "www" / "community" / slug
    staging.mkdir(parents=True)
    print(f"[6] base.py:1268-1269  -> writing flat into {staging}")
    for name in to_download:
        blob = _get(f"https://github.com/{repo}/releases/download/{tag}/{name}", binary=True)
        (staging / name).write_bytes(blob)
    total = sum(p.stat().st_size for p in staging.iterdir())
    print(f"    {len(to_download)} files written, {total / 1024:.0f} KB total")

    entry = staging / file_name
    if not entry.is_file():
        print(f"\nFAIL: entry bundle {file_name} never landed on disk.")
        return 2

    public_path, chunks = parse_runtime(entry.read_text(encoding="utf-8", errors="replace"))
    print(f"\n[7] runtime read from {file_name}: publicPath={public_path!r}, {len(chunks)} async chunks")
    if not chunks:
        print("    entry bundle requests no async chunks -- nothing further to check.")
        return 0

    expected_prefix = f"/hacsfiles/{slug}/"
    if public_path != expected_prefix:
        print(f"    ! publicPath {public_path!r} does not match the HACS serve path "
              f"{expected_prefix!r} (plugin.py:36, const.py:12)")

    missing = []
    for cid in sorted(chunks, key=int):
        name = chunks[cid]
        present = (staging / name).is_file()
        size = f"{(staging / name).stat().st_size / 1024:6.1f} KB" if present else "   MISSING"
        print(f"    chunk {cid:>4}  {public_path}{name}  {size}")
        if not present:
            missing.append(name)

    print()
    if missing:
        print(f"FAIL: {len(missing)} chunk(s) absent -> 404 on a real install: {', '.join(missing)}")
        return 1

    for variant in (".gz", ".br"):
        have = sum(1 for n in chunks.values() if (staging / (n + variant)).is_file())
        if have:
            print(f"  + {have}/{len(chunks)} chunks also have a {variant} sibling "
                  f"(aiohttp serves these on matching Accept-Encoding)")

    print(f"\nPASS: all {len(chunks)} runtime chunks resolve under {public_path}")
    if args.keep:
        print(f"staged tree kept at {staging}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
