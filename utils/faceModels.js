// utils/faceModels.js — singleton face model loader (shared across components)
// Models load once per browser session; subsequent opens are instant.

const MODEL_URL =
  "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";

let _faceapi  = null;
let _loaded   = false;
let _promise  = null;

export function isFaceReady() { return _loaded; }
export function getFaceApi()  { return _faceapi; }

/**
 * Loads all three face-api.js models exactly once per session.
 * Safe to call concurrently — only one actual load runs.
 * @param {(pct: number) => void} [onProgress]  called with 0–100
 */
export async function preloadFaceModels(onProgress) {
  if (typeof window === "undefined") return null; // SSR guard
  if (_loaded)  { onProgress?.(100); return _faceapi; }
  if (_promise) { await _promise; onProgress?.(100); return _faceapi; }

  _promise = (async () => {
    onProgress?.(5);
    _faceapi = await import("face-api.js");
    onProgress?.(20);
    await _faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    onProgress?.(55);
    await _faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    onProgress?.(82);
    await _faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    onProgress?.(100);
    _loaded = true;
    return _faceapi;
  })().catch(e => {
    _promise = null; // allow retry on failure
    throw e;
  });

  return _promise;
}
