"use strict";

// Chiave pubblica VAPID: NON è un segreto, serve al browser per legare la
// subscription a questa coppia di chiavi (RFC 8292). La chiave privata vive
// solo come GitHub Secret VAPID_PRIVATE_KEY, mai in questo repo.
//
// Generata una tantum con `python scripts/genera_vapid_keys.py` -- vedi
// DEVELOPMENT.md per la procedura completa di attivazione delle notifiche.
const VAPID_PUBLIC_KEY = "BKPYEo1Jdmh4OFWj_9VAjU7bkFCtQY7GQHmSoAalclR52QL0U57HEkTJJraR1WbgrNkDosWbDjAYxMW6wCiS8DM";
