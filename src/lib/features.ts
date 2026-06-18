// Feature flags.
//
// File sharing is fully built (composer attach, Files panel, Storage upload,
// storage.rules) but Firebase Storage costs money to keep enabled. While in
// early beta we leave it OFF and show an interest-gauging stub instead.
//
// To turn it on later: enable Firebase Storage on the project, deploy
// storage.rules, then flip this to `true`. No other code changes needed.
export const FILE_UPLOAD_ENABLED = false;
