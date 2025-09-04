export function isNotEmptyString(str: unknown): str is string {
  return str != null && typeof str === 'string' && str !== '';
}
