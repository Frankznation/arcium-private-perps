/**
 * Declare browser/WebAuthn globals so dependencies (e.g. ox) type-check in Node build.
 */
declare const window: unknown;
declare const BufferSource: unknown;
declare const AuthenticatorResponse: unknown;
declare const AuthenticatorAttestationResponse: unknown;
declare const AuthenticatorAssertionResponse: unknown;
declare const AuthenticationExtensionsClientOutputs: unknown;
