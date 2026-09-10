"use strict";

// Chiave pubblica VAPID: NON è un segreto, serve al browser per legare la
// subscription a questa coppia di chiavi (RFC 8292). La chiave privata vive
// solo come GitHub Secret VAPID_PRIVATE_KEY, mai in questo repo.
//
// Generata una tantum con `python scripts/genera_vapid_keys.py` -- vedi
// DEVELOPMENT.md per la procedura completa di attivazione delle notifiche.
const VAPID_PUBLIC_KEY = "BPj6DrRFUAcOJwHUZuT0fRIRMFn3E-Z_7y2N8e6nXel5Et4l6CogZ0OQ9rX4YGAPVfX2R9NnRwg8NMEAc9i1AEo";
