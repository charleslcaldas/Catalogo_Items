#!/usr/bin/env bash
set -euo pipefail

readonly POCKETBASE_VERSION='0.39.0'
readonly ARCHIVE_NAME="pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip"
readonly ARCHIVE_SHA256='142c891586650ed0009d5c600d3de2e7adb33f63f214fa94816deb9b4d33e029'
readonly BINARY_SHA256='5c1c37cc4b4534b928c8e92724ed9a848ff4821c3916e3b45077e40f83bd1757'
readonly DOWNLOAD_URL="https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/${ARCHIVE_NAME}"

if [[ "$(uname -s)" != 'Linux' || "$(uname -m)" != 'x86_64' ]]; then
  printf 'Unsupported platform: %s/%s\n' "$(uname -s)" "$(uname -m)" >&2
  exit 1
fi

install_dir="${1:-${RUNNER_TEMP:-${TMPDIR:-/tmp}}/pocketbase-v${POCKETBASE_VERSION}/bin}"
install_path="${install_dir}/pocketbase"
tmp_dir="$(mktemp -d)"
trap 'rm -rf -- "${tmp_dir}"' EXIT

archive_path="${tmp_dir}/${ARCHIVE_NAME}"
curl \
  --proto '=https' \
  --tlsv1.2 \
  --fail \
  --location \
  --silent \
  --show-error \
  --connect-timeout 10 \
  --max-time 120 \
  --retry 3 \
  --retry-all-errors \
  --output "${archive_path}" \
  "${DOWNLOAD_URL}"

printf '%s  %s\n' "${ARCHIVE_SHA256}" "${archive_path}" | sha256sum --check --status
unzip -q "${archive_path}" pocketbase -d "${tmp_dir}"
printf '%s  %s\n' "${BINARY_SHA256}" "${tmp_dir}/pocketbase" | sha256sum --check --status

version_output="$("${tmp_dir}/pocketbase" --version)"
if [[ "${version_output}" != "pocketbase version ${POCKETBASE_VERSION}" ]]; then
  printf 'Unexpected PocketBase version output: %s\n' "${version_output}" >&2
  exit 1
fi

mkdir -p "${install_dir}"
install -m 0755 "${tmp_dir}/pocketbase" "${install_path}"

printf '%s\n' "${install_path}"
