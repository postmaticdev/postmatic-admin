export const NEXT_PUBLIC_API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN || "https://api-staging.postmatic.id";
export const NEXT_PUBLIC_AUTH_ORIGIN =
  process.env.NEXT_PUBLIC_AUTH_ORIGIN || "https://auth-staging.postmatic.id";
export const NEXT_PUBLIC_ADMIN_ORIGIN = "https://admin-haystudio-staging.postmatic.id"

export const ACCESS_TOKEN_KEY = "postmaticAccessToken";
export const REFRESH_TOKEN_KEY = "postmaticRefreshToken";
// login
export const LOGIN_URL = NEXT_PUBLIC_AUTH_ORIGIN + "/login" + "?from=" + NEXT_PUBLIC_ADMIN_ORIGIN;
