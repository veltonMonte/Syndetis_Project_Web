import { json, request } from './api'
import { LEGAL_VERSIONS } from './legal-versions'

/** What the signed-in account accepted, as the auth-service reports it. */
export interface LegalStatus {
  termsVersion: string
  privacyVersion: string
  acceptedTermsVersion: string | null
  acceptedPrivacyVersion: string | null
  acceptedAt: string | null
  pending: boolean
}

export function fetchLegalStatus(): Promise<LegalStatus> {
  return request<LegalStatus>('/api/auth/me/legal', {})
}

/** Records that the signed-in merchant accepted the texts in force. */
export function acceptLegalTerms(): Promise<LegalStatus> {
  return request<LegalStatus>('/api/auth/me/legal', { method: 'POST', body: json(LEGAL_VERSIONS) })
}

/**
 * A merchant who ticks the box on the signup page and then picks Google or GitHub leaves the site before an
 * account exists. The versions they accepted wait here, in this tab only, and are recorded when they come back.
 */
const INTENT_KEY = 'syndetis-legal-intent-v1'

export function rememberLegalIntent() {
  try { sessionStorage.setItem(INTENT_KEY, json(LEGAL_VERSIONS)) } catch { /* the in-app screen asks again */ }
}

/** Whether this tab holds an acceptance of the versions in force, from the signup page. */
export function hasLegalIntent(): boolean {
  try { return sessionStorage.getItem(INTENT_KEY) === json(LEGAL_VERSIONS) } catch { return false }
}

/** Forgets it, once it is recorded (or once it no longer applies). */
export function clearLegalIntent() {
  try { sessionStorage.removeItem(INTENT_KEY) } catch { /* nothing kept */ }
}
