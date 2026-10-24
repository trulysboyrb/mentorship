import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  DEVICE_COOKIE,
  DEVICE_COOKIE_MAX_AGE,
  isValidDeviceToken,
} from "@/lib/deviceCookie";

const PROTECTED = ["/dashboard", "/admin", "/pending", "/profile", "/tools", "/device-limit", "/pay"];
const AUTH_PAGES = ["/login", "/signup"];

export async function updateSession(request: NextRequest) {
  // Every browser gets a random device ID the first time it visits. It is used for the
  // "maximum devices per account" rule. The cookie is HttpOnly, so page scripts cannot read it.
  let deviceToken = request.cookies.get(DEVICE_COOKIE)?.value;
  let isNewDevice = false;
  if (!isValidDeviceToken(deviceToken)) {
    deviceToken = crypto.randomUUID();
    isNewDevice = true;
    request.cookies.set(DEVICE_COOKIE, deviceToken);
  }

  const withDevice = (res: NextResponse) => {
    if (isNewDevice) {
      res.cookies.set(DEVICE_COOKIE, deviceToken as string, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: DEVICE_COOKIE_MAX_AGE,
      });
    }
    return res;
  };

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && PROTECTED.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return withDevice(NextResponse.redirect(url));
  }

  if (user && AUTH_PAGES.includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return withDevice(NextResponse.redirect(url));
  }

  return withDevice(response);
}
