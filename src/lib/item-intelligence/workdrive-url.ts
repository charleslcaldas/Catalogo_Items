export const WORKDRIVE_DOMAINS = new Set([
  'workdrive.zoho.com',
  'workdrive.zoho.eu',
  'workdrive.zoho.in',
  'workdrive.zoho.com.au',
  'workdrive.zoho.jp',
  'workdrive.zoho.ca',
  'workdrive.zoho.sa',
  'workdrive.zohoexternal.com',
  'workdrive.zohoexternal.eu',
  'workdrive.zohoexternal.in',
  'workdrive.zohoexternal.com.au',
  'workdrive.zohoexternal.jp',
  'workdrive.zohoexternal.ca',
  'workdrive.zohoexternal.sa',
])

export function isValidWorkDriveUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && WORKDRIVE_DOMAINS.has(url.hostname.toLowerCase())
  } catch {
    return false
  }
}
