export const EMPLOYEE_BARCODE_PREFIXES = ['2333'] as const

export function normalizeEmployeeBarcode(rawValue: string) {
  const trimmedValue = rawValue.trim()
  const payload = trimmedValue.toUpperCase().startsWith('EMP:')
    ? trimmedValue.slice(4)
    : trimmedValue

  return payload.replace(/\D/g, '')
}

export function isValidEmployeeBarcode(value: string) {
  return (
    value.length === 13 &&
    EMPLOYEE_BARCODE_PREFIXES.some((prefix) => value.startsWith(prefix))
  )
}
