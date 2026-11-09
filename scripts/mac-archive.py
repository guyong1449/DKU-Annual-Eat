"""Standard-library archive helpers; never execute the downloaded Mac runtime."""
import hashlib
import json
from pathlib import Path
import shutil
import struct
import sys
import tarfile
import zipfile


def extract(archive, node_name, product, arch):
    runtime = Path(product) / "runtime"
    runtime.mkdir()
    with tarfile.open(archive, "r:gz") as source:
        for origin, destination in [("bin/node", "node"), ("LICENSE", "LICENSE")]:
            member = source.getmember(f"{node_name}/{origin}")
            if not member.isfile():
                raise ValueError("Expected a regular runtime file")
            with source.extractfile(member) as stream, (runtime / destination).open("wb") as output:
                shutil.copyfileobj(stream, output)
    with (runtime / "node").open("rb") as binary:
        magic, cpu = struct.unpack("<II", binary.read(8))
    if magic != 0xFEEDFACF or cpu != {"arm64": 0x0100000C, "x64": 0x01000007}[arch]:
        raise ValueError("Runtime is not the expected macOS architecture")
    (runtime / "architecture").write_text(arch + "\n", encoding="utf-8")


def pack(product, output):
    product = Path(product)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for source in sorted(product.rglob("*")):
            if source.is_symlink():
                raise ValueError("Do not package symbolic links")
            if not source.is_file():
                continue
            relative = source.relative_to(product).as_posix()
            entry = zipfile.ZipInfo(f"DKU-Annual-Eat/{relative}")
            entry.create_system = 3  # Unix: preserve executable modes when Finder unzips.
            mode = 0o100755 if relative in ("启动.command", "runtime/node") else 0o100644
            entry.external_attr = mode << 16
            entry.compress_type = zipfile.ZIP_DEFLATED
            with source.open("rb") as stream, archive.open(entry, "w") as target:
                shutil.copyfileobj(stream, target)


def verify(filename):
    with zipfile.ZipFile(filename) as archive:
        manifest = json.loads(archive.read("DKU-Annual-Eat/release-manifest.json"))
        if manifest["platform"] != "darwin":
            raise ValueError("Not a macOS package")
        expected = {"DKU-Annual-Eat/" + item["file"]: item["sha256"] for item in manifest["files"]}
        expected_names = set(expected) | {"DKU-Annual-Eat/release-manifest.json"}
        if set(archive.namelist()) != expected_names or len(archive.namelist()) != len(expected_names):
            raise ValueError("Unexpected or duplicate package files")
        for entry in archive.infolist():
            parts = Path(entry.filename).parts
            if "private" in parts or ".git" in parts or ".." in parts:
                raise ValueError("Private or unsafe file in package")
            data = archive.read(entry)
            if entry.filename in expected and hashlib.sha256(data).hexdigest() != expected[entry.filename]:
                raise ValueError("File checksum mismatch: " + entry.filename)
        for relative in ("启动.command", "runtime/node"):
            entry = archive.getinfo("DKU-Annual-Eat/" + relative)
            if entry.create_system != 3 or entry.external_attr >> 16 != 0o100755:
                raise ValueError("Missing Unix executable mode")
        launcher = archive.read("DKU-Annual-Eat/启动.command")
        if not launcher.startswith(b"#!/bin/bash\n") or b"\r" in launcher:
            raise ValueError("Invalid launcher encoding or line endings")
        magic, cpu = struct.unpack("<II", archive.read("DKU-Annual-Eat/runtime/node")[:8])
        if magic != 0xFEEDFACF or cpu != {"arm64": 0x0100000C, "x64": 0x01000007}[manifest["arch"]]:
            raise ValueError("Wrong runtime architecture")
        print(json.dumps({"arch": manifest["arch"], "verifiedFiles": len(expected), "executableModes": "0755"}))


if __name__ == "__main__":
    {"extract": extract, "pack": pack, "verify": verify}[sys.argv[1]](*sys.argv[2:])
