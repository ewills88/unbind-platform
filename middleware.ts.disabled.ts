// @ts-nocheck
/*
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  const allCookies = req.cookies.getAll()
  const hasAuthCookie = allCookies.some(cookie => 
    cookie.name.startsWith('sb-') && 
    (cookie.name.includes('access-token') || cookie.name.includes('refresh-token'))
  )

  const path = req.nextUrl.pathname

  if (path.startsWith('/dashboard') && !hasAuthCookie) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if ((path === '/login' || path === '/register') && hasAuthCookie) {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
}
*/